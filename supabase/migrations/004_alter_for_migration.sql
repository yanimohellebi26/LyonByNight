-- ============================================================
-- Migration 004: Prepare tables for JSON → Supabase migration
-- ============================================================

-- Enable pg_trgm if not already (needed for trigram GIN index in 001)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- LIEUX: Add backward-compat old_id and lat/lng columns
-- ============================================================

-- old_id stores the original JSON ID (e.g. "l3-1") for backward compatibility
ALTER TABLE lieux ADD COLUMN IF NOT EXISTS old_id TEXT;
CREATE INDEX IF NOT EXISTS idx_lieux_old_id ON lieux (old_id);

-- lat/lng for easy querying (coordonnees GEOGRAPHY is kept for spatial ops)
ALTER TABLE lieux ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE lieux ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- Trigger: auto-compute coordonnees GEOGRAPHY from lat/lng on insert/update
CREATE OR REPLACE FUNCTION sync_coordonnees_from_latlng()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.coordonnees = ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_coordonnees ON lieux;
CREATE TRIGGER trg_sync_coordonnees
  BEFORE INSERT OR UPDATE OF lat, lng ON lieux
  FOR EACH ROW
  EXECUTE FUNCTION sync_coordonnees_from_latlng();

-- ============================================================
-- EVENEMENTS: Make lieu_id nullable, add scraped event fields
-- ============================================================

-- Scraped events often have no venue in our DB
ALTER TABLE evenements ALTER COLUMN lieu_id DROP NOT NULL;

-- Additional fields for scraped events
ALTER TABLE evenements ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE evenements ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE evenements ADD COLUMN IF NOT EXISTS lieu_nom TEXT;
ALTER TABLE evenements ADD COLUMN IF NOT EXISTS old_id TEXT;

-- Expand event type constraint to match all TypeScript EventType values
ALTER TABLE evenements DROP CONSTRAINT IF EXISTS evenements_type_check;
ALTER TABLE evenements ADD CONSTRAINT evenements_type_check
  CHECK (type IN (
    'concert', 'dj_set', 'soiree_theme', 'quiz',
    'cultural', 'student', 'erasmus', 'scientific',
    'theater', 'festival', 'expo', 'workshop', 'sport', 'autre'
  ));

-- ============================================================
-- RLS: Enable row-level security with public read access
-- ============================================================

ALTER TABLE lieux ENABLE ROW LEVEL SECURITY;
ALTER TABLE evenements ENABLE ROW LEVEL SECURITY;
ALTER TABLE happy_hours ENABLE ROW LEVEL SECURITY;

-- Public read access (no auth required to browse venues/events)
CREATE POLICY "Public read lieux" ON lieux FOR SELECT USING (true);
CREATE POLICY "Public read evenements" ON evenements FOR SELECT USING (true);
CREATE POLICY "Public read happy_hours" ON happy_hours FOR SELECT USING (true);
