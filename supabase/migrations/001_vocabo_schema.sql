-- ============================================================================
-- Vocabo by Saiful — Supabase PostgreSQL Schema & Row Level Security (RLS)
-- ============================================================================
-- Safe to run in Supabase SQL Editor. Uses IF NOT EXISTS / CREATE OR REPLACE
-- where appropriate so re-running does not destroy existing data.
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. Protected Admin Allowlist Table
-- ----------------------------------------------------------------------------
-- Only users whose auth.uid() exists in public.admin_users have write access.
-- Regular/public visitors have NO INSERT, UPDATE, or DELETE access to this table.
-- Assign admins ONLY from the Supabase SQL Editor (service_role / postgres).
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  role text NOT NULL DEFAULT 'admin' CHECK (role = 'admin'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Allow an authenticated user to check ONLY their own admin status
DROP POLICY IF EXISTS "Users can check own admin status" ON public.admin_users;
CREATE POLICY "Users can check own admin status"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Security-definer helper so RLS policies on content tables can safely verify admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Shared Updated-At Trigger Function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Parts Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number integer NOT NULL UNIQUE CHECK (part_number >= 1),
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parts_part_number ON public.parts (part_number);

DROP TRIGGER IF EXISTS trg_parts_updated_at ON public.parts;
CREATE TRIGGER trg_parts_updated_at
  BEFORE UPDATE ON public.parts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Lessons Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_key text UNIQUE,
  part_id uuid NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
  part_number integer NOT NULL CHECK (part_number >= 1),
  lesson_number integer NOT NULL CHECK (lesson_number >= 1),
  lesson_code text NOT NULL,
  word_range_start integer NOT NULL DEFAULT 1,
  word_range_end integer NOT NULL DEFAULT 10,
  title text NOT NULL DEFAULT '',
  raw_input text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (part_id, lesson_number)
);

CREATE INDEX IF NOT EXISTS idx_lessons_part_lesson ON public.lessons (part_number, lesson_number);
CREATE INDEX IF NOT EXISTS idx_lessons_part_id ON public.lessons (part_id);
CREATE INDEX IF NOT EXISTS idx_lessons_lesson_code ON public.lessons (lesson_code);
CREATE INDEX IF NOT EXISTS idx_lessons_published ON public.lessons (is_published);

DROP TRIGGER IF EXISTS trg_lessons_updated_at ON public.lessons;
CREATE TRIGGER trg_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Vocabulary Words Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vocabulary_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  word text NOT NULL,
  part_of_speech text,
  cefr_level text,
  bangla_meaning text NOT NULL DEFAULT '',
  english_example text NOT NULL DEFAULT '',
  bangla_translation text NOT NULL DEFAULT '',
  synonyms jsonb NOT NULL DEFAULT '[]'::jsonb,
  antonyms jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_number integer,
  word_order integer NOT NULL CHECK (word_order >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, word_order)
);

CREATE INDEX IF NOT EXISTS idx_vocab_words_lesson_order ON public.vocabulary_words (lesson_id, word_order);
CREATE INDEX IF NOT EXISTS idx_vocab_words_word_lower ON public.vocabulary_words (lower(word));

DROP TRIGGER IF EXISTS trg_vocab_words_updated_at ON public.vocabulary_words;
CREATE TRIGGER trg_vocab_words_updated_at
  BEFORE UPDATE ON public.vocabulary_words
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. Stories Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL UNIQUE REFERENCES public.lessons(id) ON DELETE CASCADE,
  story_content text NOT NULL DEFAULT '',
  bangla_summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stories_lesson_id ON public.stories (lesson_id);

DROP TRIGGER IF EXISTS trg_stories_updated_at ON public.stories;
CREATE TRIGGER trg_stories_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. Story Word Reviews Table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.story_word_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL UNIQUE REFERENCES public.lessons(id) ON DELETE CASCADE,
  review_content text NOT NULL DEFAULT '',
  review_entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_story_word_reviews_lesson_id ON public.story_word_reviews (lesson_id);

DROP TRIGGER IF EXISTS trg_story_word_reviews_updated_at ON public.story_word_reviews;
CREATE TRIGGER trg_story_word_reviews_updated_at
  BEFORE UPDATE ON public.story_word_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. Row Level Security (RLS) Policies
-- ----------------------------------------------------------------------------
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_word_reviews ENABLE ROW LEVEL SECURITY;

-- PARTS policies
DROP POLICY IF EXISTS "Public can read parts" ON public.parts;
CREATE POLICY "Public can read parts"
  ON public.parts
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert parts" ON public.parts;
CREATE POLICY "Admins can insert parts"
  ON public.parts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update parts" ON public.parts;
CREATE POLICY "Admins can update parts"
  ON public.parts
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete parts" ON public.parts;
CREATE POLICY "Admins can delete parts"
  ON public.parts
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- LESSONS policies
DROP POLICY IF EXISTS "Public can read published lessons" ON public.lessons;
CREATE POLICY "Public can read published lessons"
  ON public.lessons
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert lessons" ON public.lessons;
CREATE POLICY "Admins can insert lessons"
  ON public.lessons
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update lessons" ON public.lessons;
CREATE POLICY "Admins can update lessons"
  ON public.lessons
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete lessons" ON public.lessons;
CREATE POLICY "Admins can delete lessons"
  ON public.lessons
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- VOCABULARY WORDS policies
DROP POLICY IF EXISTS "Public can read words of published lessons" ON public.vocabulary_words;
CREATE POLICY "Public can read words of published lessons"
  ON public.vocabulary_words
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lessons l
      WHERE l.id = lesson_id
        AND (l.is_published = true OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Admins can insert words" ON public.vocabulary_words;
CREATE POLICY "Admins can insert words"
  ON public.vocabulary_words
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update words" ON public.vocabulary_words;
CREATE POLICY "Admins can update words"
  ON public.vocabulary_words
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete words" ON public.vocabulary_words;
CREATE POLICY "Admins can delete words"
  ON public.vocabulary_words
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- STORIES policies
DROP POLICY IF EXISTS "Public can read stories of published lessons" ON public.stories;
CREATE POLICY "Public can read stories of published lessons"
  ON public.stories
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lessons l
      WHERE l.id = lesson_id
        AND (l.is_published = true OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Admins can insert stories" ON public.stories;
CREATE POLICY "Admins can insert stories"
  ON public.stories
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update stories" ON public.stories;
CREATE POLICY "Admins can update stories"
  ON public.stories
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete stories" ON public.stories;
CREATE POLICY "Admins can delete stories"
  ON public.stories
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- STORY WORD REVIEWS policies
DROP POLICY IF EXISTS "Public can read reviews of published lessons" ON public.story_word_reviews;
CREATE POLICY "Public can read reviews of published lessons"
  ON public.story_word_reviews
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.lessons l
      WHERE l.id = lesson_id
        AND (l.is_published = true OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Admins can insert reviews" ON public.story_word_reviews;
CREATE POLICY "Admins can insert reviews"
  ON public.story_word_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update reviews" ON public.story_word_reviews;
CREATE POLICY "Admins can update reviews"
  ON public.story_word_reviews
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete reviews" ON public.story_word_reviews;
CREATE POLICY "Admins can delete reviews"
  ON public.story_word_reviews
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 9. Explicit Role Privileges (Defense-in-Depth Alongside RLS)
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Public & authenticated read access on vocabulary tables (filtered by RLS)
GRANT SELECT ON public.parts, public.lessons, public.vocabulary_words, public.stories, public.story_word_reviews TO anon, authenticated;

-- Write privileges granted to authenticated role only (strictly gated by public.is_admin() RLS)
REVOKE INSERT, UPDATE, DELETE ON public.parts, public.lessons, public.vocabulary_words, public.stories, public.story_word_reviews FROM anon;
GRANT INSERT, UPDATE, DELETE ON public.parts, public.lessons, public.vocabulary_words, public.stories, public.story_word_reviews TO authenticated;

-- Admin allowlist: authenticated can only read own row via RLS; zero client write access
REVOKE ALL ON public.admin_users FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.admin_users FROM authenticated;
GRANT SELECT ON public.admin_users TO authenticated;

-- Refresh PostgREST schema cache immediately so REST API sees all new tables
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- INITIAL ADMIN ASSIGNMENT (Run AFTER creating your Auth user in Supabase)
-- ============================================================================
-- 1. Create your user in Supabase Dashboard -> Authentication -> Users
-- 2. Run this query in SQL Editor (replace email if different):
--
-- INSERT INTO public.admin_users (user_id, email, role)
-- SELECT id, email, 'admin'
-- FROM auth.users
-- WHERE email = 'saifulctgsaifulctg715@gmail.com'
-- ON CONFLICT (user_id) DO NOTHING;
-- ============================================================================
