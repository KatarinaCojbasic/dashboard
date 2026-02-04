-- Same schema as before (Supabase analysis_logs), without auth.users FK for local use.
-- user_id is text so we can use 'local' or any identifier.

CREATE TABLE IF NOT EXISTS analysis_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  question text NOT NULL,
  data_summary jsonb DEFAULT '{}',
  result_summary text,
  charts_generated integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  analysis_details jsonb DEFAULT NULL,
  is_saved boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_analysis_logs_user_saved
  ON analysis_logs(user_id, is_saved, created_at DESC);
