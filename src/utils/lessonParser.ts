import { Lesson, ParseResult, StoryReviewItem, TermMeaning, VocabWord } from '../types/vocab';

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function stripMarkdownWrapper(text: string): string {
  return text
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/^\s*[-*•]\s+/, '')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/`/g, '')
    .trim();
}

function cleanFieldValue(text: string): string {
  return text
    .replace(/^\s*[:ঃ\-–—]\s*/, '')
    .replace(/^\*\*\s*/, '')
    .replace(/\s*\*\*$/, '')
    .trim();
}

/**
 * Splits a comma-separated or semicolon-separated list of synonyms/antonyms
 * while respecting parentheses such as: Leave (ছেড়ে যাওয়া), Give up (হাল ছেড়ে দেওয়া)
 */
export function parseTermMeaningList(raw: string): TermMeaning[] {
  const cleaned = raw.replace(/\*\*/g, '').trim();
  if (!cleaned) return [];

  const parts: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === '(' || ch === '（') {
      parenDepth++;
      current += ch;
    } else if ((ch === ')' || ch === '）') && parenDepth > 0) {
      parenDepth--;
      current += ch;
    } else if ((ch === ',' || ch === ';' || ch === '।') && parenDepth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());

  return parts
    .map((item): TermMeaning | null => {
      const normalized = item.replace(/^[-•*]\s*/, '').trim();
      if (!normalized) return null;

      // Match: Term (meaning) or Term - meaning
      const parenMatch = normalized.match(/^(.+?)\s*[（(]([^()（）]+)[）)]\s*$/);
      if (parenMatch) {
        return {
          term: parenMatch[1].trim(),
          meaning: parenMatch[2].trim(),
        };
      }

      const dashMatch = normalized.match(/^(.+?)\s+[—–-]\s+(.+)$/);
      if (dashMatch) {
        return {
          term: dashMatch[1].trim(),
          meaning: dashMatch[2].trim(),
        };
      }

      return { term: normalized };
    })
    .filter((x): x is TermMeaning => x !== null && x.term.length > 0);
}

function normalizeLineText(line: string): string {
  return line
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

type MajorSectionType = 'story' | 'banglaSummary' | 'storyWordReview';

interface MajorSectionMatch {
  section: MajorSectionType;
  inlineContent?: string;
}

function stripLeadingDecorations(text: string): string {
  return text
    .replace(/^\s*(?:>\s*)*/, '')
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/^\s*[-*•]\s+/, '')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/`/g, '')
    // Strip leading emojis / decorative symbols while preserving letters, digits, and Bengali chars
    .replace(/^[^\p{L}\p{N}\u0980-\u09FF]+/u, '')
    .trim();
}

function matchMajorSectionLabel(labelText: string): MajorSectionType | null {
  const clean = labelText
    .replace(/^(?:part|section|step)\s*\d+\s*[:.\-–—]\s*/i, '')
    .replace(/^\d+\s*[.):\-–—]\s*/, '')
    .replace(/^[^\p{L}\p{N}\u0980-\u09FF]+/u, '')
    .replace(/[:ঃ\-–—|/\s]+$/, '')
    .trim()
    .toLowerCase();

  if (!clean) return null;

  // 1. Check Story Word Review first (since it contains "story" and "word")
  if (
    /^(?:story\s*word\s*review|story\s*words\s*review|word\s*review|words\s*review|vocabulary\s*review|story\s*vocabulary\s*review|review\s*of\s*(?:story|target)\s*words|words\s*used\s*in\s*(?:the\s*)?story|story\s*word\s*usage|story\s*word\s*list|গল্পে\s*শব্দের\s*ব্যবহার|গল্পের\s*শব্দ\s*পর্যালোচনা|শব্দ\s*পর্যালোচনা)(?:\s*\([^)]*\))?$/.test(
      clean
    )
  ) {
    return 'storyWordReview';
  }

  // 2. Check Bangla Story Summary / Story Summary
  if (
    /^(?:বাংলা\s*সারাংশ|বাংলা\s*গল্পের\s*সারাংশ|গল্পের\s*বাংলা\s*সারাংশ|গল্পের\s*সারাংশ|বাংলায়\s*সারাংশ|সারাংশ|bangla\s*summary|bangla\s*story\s*summary|story\s*bangla\s*summary|story\s*summary|bengali\s*summary|bengali\s*story\s*summary|summary\s*in\s*bangla|story\s*summary\s*\(bangla\)|summary\s*\(bangla\))(?:\s*\([^)]*\))?$/.test(
      clean
    )
  ) {
    return 'banglaSummary';
  }

  // 3. Check Story
  if (
    /^(?:story|the\s*story|short\s*story|english\s*story|mini\s*story|story\s*time|গল্প|ইংরেজি\s*গল্প|ছোট\s*গল্প)(?:\s*\([^)]*\)|\s+using\b.*)?$/.test(
      clean
    )
  ) {
    return 'story';
  }

  return null;
}

function detectMajorSectionHeader(
  line: string,
  nextNonEmptyLine?: string
): MajorSectionMatch | null {
  const normalized = normalizeLineText(line).trim();
  if (!normalized) return null;

  const hasMarkdownHeading = /^\s*(?:>\s*)?#{1,6}\s*/.test(normalized);
  const isBoldBlock = /^\*\*[^*]+\*\*\s*[:ঃ]?\s*$/.test(normalized);
  const stripped = stripLeadingDecorations(normalized);
  if (!stripped) return null;

  // Guard: If this looks like a numbered vocabulary entry (e.g. "## 1. Story") followed by a Meaning/Example field,
  // treat it as a vocabulary word rather than the Story section.
  const numberedWordMatch = stripped.match(/^(\d{1,3})\s*[.):\-–—]\s*(.+)$/);
  if (numberedWordMatch && nextNonEmptyLine) {
    const num = parseInt(numberedWordMatch[1], 10);
    if (num >= 1 && num <= 10 && detectFieldLine(nextNonEmptyLine)) {
      return null;
    }
  }

  // Case A: Exact heading match (e.g. "# Story", "## Story", "### Story", "Story", "**Story**", "## Story Summary", "## বাংলা সারাংশ", "## Story Word Review")
  const directMatch = matchMajorSectionLabel(stripped);
  if (directMatch) {
    return { section: directMatch };
  }

  // Case B: Bold inline prefix like "**Story:** Once upon a time..." or "**Story** Title"
  const boldPrefixMatch = normalized.match(
    /^(?:\s*(?:>\s*)?(?:#{1,6}\s*)?(?:[-*•]\s+)?)?(?:\*\*|__)([^*_]+?)(?:\*\*|__)\s*([:ঃ]?)\s+(.+)$/
  );
  if (boldPrefixMatch) {
    const left = boldPrefixMatch[1].trim();
    const hasColon = boldPrefixMatch[2].length > 0 || /[:ঃ]$/.test(left);
    const right = boldPrefixMatch[3].trim();
    const isBulletList = /^\s*[-*•]\s+/.test(normalized);
    if (!/^(?:→|->|=>|➜|➝)/.test(right) && (hasColon || !isBulletList)) {
      const matchedLeft = matchMajorSectionLabel(left);
      if (matchedLeft) {
        return { section: matchedLeft, inlineContent: right };
      }
    }
  }

  // Case C: Header with colon or dash separator (e.g. "Story: Once upon a time...", "## Story — The Turning Point", "Bangla Summary: ...")
  const lineWithoutHeaderPrefix = normalized
    .replace(/^\s*(?:>\s*)*/, '')
    .replace(/^\s*#{1,6}\s*/, '')
    .replace(/^\s*[-*•]\s+/, '')
    .replace(/^[^\p{L}\p{N}\u0980-\u09FF*_]+/u, '')
    .trim();

  const sepMatch = lineWithoutHeaderPrefix.match(
    /^([^:ঃ\-–—|]+?)\s*([:ঃ]|(?:\s+[—–\-|]\s+))\s*(.*)$/
  );
  if (sepMatch) {
    const rawLeft = sepMatch[1].trim();
    const left = rawLeft.replace(/\*\*/g, '').replace(/__/g, '').trim();
    const sep = sepMatch[2];
    let right = sepMatch[3].trim();
    if (/^(?:\*\*|__)/.test(rawLeft) && !/(?:\*\*|__)$/.test(rawLeft)) {
      right = right.replace(/^(?:\*\*|__)\s*/, '');
    }

    const matchedLeft = matchMajorSectionLabel(left);
    if (matchedLeft) {
      if (right && (sep.includes(':') || sep.includes('ঃ') || !hasMarkdownHeading)) {
        return { section: matchedLeft, inlineContent: right };
      }
      if (right && hasMarkdownHeading) {
        return { section: matchedLeft, inlineContent: right };
      }
      return { section: matchedLeft };
    }
  }

  // Case D: Markdown heading starting with "Story ..." e.g. "## Story of Rafi" or "## Story 1" when short
  if ((hasMarkdownHeading || isBoldBlock) && stripped.length <= 60) {
    if (/^(?:story\s+word\s+review|word\s+review)\b/i.test(stripped)) {
      return { section: 'storyWordReview' };
    }
    if (/^(?:bangla\s+(?:story\s+)?summary|story\s+summary|বাংলা\s*(?:গল্পের\s*)?সারাংশ)\b/i.test(stripped)) {
      return { section: 'banglaSummary' };
    }
    if (/^(?:the\s+|short\s+|english\s+)?story\b/i.test(stripped)) {
      return { section: 'story' };
    }
  }

  return null;
}

interface ParsedWordHeader {
  sourceNumber?: number;
  word: string;
  partOfSpeech?: string;
  cefrLevel?: string;
}

function extractPosAndCefr(rest: string): {
  cleanWord: string;
  partOfSpeech?: string;
  cefrLevel?: string;
} {
  let working = rest.trim();
  let cefrLevel: string | undefined;
  let partOfSpeech: string | undefined;

  // Extract CEFR level e.g. [B2], (B1), - C1, B2
  const cefrMatch = working.match(/(?:\(|\[|\b)(A1|A2|B1|B2|C1|C2)(?:\)|\]|\b)/i);
  if (cefrMatch) {
    cefrLevel = cefrMatch[1].toUpperCase();
    working = working.replace(cefrMatch[0], ' ').trim();
  }

  // Extract POS in parens/brackets e.g. (v.), (noun), [adj.]
  const posParenMatch = working.match(
    /(\(|\[)\s*(n\.?|v\.?|adj\.?|adv\.?|prep\.?|conj\.?|pron\.?|det\.?|excl\.?|noun|verb|adjective|adverb|preposition|conjunction|pronoun|phrasal verb|idiom)\s*(\)|\])/i
  );
  if (posParenMatch) {
    partOfSpeech = posParenMatch[2].trim();
    working = working.replace(posParenMatch[0], ' ').trim();
  } else {
    // Trailing - noun / , verb
    const posTrailMatch = working.match(
      /(?:\s+[-–—,|/]\s+)(noun|verb|adjective|adverb|preposition|conjunction|n\.|v\.|adj\.|adv\.)$/i
    );
    if (posTrailMatch) {
      partOfSpeech = posTrailMatch[1].trim();
      working = working.slice(0, posTrailMatch.index).trim();
    }
  }

  // Clean trailing punctuation
  working = working.replace(/^[\s\-–—:]+|[\s\-–—:,|]+$/g, '').trim();

  return { cleanWord: working, partOfSpeech, cefrLevel };
}

function detectWordHeader(line: string, nextNonEmptyLine?: string): ParsedWordHeader | null {
  const trimmed = normalizeLineText(line).trim();
  if (!trimmed) return null;

  // Never treat known field labels or section headers as word headers
  if (detectFieldLine(trimmed) || detectMajorSectionHeader(trimmed, nextNonEmptyLine)) {
    return null;
  }

  // Case 1: Markdown heading with number: ## 51. Abandon or ### 1) Ability or ## Word 1: Abandon
  const headingNumMatch = trimmed.match(
    /^#{1,6}\s*(?:word\s*)?(\d{1,4})\s*[.):\-–—]\s*(.+)$/i
  );
  if (headingNumMatch) {
    const num = parseInt(headingNumMatch[1], 10);
    const rawWord = stripMarkdownWrapper(headingNumMatch[2]);
    if (rawWord && rawWord.length <= 80) {
      const { cleanWord, partOfSpeech, cefrLevel } = extractPosAndCefr(rawWord);
      if (cleanWord) {
        return { sourceNumber: num, word: cleanWord, partOfSpeech, cefrLevel };
      }
    }
  }

  // Case 2: Bold or plain numbered line: **51. Abandon**, 51. **Abandon** (v.), **Word 10:** Abandon
  const boldOrNumMatch = trimmed.match(
    /^(?:\*\*|__)?\s*(?:word\s*)?(\d{1,4})\s*[.):\-–—]\s*(?:\*\*|__)?\s*(.+)$/i
  );
  if (boldOrNumMatch) {
    const num = parseInt(boldOrNumMatch[1], 10);
    const rawWord = stripMarkdownWrapper(boldOrNumMatch[2]);
    // Avoid matching long numbered sentences in story review or prose
    if (
      rawWord &&
      /^[A-Za-z]/.test(rawWord) &&
      rawWord.length <= 70 &&
      rawWord.split(/\s+/).length <= 6 &&
      !rawWord.includes(':') &&
      !/[.!?]$/.test(rawWord.replace(/\b(?:n|v|adj|adv|prep|conj|pron|det|excl)\.$/i, ''))
    ) {
      const { cleanWord, partOfSpeech, cefrLevel } = extractPosAndCefr(rawWord);
      if (cleanWord) {
        return { sourceNumber: num, word: cleanWord, partOfSpeech, cefrLevel };
      }
    }
  }

  // Case 3: Markdown heading without number: ## Abandon or ### Abandon (v.)
  const headingPlainMatch = trimmed.match(/^#{1,6}\s+([A-Za-z][A-Za-z\s'\-/()[\].*]{0,60})$/);
  if (headingPlainMatch) {
    const rawWord = stripMarkdownWrapper(headingPlainMatch[1]);
    if (rawWord && rawWord.split(/\s+/).length <= 5) {
      const { cleanWord, partOfSpeech, cefrLevel } = extractPosAndCefr(rawWord);
      if (cleanWord) {
        return { word: cleanWord, partOfSpeech, cefrLevel };
      }
    }
  }

  return null;
}

type WordFieldKey =
  | 'meaning'
  | 'example'
  | 'bangla'
  | 'synonyms'
  | 'antonyms'
  | 'pos'
  | 'cefr';

function detectFieldLine(line: string): { key: WordFieldKey; value: string } | null {
  const trimmed = normalizeLineText(line).trim();
  if (!trimmed) return null;

  // Strip leading bullet or bolding around label
  const normalized = trimmed
    .replace(/^[-*•]\s+/, '')
    .replace(/^\*\*([^*]+)\*\*/, '$1')
    .replace(/^__([^_]+)__/, '$1')
    .trim();

  const match = normalized.match(/^([^:ঃ]+?)\s*[:ঃ]\s*(.*)$/);
  if (!match) return null;

  const rawLabel = match[1].replace(/\*\*/g, '').trim().toLowerCase();
  const value = cleanFieldValue(match[2]);

  if (
    /^(meaning|bangla\s*meaning|bengali\s*meaning|word\s*meaning|বাংলা\s*অর্থ|অর্থ|meaning\s*\(bangla\))$/.test(
      rawLabel
    )
  ) {
    return { key: 'meaning', value };
  }

  if (/^(example|example\s*sentence|examples|sentence|উদাহরণ|বাক্য)$/.test(rawLabel)) {
    return { key: 'example', value };
  }

  if (
    /^(বাংলা|bangla|bengali|translation|bangla\s*translation|example\s*translation|বাংলা\s*অনুবাদ|অনুবাদ|অর্থ\s*ও\s*অনুবাদ)$/.test(
      rawLabel
    )
  ) {
    return { key: 'bangla', value };
  }

  if (/^(synonyms?|similar\s*words?|সমার্থক\s*শব্দ|সমার্থক)$/.test(rawLabel)) {
    return { key: 'synonyms', value };
  }

  if (/^(antonyms?|opposite\s*words?|বিপরীত\s*শব্দ|বিপরীত)$/.test(rawLabel)) {
    return { key: 'antonyms', value };
  }

  if (/^(part\s*of\s*speech|pos|word\s*class|পদ)$/.test(rawLabel)) {
    return { key: 'pos', value };
  }

  if (/^(cefr|cefr\s*level|level)$/.test(rawLabel)) {
    return { key: 'cefr', value };
  }

  return null;
}

export function parseStoryWordReview(raw: string): StoryReviewItem[] {
  const normalized = normalizeLineText(raw).replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  // If multiple "Word → ..." or "**Word**: ..." entries were accidentally merged on the same line,
  // split them onto separate lines before parsing.
  const preSplit = normalized
    .replace(
      /([।.!?\u0980-\u09FF])\s+(?=(?:[-*•]\s*|\d+[.)]\s*)?(?:\*\*|__)?[A-Za-z][A-Za-z\s'\-/]{0,35}?(?:\*\*|__)?\s*(?:→|->|=>|➜|➝))/g,
      '$1\n'
    )
    .replace(
      /([।.!?])\s+(?=(?:[-*•]\s*|\d+[.)]\s*)?\*\*[A-Za-z][A-Za-z\s'\-/()]{0,35}\*\*\s*[:ঃ\-–—])/g,
      '$1\n'
    );

  const lines = preSplit
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^[-*_═─=]{3,}$/.test(l));

  const items: StoryReviewItem[] = [];

  for (const line of lines) {
    const hasBulletOrNumber = /^(?:\d+[.)]\s+|[-*•]\s+)/.test(line);
    const stripped = line.replace(/^(?:\d+[.)]\s*|[-*•]\s*)/, '').trim();
    if (!stripped) continue;

    // Remove Markdown bold/italic/code wrappers while keeping punctuation and Bengali text intact
    const clean = stripped
      .replace(/\*\*/g, '')
      .replace(/__/g, '')
      .replace(/(^|\s)\*([^*\n]+)\*(?=\s|$|:)/g, '$1$2')
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .trim();

    if (!clean) continue;

    // Pattern 1: Word (optional meaning) → phrase: explanation  OR  Word → explanation
    const arrowMatch = clean.match(
      /^([A-Za-z][A-Za-z\s'\-/()[\]]{0,55}?)\s*(?:→|->|=>|➜|➝)\s*(.+)$/
    );
    if (arrowMatch) {
      let leftWord = arrowMatch[1].trim();
      let meaning: string | undefined;

      const leftMeaningMatch = leftWord.match(/^(.+?)\s*[（(]([^()（）]+)[）)]\s*$/);
      if (leftMeaningMatch) {
        leftWord = leftMeaningMatch[1].trim();
        meaning = leftMeaningMatch[2].trim();
      }

      const rightPart = arrowMatch[2].trim();
      const colonIdx = rightPart.search(/[:ঃ]/);
      if (colonIdx > 0) {
        const phrase = rightPart.slice(0, colonIdx).trim();
        const usage = rightPart.slice(colonIdx + 1).trim();
        items.push({
          id: generateId('rev'),
          word: leftWord,
          meaning,
          phrase: phrase || undefined,
          usage,
        });
      } else {
        items.push({
          id: generateId('rev'),
          word: leftWord,
          meaning,
          usage: rightPart,
        });
      }
      continue;
    }

    // Pattern 2: Word (meaning): usage or Word (meaning) - usage
    const patternA = clean.match(
      /^([A-Za-z][A-Za-z\s'\-/]{0,45}?)\s*[（(]([^()（）]+)[）)]\s*[:ঃ\-–—]\s*(.+)$/
    );
    if (patternA) {
      items.push({
        id: generateId('rev'),
        word: patternA[1].trim(),
        meaning: patternA[2].trim(),
        usage: patternA[3].trim(),
      });
      continue;
    }

    // Pattern 3: Word: usage or Word — usage
    const patternB = clean.match(/^([A-Za-z][A-Za-z\s'\-/]{0,45}?)\s*[:ঃ\-–—]\s*(.+)$/);
    if (patternB) {
      items.push({
        id: generateId('rev'),
        word: patternB[1].trim(),
        usage: patternB[2].trim(),
      });
      continue;
    }

    // Pattern 4: Word (meaning) without extra usage
    const patternC = clean.match(/^([A-Za-z][A-Za-z\s'\-/]{0,45}?)\s*[（(]([^()（）]+)[）)]\s*$/);
    if (patternC) {
      items.push({
        id: generateId('rev'),
        word: patternC[1].trim(),
        meaning: patternC[2].trim(),
        usage: '',
      });
      continue;
    }

    // Only append as continuation if explicitly NOT a bullet/numbered/bold-start line
    // and there's no English word header pattern. Otherwise create its own bullet item.
    if (
      items.length > 0 &&
      !hasBulletOrNumber &&
      !/^\*\*/.test(stripped) &&
      !/^[A-Za-z][A-Za-z\s'\-/]{0,30}(?:→|->|=>|[:ঃ\-–—])/.test(clean) &&
      !/^[A-Za-z]/.test(clean)
    ) {
      const prev = items[items.length - 1];
      prev.usage = prev.usage ? `${prev.usage} ${clean}` : clean;
    } else {
      items.push({
        id: generateId('rev'),
        word: clean,
        usage: '',
      });
    }
  }

  return items;
}

interface RawWordBlock {
  sourceNumber?: number;
  word: string;
  partOfSpeech?: string;
  cefrLevel?: string;
  meaningLines: string[];
  exampleLines: string[];
  banglaLines: string[];
  synonymsLines: string[];
  antonymsLines: string[];
  unclassifiedLines: string[];
}

export function parseLessonContent(rawInput: string): ParseResult {
  const warnings: string[] = [];
  const normalizedInput = normalizeLineText(rawInput).replace(/\r\n/g, '\n').trim();

  if (!normalizedInput) {
    return {
      draft: {
        words: [],
        story: '',
        banglaSummary: '',
        storyWordReview: [],
        storyWordReviewRaw: '',
      },
      warnings: ['Paste your formatted lesson text to organize it.'],
      detectedWordCount: 0,
      hasStory: false,
      hasBanglaSummary: false,
      hasStoryWordReview: false,
    };
  }

  const lines = normalizedInput.split('\n');
  const wordBlocks: RawWordBlock[] = [];
  let currentWord: RawWordBlock | null = null;
  let currentField: WordFieldKey | null = null;
  let currentMajorSection: MajorSectionType | null = null;

  const sectionBuffers: Record<MajorSectionType, string[]> = {
    story: [],
    banglaSummary: [],
    storyWordReview: [],
  };

  const findNextNonEmptyLine = (startIndex: number): string | undefined => {
    for (let j = startIndex + 1; j < lines.length; j++) {
      const t = lines[j].trim();
      if (t && !/^[-*_═─=]{3,}$/.test(t)) return t;
    }
    return undefined;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip pure horizontal dividers
    if (/^[-*_═─=]{3,}$/.test(trimmed)) {
      continue;
    }

    // Preserve blank lines inside major sections (e.g., multi-paragraph stories);
    // inside word blocks, reset currentField so post-blank prose never leaks into Word 10's last field.
    if (!trimmed) {
      if (currentMajorSection) {
        sectionBuffers[currentMajorSection].push('');
      } else {
        currentField = null;
      }
      continue;
    }

    const nextNonEmpty = findNextNonEmptyLine(i);

    // Check if this line starts a major section (Story, Bangla Summary, Story Word Review)
    const majorMatch = detectMajorSectionHeader(trimmed, nextNonEmpty);
    if (majorMatch) {
      currentMajorSection = majorMatch.section;
      currentWord = null;
      currentField = null;

      if (majorMatch.inlineContent) {
        sectionBuffers[majorMatch.section].push(majorMatch.inlineContent);
      }
      continue;
    }

    // Inside a major section, collect lines verbatim unless another major section starts
    if (currentMajorSection) {
      sectionBuffers[currentMajorSection].push(line);
      continue;
    }

    // Check if this line starts a new word entry
    const wordHeader = detectWordHeader(trimmed, nextNonEmpty);
    if (wordHeader) {
      currentWord = {
        sourceNumber: wordHeader.sourceNumber,
        word: wordHeader.word,
        partOfSpeech: wordHeader.partOfSpeech,
        cefrLevel: wordHeader.cefrLevel,
        meaningLines: [],
        exampleLines: [],
        banglaLines: [],
        synonymsLines: [],
        antonymsLines: [],
        unclassifiedLines: [],
      };
      wordBlocks.push(currentWord);
      currentField = null;
      continue;
    }

    // Check if this line is a vocabulary field
    const field = detectFieldLine(trimmed);
    if (field) {
      if (!currentWord) {
        // Field appeared before any word header — create placeholder word block so content is never lost
        currentWord = {
          word: `Word ${wordBlocks.length + 1}`,
          meaningLines: [],
          exampleLines: [],
          banglaLines: [],
          synonymsLines: [],
          antonymsLines: [],
          unclassifiedLines: [],
        };
        wordBlocks.push(currentWord);
        warnings.push(
          `Found "${field.key}" field before a clear word heading; grouped under "${currentWord.word}".`
        );
      }

      currentField = field.key;
      if (field.value) {
        switch (field.key) {
          case 'meaning':
            currentWord.meaningLines.push(field.value);
            break;
          case 'example':
            currentWord.exampleLines.push(field.value);
            break;
          case 'bangla':
            currentWord.banglaLines.push(field.value);
            break;
          case 'synonyms':
            currentWord.synonymsLines.push(field.value);
            break;
          case 'antonyms':
            currentWord.antonymsLines.push(field.value);
            break;
          case 'pos':
            currentWord.partOfSpeech = field.value;
            break;
          case 'cefr':
            currentWord.cefrLevel = field.value.toUpperCase();
            break;
        }
      }
      continue;
    }

    // Non-empty continuation line inside a word block
    if (currentWord) {
      if (currentField === 'meaning') {
        currentWord.meaningLines.push(trimmed);
      } else if (currentField === 'example') {
        currentWord.exampleLines.push(trimmed);
      } else if (currentField === 'bangla') {
        currentWord.banglaLines.push(trimmed);
      } else if (currentField === 'synonyms') {
        currentWord.synonymsLines.push(trimmed);
      } else if (currentField === 'antonyms') {
        currentWord.antonymsLines.push(trimmed);
      } else {
        currentWord.unclassifiedLines.push(trimmed);
      }
    }
  }

  const words: VocabWord[] = wordBlocks.map((block, index) => {
    const banglaMeaning = block.meaningLines.join(' ').trim();
    const exampleSentence = block.exampleLines.join(' ').trim();
    const banglaTranslation = block.banglaLines.join(' ').trim();
    const synonyms = parseTermMeaningList(block.synonymsLines.join(', '));
    const antonyms = parseTermMeaningList(block.antonymsLines.join(', '));

    const label = block.word || `Word ${index + 1}`;
    if (!banglaMeaning) {
      warnings.push(`"${label}": Meaning / বাংলা অর্থ was not detected.`);
    }
    if (!exampleSentence) {
      warnings.push(`"${label}": Example sentence was not detected.`);
    }
    if (!banglaTranslation) {
      warnings.push(`"${label}": Bangla translation was not detected.`);
    }
    if (block.unclassifiedLines.length > 0) {
      warnings.push(
        `"${label}": Some extra text could not be matched to a field (${block.unclassifiedLines[0].slice(0, 50)}...).`
      );
    }

    return {
      id: generateId('word'),
      sourceNumber: block.sourceNumber,
      word: label,
      partOfSpeech: block.partOfSpeech,
      cefrLevel: block.cefrLevel,
      banglaMeaning,
      exampleSentence,
      banglaTranslation,
      synonyms,
      antonyms,
      isFavorite: false,
      revisionStatus: 'new',
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      difficultCount: 0,
    };
  });

  const cleanSectionBuffer = (buf: string[]) =>
    buf
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const story = cleanSectionBuffer(sectionBuffers.story);
  const banglaSummary = cleanSectionBuffer(sectionBuffers.banglaSummary);
  const storyWordReviewRaw = cleanSectionBuffer(sectionBuffers.storyWordReview);
  const storyWordReview = parseStoryWordReview(storyWordReviewRaw);

  if (words.length === 0) {
    warnings.unshift(
      'No vocabulary word headings were detected. Make sure each word has a heading like "## 1. Word".'
    );
  } else if (words.length !== 10) {
    warnings.unshift(
      `Detected ${words.length} vocabulary word${words.length === 1 ? '' : 's'} (standard lessons have 10 words). You can review and edit below before saving.`
    );
  }

  if (!story) {
    warnings.push('Story section (## Story) was not found. You can add it manually below.');
  }
  if (!banglaSummary) {
    warnings.push('Bangla Story Summary (## বাংলা সারাংশ) was not found. You can add it manually below.');
  }
  if (!storyWordReviewRaw) {
    warnings.push('Story Word Review (## Story Word Review) was not found. You can add it manually below.');
  }

  return {
    draft: {
      words,
      story,
      banglaSummary,
      storyWordReview,
      storyWordReviewRaw,
    },
    warnings,
    detectedWordCount: words.length,
    hasStory: story.length > 0,
    hasBanglaSummary: banglaSummary.length > 0,
    hasStoryWordReview: storyWordReview.length > 0 || storyWordReviewRaw.length > 0,
  };
}

export function formatLessonToMarkdown(lesson: Lesson): string {
  const wordBlocks = lesson.words.map((w, idx) => {
    const num = w.sourceNumber ?? lesson.wordRangeStart + idx;
    const metaParts: string[] = [];
    if (w.partOfSpeech) metaParts.push(`(${w.partOfSpeech})`);
    if (w.cefrLevel) metaParts.push(`[${w.cefrLevel}]`);
    const heading = `## ${num}. ${w.word}${metaParts.length ? ' ' + metaParts.join(' ') : ''}`;

    const synText = w.synonyms
      .map((s) => (s.meaning ? `${s.term} (${s.meaning})` : s.term))
      .join(', ');
    const antText = w.antonyms
      .map((a) => (a.meaning ? `${a.term} (${a.meaning})` : a.term))
      .join(', ');

    return [
      heading,
      '',
      `**Meaning:** ${w.banglaMeaning}`,
      '',
      `**Example:** ${w.exampleSentence}`,
      '',
      `**বাংলা:** ${w.banglaTranslation}`,
      '',
      `**Synonyms:** ${synText}`,
      '',
      `**Antonyms:** ${antText}`,
    ].join('\n');
  });

  const reviewText =
    lesson.storyWordReview.length > 0
      ? lesson.storyWordReview
          .map((item) => {
            const meaningPart = item.meaning ? ` (${item.meaning})` : '';
            if (item.phrase) {
              const usagePart = item.usage ? ` ${item.usage}` : '';
              return `- **${item.word}**${meaningPart} → *${item.phrase}${item.usage ? ':' : ''}*${usagePart}`;
            }
            const usagePart = item.usage ? `: ${item.usage}` : '';
            return `- **${item.word}**${meaningPart}${usagePart}`;
          })
          .join('\n')
      : lesson.storyWordReviewRaw || '';

  return [
    ...wordBlocks,
    '',
    '---',
    '',
    '## Story',
    '',
    lesson.story,
    '',
    '## বাংলা সারাংশ',
    '',
    lesson.banglaSummary,
    '',
    '## Story Word Review',
    '',
    reviewText,
  ].join('\n');
}
