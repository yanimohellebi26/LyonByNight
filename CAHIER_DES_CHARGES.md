# Cahier des Charges — Lyon Night Guide

> Guide complet de la vie nocturne lyonnaise : bars, clubs, événements, recommandations personnalisées.

---

## 1. Présentation du projet

### 1.1 Contexte

Lyon dispose d'une scène nightlife riche et diversifiée — bars à cocktails, clubs techno, péniches, pubs, bars à jeux, bars à vins, bars LGBT+ — mais il n'existe aucune plateforme unique qui centralise, filtre et compare ces lieux de manière moderne et interactive.

### 1.2 Objectif

Créer une **application web responsive** servant de guide de référence de la vie nocturne lyonnaise, permettant aux utilisateurs de :

- Découvrir bars et clubs via des filtres avancés
- Visualiser les lieux sur une carte interactive
- Comparer des établissements côte à côte
- Trouver les lieux les plus proches de leur position
- Consulter les événements spéciaux à venir
- Obtenir des recommandations personnalisées via un chatbot IA

### 1.3 Cible

- **Primaire** : 18-35 ans, résidents lyonnais ou visiteurs, cherchant un bar/club pour sortir
- **Secondaire** : Touristes francophones/anglophones, organisateurs d'événements, groupes d'amis

### 1.4 Nom du projet

**Lyon Night Guide** (nom de travail)

---

## 2. Périmètre fonctionnel

### 2.1 Fonctionnalités essentielles (MVP)

| ID | Fonctionnalité | Priorité |
|----|----------------|----------|
| F01 | **Catalogue de lieux** — Affichage en grille de cards (bars + clubs) avec photo, nom, note, prix, style musique, quartier | P0 |
| F02 | **Filtres avancés** — Genre musical, gamme de prix, arrondissement, type (bar/club), spécificités (terrasse, LGBTQ+, jeux, etc.), note minimale | P0 |
| F03 | **Tri** — Par prix (croissant/décroissant), par note, par nom, par distance | P0 |
| F04 | **Recherche géolocalisée** — Saisie d'adresse + rayon en km → affichage des lieux les plus proches | P0 |
| F05 | **Carte interactive** — Visualisation de tous les lieux filtrés sur une carte (Mapbox/Leaflet) avec markers cliquables | P0 |
| F06 | **Fiche détaillée** — Page/modale par lieu : photos, description complète, avis résumé, horaires, adresse, lien web, événements | P0 |
| F07 | **Comparateur** — Sélection de 2 à 4 lieux et comparaison côte à côte (prix, note, musique, spécificités) | P1 |
| F08 | **Événements spéciaux** — Section dédiée ou badge sur les cards pour les soirées/concerts/DJ sets à venir | P1 |
| F09 | **Chatbot IA (RAG)** — Assistant conversationnel alimenté par toutes les données du site + API externe pour enrichir les réponses | P1 |
| F10 | **Résumé d'avis** — Synthèse automatique des avis (positifs/négatifs) par lieu | P1 |

### 2.2 Fonctionnalités Nice-to-Have

| ID | Fonctionnalité | Description |
|----|----------------|-------------|
| N01 | **Parcours de soirée** | Générateur de parcours (3-4 lieux enchaînés) selon ambiance souhaitée, budget et localisation — ex: "Soirée techno Presqu'île à moins de 30€" |
| N02 | **Mode "Ce soir"** | Filtre rapide qui affiche uniquement les lieux ouverts maintenant + événements du soir même |
| N03 | **Favoris & listes** | Création de listes personnalisées ("Mes bars préférés", "À tester") avec compte utilisateur optionnel |
| N04 | **Partage social** | Partage d'un lieu ou d'un parcours via lien, QR code, ou story Instagram |
| N05 | **Avis utilisateurs** | Permettre aux utilisateurs de laisser leur propre micro-avis (note + 280 caractères) |
| N06 | **Mode sombre / clair** | Thème adapté à l'utilisation nocturne (mode sombre par défaut) |
| N07 | **Système de badges** | Badges de découverte ("10 bars visités", "Amateur de cocktails", "Noctambule") |
| N08 | **Estimation budget soirée** | Calculateur : nombre de personnes × consommations estimées × transport |
| N09 | **Intégration VTC/transport** | Lien direct vers Uber/Bolt/TCL pour le trajet retour |
| N10 | **Notifications événements** | Alerte push/email pour les événements dans ses lieux favoris |
| N11 | **Météo intégrée** | Affichage météo du soir pour privilégier terrasses ou lieux couverts |
| N12 | **Multi-langue** | Support FR / EN pour les touristes |
| N13 | **Happy Hours en temps réel** | Indicateur visuel des happy hours en cours ou à venir |
| N14 | **Playlist associée** | Lien Spotify/Deezer vers une playlist représentative de l'ambiance du lieu |
| N15 | **Accessibilité PMR** | Filtre et badge pour les lieux accessibles aux personnes à mobilité réduite |
| N16 | **Galerie photo communautaire** | Les utilisateurs peuvent ajouter leurs propres photos d'ambiance |

---

## 3. Modèle de données

### 3.1 Schéma principal — `Lieu`

```typescript
interface Lieu {
  id: string;                    // UUID
  nom: string;
  slug: string;                  // URL-friendly
  type: "bar" | "club";
  categorie: string;             // "Cocktail", "Péniche", "Pub", "Bar à jeux"...
  
  // Localisation
  adresse: string;
  arrondissement: string;        // "Lyon 1" ... "Lyon 9", "Villeurbanne"
  coordonnees: {
    lat: number;
    lng: number;
  };
  quartier?: string;             // "Presqu'île", "Vieux Lyon", "Pentes"...
  
  // Informations clés
  note: number | null;           // 0-5
  gamme_prix: string;            // "€", "€€", "€€€" ou "2-10€"
  prix_pinte?: string;           // "5.00 €"
  style_musique: string[];       // ["Techno", "House", "Electro"]
  specificites: string[];        // ["Terrasse", "LGBTQ+ friendly", "Jeux"]
  
  // Contenu riche
  description: string;           // Texte descriptif éditorial
  resume_avis: string;           // Synthèse des avis (générée)
  photos: string[];              // URLs des images
  photo_cover: string;           // Image principale
  
  // Métadonnées
  site_web?: string;
  instagram?: string;
  telephone?: string;
  horaires?: Horaires;
  capacite?: number;
  
  // Données dynamiques
  evenements: Evenement[];
  happy_hours?: HappyHour;
  
  // Source & traçabilité
  sources: string[];             // ["manuel", "yelp_api", "foursquare"]
  date_maj: string;              // ISO date
}
```

### 3.2 Schéma `Evenement`

```typescript
interface Evenement {
  id: string;
  lieu_id: string;
  titre: string;
  description: string;
  date: string;                  // ISO date
  heure_debut: string;
  heure_fin?: string;
  type: "concert" | "dj_set" | "soiree_theme" | "quiz" | "autre";
  prix_entree?: string;
  artiste?: string;
  image?: string;
}
```

### 3.3 Schéma `HappyHour`

```typescript
interface HappyHour {
  jours: string[];               // ["lundi", "mardi"...]
  heure_debut: string;           // "17:00"
  heure_fin: string;             // "20:00"
  offre: string;                 // "-50% sur les pintes"
}
```

---

## 4. Architecture technique

### 4.1 Stack recommandé

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| **Frontend** | Next.js 14+ (App Router) + TypeScript | SSR/SSG, excellent SEO, React ecosystem |
| **Styling** | Tailwind CSS + shadcn/ui | Design system rapide, mode sombre natif |
| **Carte** | Mapbox GL JS ou Leaflet + OpenStreetMap | Carte interactive, géocodage, clustering |
| **Géocodage** | API Nominatim (OSM) ou Mapbox Geocoding | Conversion adresse → coordonnées |
| **Backend API** | Next.js API Routes ou FastAPI (Python) | Endpoints REST pour filtres, recherche, chatbot |
| **Base de données** | Supabase (PostgreSQL + PostGIS) | Requêtes géospatiales, real-time, auth |
| **Recherche** | PostgreSQL Full-Text Search ou Meilisearch | Recherche rapide sur noms, descriptions |
| **Chatbot RAG** | LangChain + OpenAI API (ou Anthropic) | RAG sur la base de données des lieux |
| **Vector Store** | Supabase pgvector ou Pinecone | Embeddings pour le RAG |
| **Hébergement** | Vercel (frontend) + Supabase (backend) | Déploiement simple, scalable |
| **Images** | Cloudinary ou Vercel Blob | Optimisation et CDN images |
| **Analytics** | Plausible ou PostHog | Respect RGPD, données d'usage |

### 4.2 Diagramme d'architecture simplifié

```
┌─────────────────────────────────────────────────────┐
│                    UTILISATEUR                       │
│              (Mobile / Desktop / Tablet)             │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              NEXT.JS (App Router)                    │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐  │
│  │  Pages   │ │  Filtres │ │  Carte  │ │Chatbot │  │
│  │  SSR/SSG │ │  Client  │ │ Mapbox  │ │  RAG   │  │
│  └──────────┘ └──────────┘ └─────────┘ └────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                  API ROUTES                          │
│  /api/lieux  /api/search  /api/chat  /api/events    │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   ┌────────────┐ ┌─────────┐ ┌──────────┐
   │  Supabase  │ │pgvector │ │ APIs ext │
   │ PostgreSQL │ │embeddings│ │Yelp, 4SQ │
   │  + PostGIS │ │  (RAG)  │ │ Mapbox   │
   └────────────┘ └─────────┘ └──────────┘
```

### 4.3 Sources de données

| Source | Usage | Légalité |
|--------|-------|----------|
| **Données manuelles** (liste1.json, liste2.json) | Base principale | ✅ OK |
| **Yelp Fusion API** | Notes, catégories, photos | ✅ API officielle (500 req/jour gratuit) |
| **Foursquare Places API** | Catégories, popularité, tips | ✅ API officielle (gratuit) |
| **OpenStreetMap / Nominatim** | Géocodage des adresses | ✅ Données libres ODbL |
| **CityCrunch** | Articles, événements | ✅ robots.txt autorise |
| **Privateaser** | Fiches de lieux (page 1) | ⚠️ Limité au robots.txt |
| **Instagram Embed** | Photos d'ambiance (embed officiel) | ✅ Embed API officielle |

---

## 5. Chatbot IA — Spécifications

### 5.1 Architecture RAG

```
Question utilisateur
        │
        ▼
┌───────────────┐
│   Embedding   │ ──→ Recherche vectorielle dans pgvector
│   du query    │         │
└───────────────┘         ▼
                   ┌──────────────┐
                   │  Top-K lieux │ (contexte pertinent)
                   │  + metadata  │
                   └──────┬───────┘
                          │
                          ▼
                   ┌──────────────┐
                   │   LLM (GPT   │ ──→ Réponse naturelle
                   │   / Claude)  │     avec recommandations
                   └──────────────┘
```

### 5.2 Cas d'usage du chatbot

| Cas | Exemple de question | Comportement attendu |
|-----|---------------------|----------------------|
| Recommandation | "Je veux un bar techno pas cher dans le 1er" | Recherche RAG → top 3 résultats avec justification |
| Comparaison | "Différence entre Le Petit Salon et Le Sucre ?" | Récupère les 2 fiches, compare point par point |
| Événement | "Qu'est-ce qui se passe ce soir ?" | Recherche événements du jour → liste formatée |
| Parcours | "Propose-moi un parcours de soirée latino" | Génère un itinéraire de 3-4 lieux cohérents |
| Info pratique | "Le Ninkasi Gerland a une terrasse ?" | Recherche fiche → réponse factuelle |
| Découverte | "Quel bar original pour un anniversaire ?" | RAG + logique de recommandation créative |

### 5.3 Enrichissement via API externe

Quand le chatbot ne trouve pas assez d'infos dans la base locale :
1. Appel à l'API Yelp Fusion pour données complémentaires
2. Recherche web (optionnel, via Tavily ou Perplexity API)
3. Le chatbot indique clairement la source des infos

---

## 6. Contraintes

### 6.1 Performance

- **First Contentful Paint** < 1.5s
- **Largest Contentful Paint** < 2.5s
- **Time to Interactive** < 3s
- Pagination ou infinite scroll pour les listes longues (20 items/page)
- Lazy loading des images
- Cache agressif pour les données statiques

### 6.2 Responsive

- **Mobile-first** : 100% des fonctionnalités accessibles sur mobile
- Breakpoints : 375px (mobile) / 768px (tablet) / 1280px (desktop)
- La carte doit être utilisable tactile

### 6.3 Accessibilité

- WCAG 2.1 niveau AA
- Navigation clavier complète
- Labels ARIA sur les filtres et la carte
- Contraste suffisant (mode sombre inclus)

### 6.4 SEO

- SSR/SSG pour les fiches de lieux (indexables)
- URLs propres : `/lieu/le-sucre`, `/carte`, `/evenements`
- JSON-LD (LocalBusiness schema) sur chaque fiche
- Sitemap et meta descriptions dynamiques

### 6.5 RGPD / Légal

- Pas de cookies de tracking sans consentement
- Géolocalisation uniquement sur opt-in explicite
- Mentions légales et politique de confidentialité
- Sources de données créditées

---

## 7. KPI de succès

| Métrique | Objectif |
|----------|----------|
| Lieux référencés au lancement | ≥ 80 |
| Temps moyen de session | > 3 min |
| Taux d'utilisation des filtres | > 40% des sessions |
| Taux d'interaction chatbot | > 15% des sessions |
| Score Lighthouse mobile | ≥ 90 |
| Taux de rebond | < 40% |

---

## 8. Limites et risques

| Risque | Impact | Mitigation |
|--------|--------|-----------|
| Données obsolètes (fermetures, changements) | Haut | Pipeline de mise à jour mensuel + signalement utilisateur |
| Dépassement quota API (Yelp/Foursquare) | Moyen | Cache, batch nocturne, monitoring quotas |
| Coût hébergement LLM (chatbot) | Moyen | Cache des réponses fréquentes, modèle léger pour questions simples |
| Qualité des photos | Moyen | Fallback sur photo par défaut stylisée, incitation upload communautaire |
| Scraping détecté / bloqué | Bas | S'appuyer uniquement sur APIs officielles + données manuelles |
