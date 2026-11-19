# Supabase Integration & Setup Guide — Vocabo by Saiful

This guide explains how to connect **Vocabo by Saiful** to Supabase PostgreSQL so all vocabulary content (Parts, Lessons, Vocabulary Words, Stories, Bangla Summaries, and Story Word Reviews) is shared across every device, while Admin CRUD operations are protected by Supabase Authentication and PostgreSQL Row Level Security (RLS).

---

## 1. Create a Supabase Project

1. Sign in to [https://supabase.com](https://supabase.com) and click **New Project**.
2. Choose your organization, give the project a name (for example, `vocabo-by-saiful`), set a strong database password, and select a region close to your users (e.g., Singapore `ap-southeast-1` or Mumbai `ap-south-1`).
3. Wait ~1–2 minutes for the database and Auth services to provision.

---

## 2. Run the SQL Schema & RLS Migration

1. Open your Supabase project dashboard.
2. Go to **SQL Editor** → **New query**.
3. Copy the entire contents of `supabase/migrations/001_vocabo_schema.sql` from this repository and paste it into the SQL Editor.
4. Click **Run**.
5. Verify in **Table Editor** (or by running `supabase/migrations/002_verify_setup.sql` in **SQL Editor**) that all 6 tables exist with **RLS enabled**:
   - `public.admin_users`
   - `public.parts`
   - `public.lessons`
   - `public.vocabulary_words`
   - `public.stories`
   - `public.story_word_reviews`
6. You can also verify readiness directly inside the app via **Settings → Verify Database Tables**.

---

## 3. Create Your First Admin Account & Assign Admin Permissions

Public visitors can read vocabulary without logging in. Only users listed in `public.admin_users` can insert, update, or delete shared vocabulary data. Regular users cannot add themselves to `admin_users` because `admin_users` has no public/client write policies.

### Step A — Create Your Auth User
1. In the Supabase Dashboard, go to **Authentication** → **Users**.
2. Click **Add user** → **Create new user**.
3. Enter your email address and a strong password, check **Auto Confirm User**, and click **Create user**.

*(Optional security hardening: In **Authentication** → **Sign In / Providers** → **Email**, you can disable public sign-ups if you only want your Admin account to exist.)*

### Step B — Assign Admin Role in SQL Editor
Run the following query in **SQL Editor** (replace `your-email@example.com` with your exact Admin email):

```sql
INSERT INTO public.admin_users (user_id, email, role)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (user_id) DO NOTHING;
```

Verify your admin record:

```sql
SELECT user_id, email, role, created_at FROM public.admin_users;
```

---

## 4. Configure Environment Variables (Local & Vercel)

### Required Variables
Only use the **Project URL** and the **anon / publishable key** in the frontend.
**NEVER put the `service_role` key in `.env`, Vite environment variables, or frontend code.**

1. In Supabase Dashboard, go to **Project Settings** → **API** (or **API Keys**).
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** (or **publishable**) key → `VITE_SUPABASE_ANON_KEY`

### Local Development Setup
Create a `.env` file in the project root (`.env` is already ignored by `.gitignore`):

```env
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-or-publishable-key"
```

### Vercel Deployment Setup
1. Open your project in the **Vercel Dashboard**.
2. Go to **Settings** → **Environment Variables**.
3. Add both variables for **Production**, **Preview**, and **Development**:
   - `VITE_SUPABASE_URL` = your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon / publishable key
4. Redeploy your project (or push to your connected Git branch) so Vite bundles the environment variables.

*(Also add your Vercel domain `https://vocabo-by-saiful.vercel.app` under Supabase **Authentication** → **URL Configuration** → **Site URL** & **Redirect URLs**.)*

---

## 5. Migrate Your Existing Vocabulary Data Safely

Before migrating, make sure you open the app on the browser/device that currently holds your existing lessons in `localStorage`.

1. Open your deployed or local **Vocabo by Saiful** app.
2. In the sidebar footer (or **Settings**), click **Admin Login** and sign in with your Supabase Admin email & password.
3. Open **Admin Dashboard** → **Migrate Local Data**.
4. **First, click "Download Full JSON Backup"** to save a complete safety copy of your local data.
5. Inspect the detected local counts (Parts, Lessons, Words, Stories, Summaries, Reviews).
   - If you are migrating from an exported backup file on another browser, you can also load that `.json` file directly in the migration panel.
6. Keep the conflict mode on **Skip Existing Lessons (Safe Default)** so re-running never creates duplicate records.
7. Click **Migrate Local Data to Supabase**.
8. Wait for the **Migration Report** and verify that:
   - Migrated Parts, Lessons, and Words counts match your expected totals.
   - Failed records = `0`.
   - Your original local data remains intact on your browser (nothing is deleted automatically).

---

## 6. Testing Public Read Access & Admin Security

### Test Public Visitor Experience (Incognito / Logged Out)
1. Open the app in an **Incognito / Private browser window**.
2. Confirm that **Admin Dashboard**, **Add New Lesson**, **Edit**, and **Delete** controls are NOT visible.
3. Confirm that all Parts, Lessons, Vocabulary Words, Stories, Bangla Summaries, and Story Word Reviews load from Supabase.
4. Test **Flashcards**, **Quiz**, **Daily Revision**, **Reading Mode**, **Favorites**, and **Progress Tracker**—personal learning progress stays isolated per browser/device.

### Test RLS Write Protection (Direct API Check)
Run a quick `curl` check against your Supabase REST endpoint with only the anon key (no admin session) to verify unauthorized writes are rejected:

```bash
curl -X POST "https://YOUR-PROJECT-REF.supabase.co/rest/v1/parts" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"part_number": 999, "title": "Unauthorized"}'
```

Expected response: HTTP `401` or `403` (`new row violates row-level security policy for table "parts"`).

### Test Admin CRUD & Cross-Device Sync
1. Sign in as Admin on Device A, add or edit a lesson in **Admin Dashboard** or **Add New Lesson**.
2. Open Device B (or an Incognito window) and refresh: the new/updated lesson and words appear immediately from Supabase.

---

## 7. Build & Deploy

```bash
npm install
npm run lint
npm run build
```

Push changes to GitHub and trigger a Vercel production deployment (`vercel --prod` or automatic Git deploy).
