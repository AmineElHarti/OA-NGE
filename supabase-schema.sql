-- Schéma complet Supabase pour OA-NGE
-- Exécutez ce script dans l'éditeur SQL de votre projet Supabase

-- Tasks (tâches de construction)
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

-- Historique d'avancement
CREATE TABLE IF NOT EXISTS progress_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL,
  notes TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  recorded_by TEXT DEFAULT 'Utilisateur'
);

-- Kanban cards (tâches par ouvrage)
CREATE TABLE IF NOT EXISTS kanban_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ouvrage_id INTEGER NOT NULL,
  titre TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planifie',
  priority TEXT NOT NULL DEFAULT 'moyen',
  due_date DATE,
  assigned_to TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contraintes (déplacements de réseaux, etc.)
CREATE TABLE IF NOT EXISTS contraintes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ouvrage_id INTEGER NOT NULL,
  type_reseau TEXT NOT NULL,
  nature TEXT,
  description TEXT NOT NULL,
  pk_localisation TEXT,
  status TEXT NOT NULL DEFAULT 'identifiee',
  date_identification DATE,
  date_levee DATE,
  responsable TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ouvrage_id INTEGER NOT NULL,
  contenu TEXT NOT NULL,
  auteur TEXT NOT NULL DEFAULT 'Utilisateur',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Todos (liste de tâches)
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ouvrage_id INTEGER NOT NULL,
  titre TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'moyen',
  due_date DATE,
  assigned_to TEXT,
  done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Études (documents techniques)
CREATE TABLE IF NOT EXISTS etudes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ouvrage_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  nom TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'non_demarre',
  version TEXT DEFAULT '1.0',
  date_soumission DATE,
  date_validation DATE,
  responsable TEXT,
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photos (référence vers Supabase Storage)
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ouvrage_id INTEGER NOT NULL,
  categorie TEXT NOT NULL DEFAULT 'conception',
  nom TEXT NOT NULL,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activer RLS (Row Level Security)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE contraintes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE etudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Politiques permissives (ajustez selon vos besoins d'auth)
CREATE POLICY "Allow all" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON progress_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON kanban_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON contraintes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON todos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON etudes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON photos FOR ALL USING (true) WITH CHECK (true);

-- Bucket Storage pour les photos
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true) ON CONFLICT DO NOTHING;
CREATE POLICY "Allow public read" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Allow uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos');
CREATE POLICY "Allow deletes" ON storage.objects FOR DELETE USING (bucket_id = 'photos');
