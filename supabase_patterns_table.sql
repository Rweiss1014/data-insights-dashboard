-- Excel Pattern Library Table
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/suucenodnszaiqrilbhd/sql

CREATE TABLE IF NOT EXISTS excel_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Pattern detection criteria
    header_signature JSONB NOT NULL,  -- Array of column names that identify this pattern
    min_columns INTEGER DEFAULT 10,
    has_repeating_columns BOOLEAN DEFAULT false,
    repeating_column_names JSONB,     -- Column names that repeat
    fixed_column_names JSONB,         -- Column names that don't repeat

    -- Transformation rules
    transformation_type VARCHAR(50) NOT NULL, -- 'wide_to_long', 'standard', 'custom'
    transformation_config JSONB,      -- Additional config for the transformation

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 100.00,

    -- Who created it (optional)
    created_by UUID REFERENCES auth.users(id)
);

-- Index for faster pattern matching
CREATE INDEX idx_excel_patterns_signature ON excel_patterns USING GIN (header_signature);

-- Enable RLS
ALTER TABLE excel_patterns ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read patterns (they're shared knowledge)
CREATE POLICY "Anyone can read patterns" ON excel_patterns
    FOR SELECT USING (true);

-- Only authenticated users can create patterns
CREATE POLICY "Authenticated users can create patterns" ON excel_patterns
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own patterns
CREATE POLICY "Users can update own patterns" ON excel_patterns
    FOR UPDATE USING (auth.uid() = created_by);

-- Insert the first pattern: LD Team Capacity
INSERT INTO excel_patterns (name, description, header_signature, has_repeating_columns, repeating_column_names, fixed_column_names, transformation_type, transformation_config)
VALUES (
    'Weekly Team Capacity',
    'Team capacity tracking with weekly repeating columns (Available Hours, Allocated Hours, Utilization, etc.)',
    '["Name", "Role", "Location", "Available Hours/Week", "Total Allocated Hours", "Remaining Hours", "Utilization %"]',
    true,
    '["Available Hours/Week", "Project/ Design Hours", "Facilitation Hours", "Travel Hours", "Admin/ Meetings Hours", "Total Allocated Hours", "Remaining Hours", "Utilization %"]',
    '["Name", "Role", "Location"]',
    'wide_to_long',
    '{"date_row": 0, "header_row": 1, "period_prefix": "Week of", "month_from_sheet": true}'
);
