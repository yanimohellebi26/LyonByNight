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
