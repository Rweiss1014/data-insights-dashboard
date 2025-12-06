-- Data Insights Dashboard - Supabase Schema
-- Run this in the Supabase SQL Editor to set up tables

-- =============================================
-- 1. Dashboards table
-- =============================================
CREATE TABLE public.dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  dataset_id text NOT NULL,         -- file name or logical dataset identifier
  global_filters jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- 2. Dashboard cards table
-- =============================================
CREATE TABLE public.dashboard_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  position integer NOT NULL,
  title text,
  chart_type text NOT NULL,
  config_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 3. Analysis sessions table (for chat history)
-- =============================================
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dataset_id text NOT NULL,
  name text,
  chat_history jsonb DEFAULT '[]'::jsonb,
  cards_json jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- 4. Datasets metadata table (optional - tracks uploaded datasets)
-- =============================================
CREATE TABLE public.datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  file_type text,               -- 'xlsx' | 'csv'
  schema_json jsonb NOT NULL,   -- column names, types, sample data
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 5. Dataset joins config (for multi-file joins)
-- =============================================
CREATE TABLE public.dataset_joins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  base_dataset_id uuid REFERENCES public.datasets(id),
  join_dataset_id uuid REFERENCES public.datasets(id),
  join_type text NOT NULL,      -- 'inner' | 'left' | 'right'
  base_key text NOT NULL,       -- column name in base dataset
  join_key text NOT NULL,       -- column name in join dataset
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_joins ENABLE ROW LEVEL SECURITY;

-- Dashboards policy
CREATE POLICY "Users can manage their own dashboards"
ON public.dashboards
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Dashboard cards policy (follows dashboard access)
CREATE POLICY "Cards follow dashboard access"
ON public.dashboard_cards
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.dashboards d
    WHERE d.id = dashboard_id
    AND d.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dashboards d
    WHERE d.id = dashboard_id
    AND d.user_id = auth.uid()
  )
);

-- Sessions policy
CREATE POLICY "Users can manage their own sessions"
ON public.sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Datasets policy
CREATE POLICY "Users can manage their own datasets"
ON public.datasets
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Dataset joins policy
CREATE POLICY "Users can manage their own joins"
ON public.dataset_joins
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Indexes for performance
-- =============================================
CREATE INDEX idx_dashboards_user_id ON public.dashboards(user_id);
CREATE INDEX idx_dashboard_cards_dashboard_id ON public.dashboard_cards(dashboard_id);
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_datasets_user_id ON public.datasets(user_id);
