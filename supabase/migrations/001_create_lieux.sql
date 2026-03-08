-- Extension PostGIS pour les requêtes géospatiales
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector; -- pgvector pour RAG

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
