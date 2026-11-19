-- ============================================================================
-- Vocabo by Saiful — Supabase Database & RLS Verification Queries
-- ============================================================================
-- Run this read-only verification script in Supabase SQL Editor AFTER running
-- 001_vocabo_schema.sql and assigning your Admin user in public.admin_users.
-- ============================================================================

-- 1. Verify all 6 tables exist and have Row Level Security (RLS) enabled
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'admin_users',
    'parts',
    'lessons',
    'vocabulary_words',
    'stories',
    'story_word_reviews'
  )
ORDER BY c.relname;

-- 2. Verify all RLS policies on the 6 tables
SELECT
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'admin_users',
    'parts',
    'lessons',
    'vocabulary_words',
    'stories',
    'story_word_reviews'
  )
ORDER BY tablename, cmd, policyname;

-- 3. Verify foreign keys and cascading rules
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
  AND tc.constraint_schema = rc.constraint_schema
JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 4. Verify assigned Admin user(s)
SELECT user_id, email, role, created_at
FROM public.admin_users
ORDER BY created_at ASC;
