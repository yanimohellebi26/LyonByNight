-- ============================================================
-- Migration 006: User-created events
-- ============================================================

CREATE TABLE user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event details
  titre TEXT NOT NULL,
  description TEXT DEFAULT '',
  date DATE NOT NULL,
  heure_debut TIME NOT NULL,
  heure_fin TIME,
  type TEXT NOT NULL CHECK (type IN (
    'concert', 'dj_set', 'soiree_theme', 'quiz',
    'cultural', 'student', 'erasmus', 'scientific',
    'theater', 'festival', 'expo', 'workshop', 'sport', 'autre'
  )),
  prix_entree TEXT,
  image TEXT,

  -- Venue: existing lieu OR custom location
  lieu_id UUID REFERENCES lieux(id) ON DELETE SET NULL,
  lieu_custom_nom TEXT,
  lieu_custom_adresse TEXT,
  lieu_custom_lat DOUBLE PRECISION,
  lieu_custom_lng DOUBLE PRECISION,

  -- Status
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_events_user ON user_events (user_id);
CREATE INDEX idx_user_events_date ON user_events (date);
CREATE INDEX idx_user_events_status ON user_events (status);

-- RLS
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

-- Anyone can read published events
CREATE POLICY "Public read published user_events"
  ON user_events FOR SELECT
  USING (status = 'published');

-- Authors can read their own events (any status)
CREATE POLICY "Authors read own user_events"
  ON user_events FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can create events
CREATE POLICY "Authenticated create user_events"
  ON user_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Authors can update their own events
CREATE POLICY "Authors update own user_events"
  ON user_events FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Authors can delete their own events
CREATE POLICY "Authors delete own user_events"
  ON user_events FOR DELETE
  USING (auth.uid() = user_id);
