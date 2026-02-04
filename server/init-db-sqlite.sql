-- Users table for login/register (id from app).
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Same schema as analysis_logs, for SQLite. id generated in app.
CREATE TABLE IF NOT EXISTS analysis_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  question TEXT NOT NULL,
  data_summary TEXT DEFAULT '{}',
  result_summary TEXT,
  charts_generated INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  analysis_details TEXT,
  is_saved INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_analysis_logs_user_saved
  ON analysis_logs(user_id, is_saved, created_at DESC);
