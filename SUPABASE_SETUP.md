# Supabase setup for Data AI Dashboard

When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in `.env`, the app uses Supabase for **auth** and **analysis logs**.

## Do you need a users table?

**No.** Supabase Auth stores users in `auth.users` (managed by Supabase). You do **not** need to create a custom `users` table for login/signup. The `analysis_logs` table references `auth.users(id)` via `user_id`; that’s enough.

## 1. Create the `analysis_logs` table

In Supabase: **SQL Editor** → New query → run:

```sql
-- Enable UUID extension if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.analysis_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  data_summary JSONB NOT NULL DEFAULT '{}',
  result_summary TEXT,
  charts_generated INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  analysis_details JSONB NOT NULL DEFAULT '{}',
  is_saved BOOLEAN NOT NULL DEFAULT false
);

-- Optional: index for listing by user and time
CREATE INDEX IF NOT EXISTS idx_analysis_logs_user_created
  ON public.analysis_logs (user_id, created_at DESC);
```

## 2. Row Level Security (RLS)

So each user only sees and edits their own rows:

```sql
ALTER TABLE public.analysis_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own rows
CREATE POLICY "Users can read own analysis_logs"
  ON public.analysis_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own rows
CREATE POLICY "Users can insert own analysis_logs"
  ON public.analysis_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own rows
CREATE POLICY "Users can update own analysis_logs"
  ON public.analysis_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own rows
CREATE POLICY "Users can delete own analysis_logs"
  ON public.analysis_logs FOR DELETE
  USING (auth.uid() = user_id);
```

## 3. Environment variables

In your project `.env` (copy from `.env.example`):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Get **Project URL** and **anon public** key from Supabase: **Project Settings** → **API**.

Restart the dev server after changing env (`npm run dev` or `npm run start`).
