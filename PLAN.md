# Plan de développement — Lyon Night Guide

> Phases de développement, stack technique, structure du projet et roadmap.

---

## 1. Stack technique retenue

### 1.1 Frontend

| Technologie | Version | Rôle |
|-------------|---------|------|
| **Next.js** | 15+ (App Router) | Framework React, SSR/SSG, API Routes |
| **TypeScript** | 5.x | Typage statique |
| **Tailwind CSS** | 4.x | Styling utility-first |
| **shadcn/ui** | latest | Composants accessibles (Radix UI) |
| **Framer Motion** | 11+ | Animations et transitions |
| **Mapbox GL JS** | 3.x | Carte interactive |
| **Lucide React** | latest | Iconographie |

### 1.2 Backend & données

| Technologie | Rôle |
|-------------|------|
| **Supabase** | PostgreSQL + PostGIS + Auth + Storage |
| **pgvector** (extension Supabase) | Stockage des embeddings pour le RAG |
| **Meilisearch** (optionnel) | Recherche full-text rapide |

### 1.3 IA / Chatbot

| Technologie | Rôle |
|-------------|------|
| **LangChain.js** ou **Vercel AI SDK** | Orchestration RAG |
| **OpenAI API** (gpt-4o-mini) | LLM pour le chatbot |
| **OpenAI Embeddings** (text-embedding-3-small) | Vectorisation des fiches |

### 1.4 APIs externes

| API | Usage | Coût |
|-----|-------|------|
| **Yelp Fusion** | Notes, avis, photos | Gratuit (500 req/jour) |
| **Foursquare Places** | Catégories, tips, popularité | Gratuit (avec clé) |
| **Mapbox** | Carte, géocodage, directions | Gratuit jusqu'à 50k chargements/mois |
| **Nominatim (OSM)** | Géocodage fallback | Gratuit (1 req/s) |
| **Cloudinary** | Stockage et optimisation images | Gratuit (25 crédits/mois) |

### 1.5 Infra & déploiement

| Service | Rôle |
|---------|------|
| **Vercel** | Hébergement frontend + API Routes |
| **Supabase Cloud** | Base de données + auth + storage |
| **GitHub** | Versioning, CI/CD via GitHub Actions |

---

## 2. Structure du projet

```
bars_lyon/
├── data/                          # Données sources
│   ├── liste1.json                # Base manuelle (bars détaillés)
│   ├── liste2.json                # Base manuelle (clubs & cosy)
│   └── liste3.json                # Réservé
│
├── scripts/                       # Scripts utilitaires
│   ├── seed-database.ts           # Import JSON → Supabase
│   ├── geocode-addresses.ts       # Géocodage batch des adresses
│   ├── generate-embeddings.ts     # Génération des vecteurs RAG
│   └── fetch-external-data.ts     # Enrichissement via Yelp/Foursquare
│
├── app/                           # Next.js App Router
│   ├── layout.tsx                 # Layout racine (header, footer, providers)
│   ├── page.tsx                   # Page d'accueil (/)
│   ├── explorer/
│   │   └── page.tsx               # Catalogue filtré (/explorer)
│   ├── carte/
│   │   └── page.tsx               # Vue carte (/carte)
│   ├── lieu/
│   │   └── [slug]/
│   │       └── page.tsx           # Fiche détaillée (/lieu/:slug)
│   ├── comparer/
│   │   └── page.tsx               # Comparateur (/comparer)
│   ├── evenements/
│   │   └── page.tsx               # Événements (/evenements)
│   └── api/
│       ├── lieux/
│       │   └── route.ts           # GET /api/lieux (filtres, tri, pagination)
│       ├── lieux/[id]/
│       │   └── route.ts           # GET /api/lieux/:id
│       ├── search/
│       │   └── route.ts           # GET /api/search?q=
│       ├── events/
│       │   └── route.ts           # GET /api/events
│       └── chat/
│           └── route.ts           # POST /api/chat (chatbot RAG)
│
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── BottomNav.tsx          # Navigation mobile
│   │   └── Sidebar.tsx
│   ├── cards/
│   │   ├── LieuCard.tsx           # Card standard
│   │   ├── LieuMiniCard.tsx       # Card compacte (carte, chat)
│   │   └── EventCard.tsx          # Card événement
│   ├── filters/
│   │   ├── FilterPanel.tsx        # Panel de filtres complet
│   │   ├── FilterChips.tsx        # Chips de filtres actifs
│   │   ├── RadiusSlider.tsx       # Slider rayon géolocalisation
│   │   └── SortSelect.tsx         # Sélecteur de tri
│   ├── map/
│   │   ├── MapView.tsx            # Carte interactive
│   │   ├── MapMarker.tsx          # Marker personnalisé
│   │   └── MapPopup.tsx           # Popup au clic
│   ├── compare/
│   │   ├── CompareGrid.tsx        # Grille de comparaison
│   │   └── CompareSlot.tsx        # Slot individuel
│   ├── chat/
│   │   ├── ChatPanel.tsx          # Panel/modale chatbot
│   │   ├── ChatBubble.tsx         # Bulle de message
│   │   └── ChatSuggestions.tsx    # Chips de suggestions
│   └── shared/
│       ├── SearchBar.tsx
│       ├── RatingStars.tsx
│       ├── PriceRange.tsx
│       ├── MusicTags.tsx
│       ├── Badge.tsx
│       └── EmptyState.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Client Supabase (browser)
│   │   ├── server.ts              # Client Supabase (server)
│   │   └── types.ts               # Types générés depuis la DB
│   ├── api/
│   │   ├── yelp.ts                # Client Yelp Fusion API
│   │   ├── foursquare.ts          # Client Foursquare API
│   │   └── mapbox.ts              # Client Mapbox Geocoding
│   ├── rag/
│   │   ├── embeddings.ts          # Génération d'embeddings
│   │   ├── retriever.ts           # Recherche vectorielle
│   │   └── chain.ts               # Chaîne LangChain RAG
│   └── utils/
│       ├── geo.ts                 # Calculs de distance, bbox
│       ├── filters.ts             # Logique de filtrage
│       └── format.ts              # Formatage prix, note, adresse
│
├── hooks/
│   ├── useGeolocation.ts          # Hook géolocalisation navigateur
│   ├── useFilters.ts              # État des filtres (URL params)
│   ├── useCompare.ts              # État du comparateur
│   └── useDebounce.ts             # Debounce pour la recherche
│
├── types/
│   └── index.ts                   # Types globaux (Lieu, Evenement, etc.)
│
├── public/
│   ├── images/                    # Images statiques
│   └── icons/                     # Favicons, PWA icons
│
├── supabase/
│   └── migrations/                # Migrations SQL
│       ├── 001_create_lieux.sql
│       ├── 002_create_events.sql
│       ├── 003_enable_postgis.sql
│       └── 004_enable_pgvector.sql
│
├── docs/                          # Documentation projet
│   ├── CAHIER_DES_CHARGES.md
│   ├── UI_UX.md
│   └── PLAN.md
│
├── .env.local                     # Variables d'environnement (NON commité)
├── .env.example                   # Template des variables nécessaires
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 3. Schéma de base de données

### 3.1 Tables principales

```sql
-- Extension PostGIS pour les requêtes géospatiales
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;  -- pgvector pour RAG

-- Table principale des lieux
CREATE TABLE lieux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bar', 'club')),
  categorie TEXT NOT NULL,
  
  -- Localisation
  adresse TEXT NOT NULL,
  arrondissement TEXT,
  quartier TEXT,
  coordonnees GEOGRAPHY(POINT, 4326),  -- PostGIS
  
  -- Informations
  note NUMERIC(2,1) CHECK (note >= 0 AND note <= 5),
  gamme_prix TEXT,
  prix_pinte TEXT,
  style_musique TEXT[] DEFAULT '{}',
  specificites TEXT[] DEFAULT '{}',
  
  -- Contenu
  description TEXT,
  resume_avis TEXT,
  photos TEXT[] DEFAULT '{}',
  photo_cover TEXT,
  
  -- Contact
  site_web TEXT,
  instagram TEXT,
  telephone TEXT,
  
  -- Horaires (JSONB flexible)
  horaires JSONB,
  
  -- RAG
  embedding VECTOR(1536),  -- text-embedding-3-small
  
  -- Métadonnées
  sources TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index géospatial pour les recherches par rayon
CREATE INDEX idx_lieux_geo ON lieux USING GIST (coordonnees);

-- Index pour les filtres courants
CREATE INDEX idx_lieux_type ON lieux (type);
CREATE INDEX idx_lieux_arrondissement ON lieux (arrondissement);
CREATE INDEX idx_lieux_note ON lieux (note DESC);
CREATE INDEX idx_lieux_categorie ON lieux (categorie);

-- Index vectoriel pour le RAG
CREATE INDEX idx_lieux_embedding ON lieux USING ivfflat (embedding vector_cosine_ops);

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
```

### 3.2 Fonctions utilitaires

```sql
-- Recherche par rayon (km) autour d'un point
CREATE OR REPLACE FUNCTION lieux_dans_rayon(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  rayon_km DOUBLE PRECISION
)
RETURNS SETOF lieux AS $$
  SELECT *
  FROM lieux
  WHERE ST_DWithin(
    coordonnees,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    rayon_km * 1000  -- conversion km → m
  )
  ORDER BY ST_Distance(
    coordonnees,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  );
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
    id,
    nom,
    description,
    1 - (embedding <=> query_embedding) AS similarity
  FROM lieux
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql STABLE;
```

---

## 4. Variables d'environnement

```env
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...

# OpenAI (chatbot RAG)
OPENAI_API_KEY=sk-...

# Yelp Fusion
YELP_API_KEY=...

# Foursquare
FOURSQUARE_API_KEY=fsq3...

# Cloudinary (images)
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

---

## 5. Roadmap des phases

### Phase 0 — Setup & données (Semaine 1)

| Tâche | Détail |
|-------|--------|
| 0.1 | Initialiser le projet Next.js + TypeScript + Tailwind + shadcn/ui |
| 0.2 | Configurer Supabase (projet, tables, extensions PostGIS + pgvector) |
| 0.3 | Fusionner liste1.json + liste2.json en un format unifié |
| 0.4 | Script de géocodage batch (adresses → coordonnées lat/lng) |
| 0.5 | Script de seed : import des données dans Supabase |
| 0.6 | Générer les embeddings pour le RAG |
| 0.7 | Configurer les variables d'environnement |

**Livrable** : Base de données peuplée avec 80+ lieux géocodés et vectorisés.

---

### Phase 1 — Catalogue & filtres (Semaine 2)

| Tâche | Détail |
|-------|--------|
| 1.1 | Composant `LieuCard` (photo, nom, note, prix, musique, quartier) |
| 1.2 | Page `/explorer` avec grille responsive de cards |
| 1.3 | API Route `GET /api/lieux` (filtres, tri, pagination) |
| 1.4 | `FilterPanel` : genre musique, prix, arrondissement, note, spécificités |
| 1.5 | Filtres synchronisés avec les URL params (deep-linking) |
| 1.6 | Tri : par note, prix, nom, distance |
| 1.7 | `SearchBar` avec autocomplétion |
| 1.8 | Lazy loading images + placeholder blur |
| 1.9 | Layout racine : Header, Footer, BottomNav mobile |

**Livrable** : Page explorateur fonctionnelle avec tous les filtres.

---

### Phase 2 — Fiche détaillée & carte (Semaine 3)

| Tâche | Détail |
|-------|--------|
| 2.1 | Page `/lieu/[slug]` — galerie, description, infos, spécificités |
| 2.2 | Section "Résumé des avis" (données pré-générées) |
| 2.3 | Mini-carte Mapbox intégrée dans la fiche |
| 2.4 | Section "Lieux similaires" (même catégorie/quartier) |
| 2.5 | Page `/carte` — carte plein écran avec markers |
| 2.6 | Clustering des markers au zoom faible |
| 2.7 | Popup au clic sur marker (mini-card) |
| 2.8 | Sync liste latérale ↔ carte |
| 2.9 | Filtres intégrés sur la carte |

**Livrable** : Fiches complètes et carte interactive synchronisée.

---

### Phase 3 — Géolocalisation & comparateur (Semaine 4)

| Tâche | Détail |
|-------|--------|
| 3.1 | `useGeolocation` hook (permission, fallback adresse manuelle) |
| 3.2 | Champ adresse avec autocomplétion Mapbox/Nominatim |
| 3.3 | Slider rayon (0.5 — 10 km) |
| 3.4 | Visualisation du rayon sur la carte (cercle) |
| 3.5 | API Route avec filtre PostGIS `ST_DWithin` |
| 3.6 | Tri par distance (calculée côté serveur) |
| 3.7 | Page `/comparer` — grille de comparaison |
| 3.8 | Ajout/retrait de lieux au comparateur depuis les cards |
| 3.9 | Partage d'une comparaison via URL |

**Livrable** : Recherche géolocalisée + comparateur fonctionnel.

---

### Phase 4 — Chatbot RAG (Semaine 5)

| Tâche | Détail |
|-------|--------|
| 4.1 | Setup Vercel AI SDK ou LangChain.js |
| 4.2 | API Route `POST /api/chat` avec streaming |
| 4.3 | Retriever : recherche vectorielle dans pgvector |
| 4.4 | Prompt system avec contexte des lieux récupérés |
| 4.5 | Composant `ChatPanel` (desktop: sidebar, mobile: modale) |
| 4.6 | Suggestions rapides (chips prédéfinis) |
| 4.7 | Affichage des mini-cards dans les réponses |
| 4.8 | Fallback API Yelp quand données locales insuffisantes |
| 4.9 | Feedback 👍/👎 sur les réponses |

**Livrable** : Chatbot conversationnel fonctionnel avec recommandations.

---

### Phase 5 — Événements & accueil (Semaine 6)

| Tâche | Détail |
|-------|--------|
| 5.1 | Table `evenements` + API Route `GET /api/events` |
| 5.2 | Page `/evenements` avec filtres par date et type |
| 5.3 | `EventCard` composant |
| 5.4 | Section événements dans les fiches de lieux |
| 5.5 | Badge "Event ce soir" sur les cards de lieux |
| 5.6 | Page d'accueil `/` — hero, tendances, "ce soir", "près de toi" |
| 5.7 | SEO : JSON-LD, meta dynamiques, sitemap |
| 5.8 | Mode sombre par défaut + toggle mode clair |

**Livrable** : Site complet avec toutes les fonctionnalités .

---

### Phase 6 — Polish & production (Semaine 7)

| Tâche | Détail |
|-------|--------|
| 6.1 | Optimisation performances (Lighthouse ≥ 90) |
| 6.2 | Tests E2E des parcours utilisateurs clés |
| 6.3 | Tests unitaires des fonctions de filtrage et géo |
| 6.4 | Accessibilité : audit WCAG 2.1 AA |
| 6.5 | Responsive : test sur appareils réels |
| 6.6 | RGPD : bannière cookies, mentions légales |
| 6.7 | Déploiement sur Vercel + domaine custom |
| 6.8 | README, documentation développeur |*
| 6.9 | Monitoring : analytics Plausible, alertes erreurs |

**Livrable** : Site en production, performant et conforme.

---

### Phase 7 — Nice-to-have (Post-lancement)

| Priorité | Fonctionnalité |
|----------|----------------|
| 1 | Mode "Ce soir" (filtre rapide lieux ouverts + events) |
| 2 | Générateur de parcours de soirée |
| 3 | Favoris & listes personnalisées |
| 4 | Happy hours en temps réel |
| 5 | Avis utilisateurs (micro-avis) |
| 6 | Estimation budget soirée |
| 7 | Multi-langue FR/EN |
| 8 | PWA (installation mobile) |
| 9 | Notifications événements (push) |
| 10 | Intégration VTC/TCL |

---

## 6. Dépendances npm principales

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "@supabase/ssr": "^0.5.0",
    "mapbox-gl": "^3.0.0",
    "react-map-gl": "^7.0.0",
    "framer-motion": "^11.0.0",
    "ai": "^4.0.0",
    "@ai-sdk/openai": "^1.0.0",
    "lucide-react": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest",
    "date-fns": "^4.0.0",
    "zod": "^3.0.0",
    "nuqs": "^2.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "vitest": "^3.0.0",
    "@playwright/test": "^1.0.0"
  }
}
```

---

## 7. Commandes de développement

```bash
# Installation
npm install

# Développement local
npm run dev                    # http://localhost:3000

# Scripts de données
npx tsx scripts/seed-database.ts
npx tsx scripts/geocode-addresses.ts
npx tsx scripts/generate-embeddings.ts
npx tsx scripts/fetch-external-data.ts

# Tests
npm run test                   # Vitest (unitaires)
npm run test:e2e               # Playwright (E2E)
npm run test:coverage          # Couverture ≥ 80%

# Build & déploiement
npm run build                  # Build production
npm run lint                   # ESLint
npm run type-check             # Vérification TypeScript
vercel --prod                  # Déploiement
```

---

## 8. Résumé des livrables par phase

| Phase | Semaine | Livrable clé |
|-------|---------|-------------|
| 0 | S1 | DB peuplée, 80+ lieux géocodés + embeddings |
| 1 | S2 | Catalogue avec filtres et recherche |
| 2 | S3 | Fiches détaillées + carte interactive |
| 3 | S4 | Géolocalisation rayon + comparateur |
| 4 | S5 | Chatbot RAG fonctionnel |
| 5 | S6 | Événements + page d'accueil + SEO |
| 6 | S7 | Tests, perf, accessibilité, mise en prod |
| 7 | Post | Nice-to-have itératifs |

---

## 9. Améliorations Frontend (Mars 2026)

> Audit UI/UX complet et refonte par priorité.

### P0 - Critique (UX cassée)

#### 9.1 Fixer le Light Mode (CSS vars)
- **Fichier:** `app/src/app/globals.css`
- **Problème:** Les variables `:root` utilisent les defaults shadcn (noir/gris). `--primary` en light = noir au lieu d'orange #FF6B35.
- [ ] Corriger `--primary` -> orange adapté light
- [ ] Corriger `--accent` -> violet adapté light
- [ ] Corriger `--background`, `--card`, `--muted` pour fonds clairs harmonieux
- [ ] Corriger `--destructive`, `--ring`, `--border` pour contraste suffisant
- [ ] Tester toutes les pages en light mode

---

### P1 - Impact fort

#### 9.2 Hero Homepage avec gradient nightlife
- **Fichier:** `app/src/app/[locale]/page.tsx`
- [ ] Ajouter un gradient animé violet/orange en fond du hero
- [ ] Remplacer l'emoji 💸 par icône Lucide `Coins`
- [ ] Ajouter un CTA "Demande à l'IA" vers le chat
- [ ] Ajouter une section "Comment ça marche" (3 étapes)
- [ ] Corriger le lien "tonight" -> `/evenements` au lieu de `/explorer`

#### 9.3 Grid 2 colonnes mobile sur Explorer
- **Fichiers:** `app/src/app/[locale]/explorer/page.tsx`, `app/src/components/cards/LieuCard.tsx`
- [ ] Passer la grid de `grid-cols-1` à `grid-cols-2 xl:grid-cols-3`
- [ ] Adapter `LieuCard` pour être lisible en petite taille
- [ ] Ajouter un titre h1 avec compteur de résultats

#### 9.4 Bouton Partager fonctionnel (page lieu)
- **Fichier:** `app/src/app/[locale]/lieu/[slug]/page.tsx`
- [ ] Implémenter Web Share API (mobile) + fallback clipboard (desktop)
- [ ] Ajouter un bouton Favoris dans le hero
- [ ] Feedback visuel "Lien copié !"

---

### P2 - Fonctionnalités manquantes

#### 9.5 Bottom sheet carte sur mobile
- [ ] Transformer le panel en bottom sheet draggable sur mobile
- [ ] Ajouter un bouton "Ma position" proéminent
- [ ] Fixer le z-index des filtres vs panel

#### 9.6 Highlight meilleur dans Compare
- [ ] Ajouter des photos miniatures dans les headers
- [ ] Highlight fond vert/badge sur le meilleur de chaque ligne
- [ ] Vue cards empilées sur mobile au lieu du tableau

#### 9.7 Recherche sur événements
- [ ] Ajouter une barre de recherche debounced
- [ ] Ajouter un filtre par lieu/quartier
- [ ] Corriger le lien lieu dans EventCard (slug au lieu de l'ID)

#### 9.8 EventCard: utiliser Next/Image
- [ ] Remplacer `<img>` par `<Image>` avec `fill` + `sizes`

---

### P3 - Nice to have

#### 9.9 OAuth Google sur pages auth
#### 9.10 Section "Comment ça marche" homepage
#### 9.11 Galerie photo avec lightbox (lieu détail)
#### 9.12 Pagination enrichie (Explorer)
#### 9.13 BottomNav améliorée
#### 9.14 Empty states avec illustrations SVG

---

### Statut d'avancement frontend

| # | Tâche | Priorité | Statut |
|---|-------|----------|--------|
| 9.1 | Light mode CSS vars | P0 | Fait |
| 9.2 | Hero homepage gradient | P1 | Fait |
| 9.3 | Grid 2 cols mobile Explorer | P1 | Fait |
| 9.4 | Bouton Partager lieu | P1 | Fait |
| 9.5 | Bottom sheet carte mobile | P2 | Fait |
| 9.6 | Highlight Compare | P2 | Fait |
| 9.7 | Recherche événements | P2 | Fait |
| 9.8 | EventCard Next/Image | P2 | Fait |
| 9.9 | OAuth Google | P3 | Reporté (config Supabase requise) |
| 9.10 | Section comment ça marche | P3 | Fait |
| 9.11 | Galerie lightbox | P3 | Fait |
| 9.12 | Pagination enrichie | P3 | Fait |
| 9.13 | BottomNav améliorée | P3 | Fait |
| 9.14 | Empty states illustrations | P3 | Reporté (nécessite assets SVG) |
