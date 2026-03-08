-- Table des événements
CREATE TABLE evenements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lieu_id UUID NOT NULL REFERENCES lieux(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  heure_debut TIME,
  heure_fin TIME,
  type TEXT CHECK (type IN ('concert', 'dj_set', 'soiree_theme', 'quiz', 'autre')),
  prix_entree TEXT,
  artiste TEXT,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_date ON evenements (date);
CREATE INDEX idx_events_lieu ON evenements (lieu_id);

-- Table happy hours
CREATE TABLE happy_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lieu_id UUID NOT NULL REFERENCES lieux(id) ON DELETE CASCADE,
  jours TEXT[] NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME NOT NULL,
  offre TEXT NOT NULL
);

CREATE INDEX idx_happy_hours_lieu ON happy_hours (lieu_id);
