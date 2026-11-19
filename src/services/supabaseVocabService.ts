import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import {
  AdminAuthState,
  Lesson,
  MigrationConflictMode,
  MigrationLessonItemResult,
  MigrationReport,
  PartRecord,
  StoryReviewItem,
  SupabaseSetupStatus,
  SupabaseTableCheckResult,
  TermMeaning,
  VocabWord,
} from '../types/vocab';
import { formatLessonCode, sortLessons } from '../utils/numbering';
import { parseStoryWordReview } from '../utils/lessonParser';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(val: string | undefined): val is string {
  return Boolean(val && UUID_REGEX.test(val));
}

function makeUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4 UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
  }
  return supabase;
}

export function formatSupabaseError(err: unknown): string {
  if (!err) return 'An unknown database error occurred.';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  const obj = err as { message?: string; details?: string; hint?: string };
  if (obj.message) {
    return obj.details ? `${obj.message} (${obj.details})` : obj.message;
  }
  return 'Database request failed.';
}

export function isMissingTableError(err: unknown): boolean {
  const msg = formatSupabaseError(err).toLowerCase();
  const code = (err as { code?: string } | null)?.code;
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache') ||
    (msg.includes('relation') && msg.includes('does not exist'))
  );
}

const REQUIRED_VOCAB_TABLES = [
  'parts',
  'lessons',
  'vocabulary_words',
  'stories',
  'story_word_reviews',
  'admin_users',
] as const;

export async function verifySupabaseDatabaseSetup(): Promise<SupabaseSetupStatus> {
  const client = getClient();
  const checks: SupabaseTableCheckResult[] = [];
  let adminTableProtected = false;

  const { data: sessionData } = await client.auth.getSession();
  const isLoggedIn = Boolean(sessionData.session?.user);

  for (const tableName of REQUIRED_VOCAB_TABLES) {
    const { error, status } =
      tableName === 'admin_users'
        ? await client.from(tableName).select('user_id').limit(1)
        : await client.from(tableName).select('*', { count: 'exact', head: true });

    if (!error) {
      checks.push({ tableName, exists: true });
      if (tableName === 'admin_users' && isLoggedIn) {
        adminTableProtected = true;
      }
      continue;
    }

    if (isMissingTableError(error)) {
      checks.push({
        tableName,
        exists: false,
        message: 'Table not found. Run supabase/migrations/001_vocabo_schema.sql in Supabase SQL Editor.',
      });
      continue;
    }

    // For admin_users when logged out or non-admin, a 42501 / 401 / 403 proves the table exists AND RLS/privileges protect it!
    const msgLower = (error.message || '').toLowerCase();
    if (
      tableName === 'admin_users' &&
      (error.code === '42501' ||
        status === 401 ||
        status === 403 ||
        msgLower.includes('permission denied'))
    ) {
      adminTableProtected = true;
      checks.push({
        tableName,
        exists: true,
        message: 'Protected (unauthenticated/non-admin read blocked).',
      });
      continue;
    }

    checks.push({
      tableName,
      exists: false,
      message: error.message || `Unexpected status ${status}`,
    });
  }

  const missingTables = checks.filter((c) => !c.exists).map((c) => c.tableName);
  const allTablesReady = missingTables.length === 0;

  return {
    checkedAt: new Date().toISOString(),
    allTablesReady,
    missingTables,
    adminTableProtected,
    tables: checks,
    summary: allTablesReady
      ? 'All 6 required Supabase tables and RLS checks passed.'
      : `Missing or uninitialized table(s): ${missingTables.join(', ')}. Run supabase/migrations/001_vocabo_schema.sql in Supabase SQL Editor.`,
  };
}

// ---------------------------------------------------------------------------
// 1. Admin Authentication & Database-Verified Admin Status
// ---------------------------------------------------------------------------

export async function verifyAdminSession(): Promise<AdminAuthState> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      configured: false,
      loading: false,
      userId: null,
      email: null,
      isAdmin: false,
      error: null,
    };
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      return {
        configured: true,
        loading: false,
        userId: null,
        email: null,
        isAdmin: false,
        error: sessionError.message,
      };
    }

    const user = sessionData.session?.user;
    if (!user) {
      return {
        configured: true,
        loading: false,
        userId: null,
        email: null,
        isAdmin: false,
        error: null,
      };
    }

    const { data: adminRow, error: adminError } = await supabase
      .from('admin_users')
      .select('user_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminError) {
      return {
        configured: true,
        loading: false,
        userId: user.id,
        email: user.email ?? null,
        isAdmin: false,
        error: adminError.message,
      };
    }

    return {
      configured: true,
      loading: false,
      userId: user.id,
      email: user.email ?? null,
      isAdmin: adminRow?.role === 'admin',
      error: null,
    };
  } catch (err) {
    return {
      configured: true,
      loading: false,
      userId: null,
      email: null,
      isAdmin: false,
      error: formatSupabaseError(err),
    };
  }
}

export async function signInAdmin(email: string, password: string): Promise<AdminAuthState> {
  const client = getClient();
  const cleanEmail = email.trim();
  if (!cleanEmail || !password) {
    throw new Error('Please enter both your Admin email and password.');
  }

  const { data, error } = await client.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    throw new Error(error.message || 'Invalid email or password.');
  }

  const user = data.user;
  if (!user) {
    throw new Error('Authentication did not return a user session.');
  }

  const { data: adminRow, error: adminError } = await client
    .from('admin_users')
    .select('user_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (adminError) {
    await client.auth.signOut();
    if (isMissingTableError(adminError)) {
      throw new Error(
        'Database table public.admin_users does not exist yet. Run supabase/migrations/001_vocabo_schema.sql in Supabase SQL Editor and insert your Admin user first.'
      );
    }
    throw new Error(`Unable to verify Admin permissions: ${adminError.message}`);
  }

  if (!adminRow || adminRow.role !== 'admin') {
    await client.auth.signOut();
    throw new Error(
      'This account is not authorized as an Admin. Add its user_id to public.admin_users in Supabase SQL Editor.'
    );
  }

  return {
    configured: true,
    loading: false,
    userId: user.id,
    email: user.email ?? cleanEmail,
    isAdmin: true,
    error: null,
  };
}

export async function signOutAdmin(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// 2. Paginated Public Reads (Supports 3,000+ Words & Future Growth)
// ---------------------------------------------------------------------------

interface DbPartRow {
  id: string;
  part_number: number;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface DbLessonRow {
  id: string;
  client_key: string | null;
  part_id: string;
  part_number: number;
  lesson_number: number;
  lesson_code: string;
  word_range_start: number;
  word_range_end: number;
  title: string;
  raw_input: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface DbWordRow {
  id: string;
  lesson_id: string;
  word: string;
  part_of_speech: string | null;
  cefr_level: string | null;
  bangla_meaning: string;
  english_example: string;
  bangla_translation: string;
  synonyms: TermMeaning[] | null;
  antonyms: TermMeaning[] | null;
  source_number: number | null;
  word_order: number;
}

interface DbStoryRow {
  id: string;
  lesson_id: string;
  story_content: string;
  bangla_summary: string;
}

interface DbReviewRow {
  id: string;
  lesson_id: string;
  review_content: string;
  review_entries: StoryReviewItem[] | null;
}

const PAGE_BATCH_SIZE = 1000;

async function fetchAllPaginated<T>(
  table: string,
  orderBy: Array<{ column: string; ascending?: boolean }>
): Promise<T[]> {
  const client = getClient();
  const rows: T[] = [];
  let from = 0;

  while (true) {
    let query = client
      .from(table)
      .select('*')
      .range(from, from + PAGE_BATCH_SIZE - 1);

    for (const ord of orderBy) {
      query = query.order(ord.column, { ascending: ord.ascending ?? true });
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed loading ${table}: ${error.message}`);
    }

    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE_BATCH_SIZE) {
      break;
    }
    from += PAGE_BATCH_SIZE;
  }

  return rows;
}

export async function fetchSharedCurriculumFromSupabase(): Promise<{
  parts: PartRecord[];
  lessons: Lesson[];
}> {
  const [partRows, lessonRows, wordRows, storyRows, reviewRows] = await Promise.all([
    fetchAllPaginated<DbPartRow>('parts', [{ column: 'part_number', ascending: true }]),
    fetchAllPaginated<DbLessonRow>('lessons', [
      { column: 'part_number', ascending: true },
      { column: 'lesson_number', ascending: true },
    ]),
    fetchAllPaginated<DbWordRow>('vocabulary_words', [
      { column: 'lesson_id', ascending: true },
      { column: 'word_order', ascending: true },
    ]),
    fetchAllPaginated<DbStoryRow>('stories', [{ column: 'lesson_id', ascending: true }]),
    fetchAllPaginated<DbReviewRow>('story_word_reviews', [
      { column: 'lesson_id', ascending: true },
    ]),
  ]);

  const partNumberById = new Map<string, number>();
  const parts: PartRecord[] = partRows.map((p) => {
    partNumberById.set(p.id, p.part_number);
    return {
      id: p.id,
      partNumber: p.part_number,
      title: p.title || `Part ${p.part_number}`,
      description: p.description || '',
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    };
  });

  const wordsByLessonId = new Map<string, VocabWord[]>();
  for (const w of wordRows) {
    const arr = wordsByLessonId.get(w.lesson_id) ?? [];
    arr.push({
      id: w.id,
      sourceNumber: w.source_number ?? undefined,
      wordOrder: w.word_order,
      word: w.word,
      partOfSpeech: w.part_of_speech ?? undefined,
      cefrLevel: w.cefr_level ?? undefined,
      banglaMeaning: w.bangla_meaning || '',
      exampleSentence: w.english_example || '',
      banglaTranslation: w.bangla_translation || '',
      synonyms: Array.isArray(w.synonyms) ? w.synonyms : [],
      antonyms: Array.isArray(w.antonyms) ? w.antonyms : [],
      isFavorite: false,
      revisionStatus: 'new',
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      difficultCount: 0,
    });
    wordsByLessonId.set(w.lesson_id, arr);
  }

  const storyByLessonId = new Map<string, DbStoryRow>();
  for (const s of storyRows) {
    storyByLessonId.set(s.lesson_id, s);
  }

  const reviewByLessonId = new Map<string, DbReviewRow>();
  for (const r of reviewRows) {
    reviewByLessonId.set(r.lesson_id, r);
  }

  const lessons: Lesson[] = lessonRows.map((l) => {
    const resolvedPartNumber = partNumberById.get(l.part_id) ?? l.part_number;
    const words = (wordsByLessonId.get(l.id) ?? []).sort(
      (a, b) => (a.wordOrder ?? 0) - (b.wordOrder ?? 0)
    );
    const storyRow = storyByLessonId.get(l.id);
    const reviewRow = reviewByLessonId.get(l.id);
    const rawReview = reviewRow?.review_content || '';
    const parsedEntries =
      Array.isArray(reviewRow?.review_entries) && reviewRow.review_entries.length > 0
        ? reviewRow.review_entries
        : rawReview
          ? parseStoryWordReview(rawReview)
          : [];

    return {
      id: l.id,
      partId: l.part_id,
      clientKey: l.client_key ?? undefined,
      partNumber: resolvedPartNumber,
      lessonIndexInPart: l.lesson_number,
      lessonCode: l.lesson_code || formatLessonCode(resolvedPartNumber, l.lesson_number),
      wordRangeStart: l.word_range_start,
      wordRangeEnd: l.word_range_end,
      title: l.title || undefined,
      words,
      story: storyRow?.story_content || '',
      banglaSummary: storyRow?.bangla_summary || '',
      storyWordReview: parsedEntries,
      storyWordReviewRaw: rawReview || undefined,
      rawInput: l.raw_input ?? undefined,
      isPublished: l.is_published,
      completed: false,
      createdAt: l.created_at,
      updatedAt: l.updated_at,
    };
  });

  return { parts, lessons: sortLessons(lessons) };
}

// ---------------------------------------------------------------------------
// 3. Admin CRUD Operations (Protected on Database by RLS)
// ---------------------------------------------------------------------------

async function ensurePartExists(partNumber: number): Promise<PartRecord> {
  const client = getClient();
  if (!Number.isInteger(partNumber) || partNumber < 1) {
    throw new Error('Part number must be a positive integer.');
  }

  const { data: existing, error: findErr } = await client
    .from('parts')
    .select('*')
    .eq('part_number', partNumber)
    .maybeSingle();

  if (findErr) throw new Error(findErr.message);
  if (existing) {
    return {
      id: existing.id,
      partNumber: existing.part_number,
      title: existing.title || `Part ${existing.part_number}`,
      description: existing.description || '',
      createdAt: existing.created_at,
      updatedAt: existing.updated_at,
    };
  }

  const { data: inserted, error: insertErr } = await client
    .from('parts')
    .insert({
      part_number: partNumber,
      title: `Part ${partNumber}`,
      description: '',
    })
    .select('*')
    .single();

  if (insertErr || !inserted) {
    throw new Error(insertErr?.message || `Failed to create Part ${partNumber}.`);
  }

  return {
    id: inserted.id,
    partNumber: inserted.part_number,
    title: inserted.title,
    description: inserted.description,
    createdAt: inserted.created_at,
    updatedAt: inserted.updated_at,
  };
}

export async function upsertPartInSupabase(input: {
  id?: string;
  partNumber: number;
  title: string;
  description: string;
}): Promise<PartRecord> {
  const client = getClient();
  const partNumber = Math.max(1, Math.floor(input.partNumber));
  const title = input.title.trim() || `Part ${partNumber}`;
  const description = input.description.trim();

  if (input.id && isValidUuid(input.id)) {
    const { data, error } = await client
      .from('parts')
      .update({ part_number: partNumber, title, description })
      .eq('id', input.id)
      .select('*')
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to update Part.');

    // Keep denormalized part_number & lesson_code synced on child lessons if part_number changed
    const { data: childLessons } = await client
      .from('lessons')
      .select('id, lesson_number')
      .eq('part_id', data.id);

    if (childLessons && childLessons.length > 0) {
      for (const cl of childLessons) {
        await client
          .from('lessons')
          .update({
            part_number: partNumber,
            lesson_code: formatLessonCode(partNumber, cl.lesson_number),
          })
          .eq('id', cl.id);
      }
    }

    return {
      id: data.id,
      partNumber: data.part_number,
      title: data.title,
      description: data.description,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  const { data, error } = await client
    .from('parts')
    .insert({ part_number: partNumber, title, description })
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to create Part.');

  return {
    id: data.id,
    partNumber: data.part_number,
    title: data.title,
    description: data.description,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function deletePartInSupabase(partId: string): Promise<void> {
  const client = getClient();
  if (!isValidUuid(partId)) throw new Error('Invalid Part ID.');
  const { error } = await client.from('parts').delete().eq('id', partId);
  if (error) throw new Error(error.message);
}

function validateLessonInput(lesson: Lesson): void {
  if (!Number.isInteger(lesson.partNumber) || lesson.partNumber < 1) {
    throw new Error('Part number must be 1 or greater.');
  }
  if (!Number.isInteger(lesson.lessonIndexInPart) || lesson.lessonIndexInPart < 1) {
    throw new Error('Lesson number must be 1 or greater.');
  }
  if (!Array.isArray(lesson.words) || lesson.words.length === 0) {
    throw new Error('A lesson must contain at least 1 vocabulary word.');
  }
  for (const w of lesson.words) {
    if (!w.word || !w.word.trim()) {
      throw new Error('Every vocabulary word must have a non-empty English word.');
    }
  }
}

export async function saveLessonToSupabase(
  lesson: Lesson,
  isEdit: boolean
): Promise<Lesson> {
  const client = getClient();
  validateLessonInput(lesson);

  const part = await ensurePartExists(lesson.partNumber);
  const lessonCode = formatLessonCode(lesson.partNumber, lesson.lessonIndexInPart);
  const clientKey = lesson.clientKey || (!isValidUuid(lesson.id) ? lesson.id : undefined);

  let lessonId = isValidUuid(lesson.id) ? lesson.id : '';

  if (isEdit && lessonId) {
    const { data: updated, error: updateErr } = await client
      .from('lessons')
      .update({
        part_id: part.id,
        part_number: lesson.partNumber,
        lesson_number: lesson.lessonIndexInPart,
        lesson_code: lessonCode,
        word_range_start: lesson.wordRangeStart,
        word_range_end: lesson.wordRangeEnd,
        title: lesson.title || `Lesson ${lessonCode}`,
        raw_input: lesson.rawInput ?? null,
        is_published: lesson.isPublished ?? true,
      })
      .eq('id', lessonId)
      .select('id')
      .single();

    if (updateErr || !updated) {
      throw new Error(updateErr?.message || `Failed to update Lesson ${lessonCode}.`);
    }
    lessonId = updated.id;
  } else {
    const { data: inserted, error: insertErr } = await client
      .from('lessons')
      .insert({
        client_key: clientKey ?? null,
        part_id: part.id,
        part_number: lesson.partNumber,
        lesson_number: lesson.lessonIndexInPart,
        lesson_code: lessonCode,
        word_range_start: lesson.wordRangeStart,
        word_range_end: lesson.wordRangeEnd,
        title: lesson.title || `Lesson ${lessonCode}`,
        raw_input: lesson.rawInput ?? null,
        is_published: lesson.isPublished ?? true,
      })
      .select('id')
      .single();

    if (insertErr || !inserted) {
      throw new Error(insertErr?.message || `Failed to save Lesson ${lessonCode}.`);
    }
    lessonId = inserted.id;
  }

  // Sync vocabulary_words cleanly while preserving UUIDs and exact word_order
  if (isEdit) {
    const { error: delWordsErr } = await client
      .from('vocabulary_words')
      .delete()
      .eq('lesson_id', lessonId);
    if (delWordsErr) {
      throw new Error(`Failed updating vocabulary words: ${delWordsErr.message}`);
    }
  }

  const wordRows = lesson.words.map((w, idx) => ({
    id: isValidUuid(w.id) ? w.id : makeUuid(),
    lesson_id: lessonId,
    word: w.word.trim(),
    part_of_speech: w.partOfSpeech?.trim() || null,
    cefr_level: w.cefrLevel?.trim() || null,
    bangla_meaning: w.banglaMeaning || '',
    english_example: w.exampleSentence || '',
    bangla_translation: w.banglaTranslation || '',
    synonyms: Array.isArray(w.synonyms) ? w.synonyms : [],
    antonyms: Array.isArray(w.antonyms) ? w.antonyms : [],
    source_number: w.sourceNumber ?? lesson.wordRangeStart + idx,
    word_order: idx + 1,
  }));

  const { error: wordsErr } = await client.from('vocabulary_words').insert(wordRows);
  if (wordsErr) {
    throw new Error(`Failed saving vocabulary words: ${wordsErr.message}`);
  }

  // Upsert story
  const { error: storyErr } = await client.from('stories').upsert(
    {
      lesson_id: lessonId,
      story_content: lesson.story || '',
      bangla_summary: lesson.banglaSummary || '',
    },
    { onConflict: 'lesson_id' }
  );
  if (storyErr) {
    throw new Error(`Failed saving story: ${storyErr.message}`);
  }

  // Upsert story word review
  const reviewRaw = lesson.storyWordReviewRaw || '';
  const reviewEntries =
    lesson.storyWordReview.length > 0
      ? lesson.storyWordReview
      : reviewRaw
        ? parseStoryWordReview(reviewRaw)
        : [];

  const { error: reviewErr } = await client.from('story_word_reviews').upsert(
    {
      lesson_id: lessonId,
      review_content: reviewRaw,
      review_entries: reviewEntries,
    },
    { onConflict: 'lesson_id' }
  );
  if (reviewErr) {
    throw new Error(`Failed saving story word review: ${reviewErr.message}`);
  }

  return {
    ...lesson,
    id: lessonId,
    partId: part.id,
    lessonCode,
    words: lesson.words.map((w, idx) => ({
      ...w,
      id: wordRows[idx].id,
      wordOrder: idx + 1,
    })),
  };
}

export async function deleteLessonInSupabase(lessonId: string): Promise<void> {
  const client = getClient();
  if (!isValidUuid(lessonId)) throw new Error('Invalid Lesson ID.');
  const { error } = await client.from('lessons').delete().eq('id', lessonId);
  if (error) throw new Error(error.message);
}

export async function upsertWordInSupabase(
  lessonId: string,
  word: VocabWord,
  wordOrder: number,
  isNew: boolean
): Promise<void> {
  const client = getClient();
  if (!isValidUuid(lessonId)) throw new Error('Invalid Lesson ID.');
  if (!word.word || !word.word.trim()) {
    throw new Error('English word cannot be empty.');
  }

  const payload = {
    lesson_id: lessonId,
    word: word.word.trim(),
    part_of_speech: word.partOfSpeech?.trim() || null,
    cefr_level: word.cefrLevel?.trim() || null,
    bangla_meaning: word.banglaMeaning.trim(),
    english_example: word.exampleSentence.trim(),
    bangla_translation: word.banglaTranslation.trim(),
    synonyms: word.synonyms ?? [],
    antonyms: word.antonyms ?? [],
    source_number: word.sourceNumber ?? wordOrder,
    word_order: Math.max(1, wordOrder),
  };

  if (isNew || !isValidUuid(word.id)) {
    const { error } = await client.from('vocabulary_words').insert({
      id: makeUuid(),
      ...payload,
    });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await client
      .from('vocabulary_words')
      .update(payload)
      .eq('id', word.id);
    if (error) throw new Error(error.message);
  }
}

export async function deleteWordInSupabase(lessonId: string, wordId: string): Promise<void> {
  const client = getClient();
  if (!isValidUuid(lessonId) || !isValidUuid(wordId)) {
    throw new Error('Invalid Lesson or Word ID.');
  }

  const { error: delErr } = await client
    .from('vocabulary_words')
    .delete()
    .eq('id', wordId);
  if (delErr) throw new Error(delErr.message);

  // Re-index remaining words sequentially so word_order has no gaps
  const { data: remaining, error: fetchErr } = await client
    .from('vocabulary_words')
    .select('id, word_order')
    .eq('lesson_id', lessonId)
    .order('word_order', { ascending: true });

  if (fetchErr || !remaining) return;

  for (let idx = 0; idx < remaining.length; idx++) {
    const expectedOrder = idx + 1;
    if (remaining[idx].word_order !== expectedOrder) {
      await client
        .from('vocabulary_words')
        .update({ word_order: expectedOrder })
        .eq('id', remaining[idx].id);
    }
  }
}

export async function saveStoryAndReviewInSupabase(
  lessonId: string,
  payload: {
    story: string;
    banglaSummary: string;
    storyWordReviewRaw: string;
    storyWordReview: StoryReviewItem[];
  }
): Promise<void> {
  const client = getClient();
  if (!isValidUuid(lessonId)) throw new Error('Invalid Lesson ID.');

  const { error: storyErr } = await client.from('stories').upsert(
    {
      lesson_id: lessonId,
      story_content: payload.story,
      bangla_summary: payload.banglaSummary,
    },
    { onConflict: 'lesson_id' }
  );
  if (storyErr) throw new Error(storyErr.message);

  const parsedEntries =
    payload.storyWordReview.length > 0
      ? payload.storyWordReview
      : payload.storyWordReviewRaw.trim()
        ? parseStoryWordReview(payload.storyWordReviewRaw)
        : [];

  const { error: revErr } = await client.from('story_word_reviews').upsert(
    {
      lesson_id: lessonId,
      review_content: payload.storyWordReviewRaw,
      review_entries: parsedEntries,
    },
    { onConflict: 'lesson_id' }
  );
  if (revErr) throw new Error(revErr.message);
}

// ---------------------------------------------------------------------------
// 4. Safe, Idempotent Local Data Migration to Supabase
// ---------------------------------------------------------------------------

export async function migrateLocalLessonsToSupabase(
  localLessons: Lesson[],
  conflictMode: MigrationConflictMode = 'skip',
  onProgress?: (progress: { current: number; total: number; lessonCode: string }) => void
): Promise<MigrationReport> {
  const client = getClient();
  const startedAt = new Date().toISOString();

  if (!Array.isArray(localLessons) || localLessons.length === 0) {
    throw new Error(
      'No local lessons found to migrate. Aborting so existing Supabase records are never overwritten with empty data.'
    );
  }

  // Verify required tables exist before attempting any migration writes
  const setupStatus = await verifySupabaseDatabaseSetup();
  if (!setupStatus.allTablesReady) {
    throw new Error(
      `Migration blocked until database schema is ready. ${setupStatus.summary}`
    );
  }

  const sortedSource = sortLessons(localLessons);
  const uniqueSourceParts = Array.from(
    new Set(sortedSource.map((l) => l.partNumber))
  ).sort((a, b) => a - b);
  const sourceWordCount = sortedSource.reduce((sum, l) => sum + l.words.length, 0);

  // Fetch existing Parts & Lessons once to detect duplicates accurately
  const existingPartRows = await fetchAllPaginated<DbPartRow>('parts', [
    { column: 'part_number', ascending: true },
  ]);
  const existingLessonRows = await fetchAllPaginated<DbLessonRow>('lessons', [
    { column: 'part_number', ascending: true },
    { column: 'lesson_number', ascending: true },
  ]);

  const partIdByNumber = new Map<number, string>();
  for (const p of existingPartRows) {
    partIdByNumber.set(p.part_number, p.id);
  }

  let migratedParts = 0;
  for (const partNum of uniqueSourceParts) {
    if (!partIdByNumber.has(partNum)) {
      const created = await ensurePartExists(partNum);
      partIdByNumber.set(partNum, created.id);
      migratedParts++;
    }
  }

  const existingByClientKey = new Map<string, DbLessonRow>();
  const existingByPartAndNumber = new Map<string, DbLessonRow>();
  for (const row of existingLessonRows) {
    if (row.client_key) existingByClientKey.set(row.client_key, row);
    existingByPartAndNumber.set(`${row.part_id}::${row.lesson_number}`, row);
  }

  const items: MigrationLessonItemResult[] = [];
  let migratedLessons = 0;
  let updatedLessons = 0;
  let skippedLessons = 0;
  let failedLessons = 0;
  let migratedWords = 0;

  for (let i = 0; i < sortedSource.length; i++) {
    const lesson = sortedSource[i];
    onProgress?.({
      current: i + 1,
      total: sortedSource.length,
      lessonCode: lesson.lessonCode,
    });

    try {
      const partId = partIdByNumber.get(lesson.partNumber);
      if (!partId) {
        throw new Error(`Missing Part ${lesson.partNumber} record.`);
      }

      const clientKey = lesson.clientKey || lesson.id || `lesson_${lesson.lessonCode}`;
      const existingMatch =
        existingByClientKey.get(clientKey) ||
        existingByPartAndNumber.get(`${partId}::${lesson.lessonIndexInPart}`);

      if (existingMatch && conflictMode === 'skip') {
        skippedLessons++;
        items.push({
          lessonCode: lesson.lessonCode,
          partNumber: lesson.partNumber,
          wordCount: lesson.words.length,
          status: 'skipped',
          message: 'Already exists in Supabase (skipped to prevent duplicates).',
        });
        continue;
      }

      const lessonToSave: Lesson = existingMatch
        ? { ...lesson, id: existingMatch.id, clientKey }
        : { ...lesson, id: makeUuid(), clientKey };

      const saved = await saveLessonToSupabase(lessonToSave, Boolean(existingMatch));
      migratedWords += saved.words.length;

      if (existingMatch) {
        updatedLessons++;
        items.push({
          lessonCode: saved.lessonCode,
          partNumber: saved.partNumber,
          wordCount: saved.words.length,
          status: 'updated',
        });
      } else {
        migratedLessons++;
        items.push({
          lessonCode: saved.lessonCode,
          partNumber: saved.partNumber,
          wordCount: saved.words.length,
          status: 'migrated',
        });
      }
    } catch (err) {
      failedLessons++;
      items.push({
        lessonCode: lesson.lessonCode,
        partNumber: lesson.partNumber,
        wordCount: lesson.words.length,
        status: 'failed',
        message: formatSupabaseError(err),
      });
    }
  }

  // Verify exact counts in Supabase after migration
  const [partsCountRes, lessonsCountRes, wordsCountRes] = await Promise.all([
    client.from('parts').select('id', { count: 'exact', head: true }),
    client.from('lessons').select('id', { count: 'exact', head: true }),
    client.from('vocabulary_words').select('id', { count: 'exact', head: true }),
  ]);

  const verifiedSupabaseParts = partsCountRes.count ?? 0;
  const verifiedSupabaseLessons = lessonsCountRes.count ?? 0;
  const verifiedSupabaseWords = wordsCountRes.count ?? 0;

  let countMismatchWarning: string | undefined;
  if (
    failedLessons === 0 &&
    (verifiedSupabaseParts < uniqueSourceParts.length ||
      verifiedSupabaseLessons < sortedSource.length ||
      verifiedSupabaseWords < sourceWordCount)
  ) {
    countMismatchWarning = `Supabase verified counts (${verifiedSupabaseParts} parts, ${verifiedSupabaseLessons} lessons, ${verifiedSupabaseWords} words) are lower than your source totals (${uniqueSourceParts.length} parts, ${sortedSource.length} lessons, ${sourceWordCount} words). Please review skipped or conflicting lessons.`;
  }

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    sourcePartCount: uniqueSourceParts.length,
    sourceLessonCount: sortedSource.length,
    sourceWordCount,
    migratedParts,
    migratedLessons,
    updatedLessons,
    skippedLessons,
    failedLessons,
    migratedWords,
    verifiedSupabaseParts,
    verifiedSupabaseLessons,
    verifiedSupabaseWords,
    countMismatchWarning,
    items,
  };
}
