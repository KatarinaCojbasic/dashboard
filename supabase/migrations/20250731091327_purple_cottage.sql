/*
  # Create analysis logs table

  1. New Tables
    - `analysis_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `question` (text)
      - `data_summary` (jsonb)
      - `result_summary` (text)
      - `charts_generated` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `analysis_logs` table
    - Add policy for authenticated users to read/write their own logs
*/

CREATE TABLE IF NOT EXISTS analysis_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  data_summary jsonb DEFAULT '{}',
  result_summary text,
  charts_generated integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analysis_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own analysis logs"
  ON analysis_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis logs"
  ON analysis_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analysis logs"
  ON analysis_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);