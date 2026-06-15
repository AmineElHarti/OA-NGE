-- Exécutez ce script dans l'éditeur SQL de votre projet Supabase

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

-- Activer RLS (Row Level Security)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_history ENABLE ROW LEVEL SECURITY;

-- Autoriser toutes les opérations (ajustez selon vos besoins d'auth)
CREATE POLICY "Allow all on tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on progress_history" ON progress_history FOR ALL USING (true) WITH CHECK (true);
