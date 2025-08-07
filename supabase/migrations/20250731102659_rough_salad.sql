/*
  # Add analysis details storage

  1. Schema Changes
    - Add `analysis_details` column to `analysis_logs` table to store complete analysis results
    - Add `is_saved` column to track which analyses are explicitly saved by users
    - Add index for better query performance

  2. Security
    - Existing RLS policies will automatically apply to new columns
*/

-- Add analysis_details column to store complete analysis results
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analysis_logs' AND column_name = 'analysis_details'
  ) THEN
    ALTER TABLE analysis_logs ADD COLUMN analysis_details JSONB DEFAULT NULL;
  END IF;
END $$;

-- Add is_saved column to track explicitly saved analyses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analysis_logs' AND column_name = 'is_saved'
  ) THEN
    ALTER TABLE analysis_logs ADD COLUMN is_saved BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add index for better query performance on saved analyses
CREATE INDEX IF NOT EXISTS idx_analysis_logs_user_saved 
ON analysis_logs(user_id, is_saved, created_at DESC);