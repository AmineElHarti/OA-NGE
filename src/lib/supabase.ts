import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = url && key ? createClient(url, key) : null;
export const hasSupabase = !!supabase;

export const SUPABASE_SQL = `
-- Run this in your Supabase SQL editor to create the schema

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY,
  nom TEXT NOT NULL,
  duree NUMERIC,
  debut DATE,
  fin DATE,
  level INTEGER DEFAULT 0,
  parent_id INTEGER,
  is_milestone BOOLEAN DEFAULT FALSE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS progress_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id INTEGER REFERENCES tasks(id),
  progress INTEGER NOT NULL,
  notes TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  recorded_by TEXT DEFAULT 'Utilisateur'
);

-- Enable RLS but allow all for anon (for simplicity)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON progress_history FOR ALL USING (true) WITH CHECK (true);
`;
