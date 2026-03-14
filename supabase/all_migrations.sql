-- Extensions requises
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector; -- pgvector pour RAG
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- trigram pour recherche fuzzy

-- Table principale des lieux
CREATE TABLE lieux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bar', 'club')),
  categorie TEXT NOT NULL,
  sous_categories TEXT[] DEFAULT '{}',

  -- Localisation
  adresse TEXT NOT NULL,
  arrondissement TEXT,
  quartier TEXT,
  coordonnees GEOGRAPHY(POINT, 4326),

  -- Informations
  note NUMERIC(2,1) CHECK (note >= 0 AND note <= 5),
  prix_fourchette TEXT CHECK (prix_fourchette IN ('€', '€€', '€€€')),
  prix_pinte_moy NUMERIC(4,2),
  prix_cocktail_moy NUMERIC(4,2),
  prix_entree TEXT,
  musique TEXT[] DEFAULT '{}',
  specificites TEXT[] DEFAULT '{}',
  clientele TEXT,
  capacite INTEGER,

  -- Horaires
  horaires JSONB,

  -- Contenu
  description TEXT DEFAULT '',
  resume_avis TEXT,
  photos TEXT[] DEFAULT '{}',
  photo_cover TEXT,

  -- Contact
  site_web TEXT,
  instagram TEXT,
  google_maps TEXT,
  telephone TEXT,

  -- RAG
  embedding VECTOR(1536),

  -- Source
  sources TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index géospatial
CREATE INDEX idx_lieux_geo ON lieux USING GIST (coordonnees);

-- Index filtres courants
CREATE INDEX idx_lieux_type ON lieux (type);
CREATE INDEX idx_lieux_arrondissement ON lieux (arrondissement);
CREATE INDEX idx_lieux_note ON lieux (note DESC);
CREATE INDEX idx_lieux_categorie ON lieux (categorie);
CREATE INDEX idx_lieux_slug ON lieux (slug);

-- Full-text search
CREATE INDEX idx_lieux_nom_trgm ON lieux USING GIN (nom gin_trgm_ops);
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
-- Recherche par rayon (km) autour d'un point
CREATE OR REPLACE FUNCTION lieux_dans_rayon(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_rayon_km DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  nom TEXT,
  slug TEXT,
  type TEXT,
  note NUMERIC,
  distance_km DOUBLE PRECISION
) AS $$
  SELECT
    l.id,
    l.nom,
    l.slug,
    l.type,
    l.note,
    ST_Distance(
      l.coordonnees,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) / 1000.0 AS distance_km
  FROM lieux l
  WHERE ST_DWithin(
    l.coordonnees,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_rayon_km * 1000
  )
  ORDER BY distance_km;
$$ LANGUAGE sql STABLE;

-- Recherche vectorielle pour le RAG
CREATE OR REPLACE FUNCTION recherche_rag(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  nom TEXT,
  description TEXT,
  similarity FLOAT
) AS $$
  SELECT
    l.id,
    l.nom,
    l.description,
    1 - (l.embedding <=> query_embedding) AS similarity
  FROM lieux l
  WHERE 1 - (l.embedding <=> query_embedding) > match_threshold
  ORDER BY l.embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql STABLE;
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
-- ============================================================
-- Migration 005: User profiles + auto-creation trigger
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_profiles_user_id ON profiles (user_id);

-- Auto-create a profile when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      NEW.raw_user_meta_data ->> 'full_name',
      split_part(NEW.email, '@', 1)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read profiles (needed for group member lists)
CREATE POLICY "Public read profiles"
  ON profiles FOR SELECT
  USING (true);

-- Users can update only their own profile
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
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
-- ============================================================
-- Migration 007: Groups, members, shared events & votes
-- ============================================================

-- ── Groups ──────────────────────────────────────────────────

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  nom TEXT NOT NULL,
  description TEXT DEFAULT '',
  emoji TEXT DEFAULT '🎉',
  privacy TEXT NOT NULL DEFAULT 'private' CHECK (privacy IN ('public', 'private')),

  -- Invite system: 8-char alphanumeric code
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 8)),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_groups_owner ON groups (owner_id);
CREATE INDEX idx_groups_invite_code ON groups (invite_code);

-- ── Group members ───────────────────────────────────────────

CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON group_members (group_id);
CREATE INDEX idx_group_members_user ON group_members (user_id);

-- ── Group events (shared events within a group) ────────────

CREATE TABLE group_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Link to either a scraped event or a user-created event
  evenement_id UUID REFERENCES evenements(id) ON DELETE CASCADE,
  user_event_id UUID REFERENCES user_events(id) ON DELETE CASCADE,

  note TEXT DEFAULT '',
  added_at TIMESTAMPTZ DEFAULT NOW(),

  -- At least one event reference must be set
  CONSTRAINT group_event_has_ref CHECK (
    evenement_id IS NOT NULL OR user_event_id IS NOT NULL
  )
);

CREATE INDEX idx_group_events_group ON group_events (group_id);

-- ── Event votes ─────────────────────────────────────────────

CREATE TABLE event_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_event_id UUID NOT NULL REFERENCES group_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('interested', 'maybe', 'not_interested')),
  voted_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(group_event_id, user_id)
);

CREATE INDEX idx_event_votes_group_event ON event_votes (group_event_id);
CREATE INDEX idx_event_votes_user ON event_votes (user_id);

-- ── RLS ─────────────────────────────────────────────────────

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public groups readable"
  ON groups FOR SELECT
  USING (
    privacy = 'public'
    OR owner_id = auth.uid()
    OR id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated create groups"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner update group"
  ON groups FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owner delete group"
  ON groups FOR DELETE
  USING (auth.uid() = owner_id);

CREATE POLICY "Members read group_members"
  ON group_members FOR SELECT
  USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated join group"
  ON group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Self leave group"
  ON group_members FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin remove members"
  ON group_members FOR DELETE
  USING (
    group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Members read group_events"
  ON group_events FOR SELECT
  USING (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members add group_events"
  ON group_events FOR INSERT
  WITH CHECK (
    auth.uid() = added_by
    AND group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Adder or admin delete group_events"
  ON group_events FOR DELETE
  USING (
    auth.uid() = added_by
    OR group_id IN (
      SELECT group_id FROM group_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Members read votes"
  ON event_votes FOR SELECT
  USING (
    group_event_id IN (
      SELECT ge.id FROM group_events ge
      JOIN group_members gm ON gm.group_id = ge.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members cast vote"
  ON event_votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND group_event_id IN (
      SELECT ge.id FROM group_events ge
      JOIN group_members gm ON gm.group_id = ge.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Self update vote"
  ON event_votes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Self delete vote"
  ON event_votes FOR DELETE
  USING (auth.uid() = user_id);

-- ── Auto-add owner as admin member on group creation ────────

CREATE OR REPLACE FUNCTION auto_add_group_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_add_group_owner ON groups;
CREATE TRIGGER trg_auto_add_group_owner
  AFTER INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_group_owner();
