-- Enhanced Excel Patterns Table for Learning System
-- Run this in your Supabase SQL Editor to update the table

-- Add new columns to existing table (safe to run multiple times)
DO $$
BEGIN
    -- Add semantic_profile column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'excel_patterns' AND column_name = 'semantic_profile') THEN
        ALTER TABLE excel_patterns ADD COLUMN semantic_profile jsonb DEFAULT '{}';
    END IF;

    -- Add fingerprint column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'excel_patterns' AND column_name = 'fingerprint') THEN
        ALTER TABLE excel_patterns ADD COLUMN fingerprint jsonb DEFAULT '{}';
    END IF;

    -- Add success_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'excel_patterns' AND column_name = 'success_count') THEN
        ALTER TABLE excel_patterns ADD COLUMN success_count integer DEFAULT 0;
    END IF;

    -- Add failure_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'excel_patterns' AND column_name = 'failure_count') THEN
        ALTER TABLE excel_patterns ADD COLUMN failure_count integer DEFAULT 0;
    END IF;

    -- Add notes column for tracking corrections
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'excel_patterns' AND column_name = 'notes') THEN
        ALTER TABLE excel_patterns ADD COLUMN notes jsonb DEFAULT '[]';
    END IF;

    -- Add last_corrected_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'excel_patterns' AND column_name = 'last_corrected_at') THEN
        ALTER TABLE excel_patterns ADD COLUMN last_corrected_at timestamptz;
    END IF;

    -- Add auto_learned flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'excel_patterns' AND column_name = 'auto_learned') THEN
        ALTER TABLE excel_patterns ADD COLUMN auto_learned boolean DEFAULT false;
    END IF;
END $$;

-- Create index on semantic_profile for faster queries
CREATE INDEX IF NOT EXISTS idx_excel_patterns_semantic
    ON excel_patterns USING GIN (semantic_profile);

-- Create index on success rate for sorting
CREATE INDEX IF NOT EXISTS idx_excel_patterns_success
    ON excel_patterns (success_count DESC, failure_count ASC);

-- Update existing patterns to have default values
UPDATE excel_patterns
SET
    semantic_profile = COALESCE(semantic_profile, '{}'),
    fingerprint = COALESCE(fingerprint, '{}'),
    success_count = COALESCE(success_count, usage_count),
    failure_count = COALESCE(failure_count, 0),
    notes = COALESCE(notes, '[]'),
    auto_learned = COALESCE(auto_learned, false)
WHERE semantic_profile IS NULL
   OR fingerprint IS NULL
   OR success_count IS NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN excel_patterns.semantic_profile IS 'Column types by semantic category (person, role, time, etc.)';
COMMENT ON COLUMN excel_patterns.fingerprint IS 'Full file fingerprint for similarity matching';
COMMENT ON COLUMN excel_patterns.success_count IS 'Number of successful transformations using this pattern';
COMMENT ON COLUMN excel_patterns.failure_count IS 'Number of failed transformations using this pattern';
COMMENT ON COLUMN excel_patterns.notes IS 'Array of correction notes from user feedback';
COMMENT ON COLUMN excel_patterns.auto_learned IS 'True if pattern was automatically learned from usage';
