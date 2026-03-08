# 🦁 Lyon Night Guide

Guide interactif de la vie nocturne lyonnaise — bars, clubs, concerts et soirées à Lyon.

> **Stack** : Next.js 16 · TypeScript · Tailwind v4 · shadcn/ui · Mapbox · OpenAI · Supabase

---

## ✨ Fonctionnalités

| Feature | Détail |
|---------|--------|
| 🗺️ interactive | Mapbox GL JS avec clustering, dark mode, géolocalisation |
| 🔍 Filtres avancés | Type, quartier, distance, note, ambiance, prix |
| 🎉 Événements | Concerts et soirées à venir par établissement |
| 🤖 Chatbot IA | RAG avec OpenAI GPT-4o — suggestions personnalisées |
| ⚖️ Comparateur | Comparer jusqu'à 4 établissements côte à côte |
| 🌍 i18n | Français (défaut) + Anglais via next-intl |
| 🌙 Thème | Clair / Sombre via ThemeProvider |
| 📱 PWA-ready | BottomNav mobile, responsive first |

---

## 🚀 Démarrage rapide

```bash
# Prérequis : Node.js 20+

cd app
npm ci
cp .env.local.example .env.local   # Renseigner les clés API
npm run dev
```

Le site est disponible sur [http://localhost:3000](http://localhost:3000).

---

## 🔑 Variables d'environnement

Copier `.env.local.example` → `.env.local` et renseigner :

| Variable | Requis | Description |
|----------|--------|-------------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | ✅ | Token public Mapbox GL JS |
| `OPENAI_API_KEY` | ✅ | Clé API OpenAI (GPT-4o) |
| `YELP_API_KEY` | ⚠️ | Clé Yelp Fusion (enrichissement données) |
| `NEXT_PUBLIC_SUPABASE_URL` | ⚠️ | URL projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⚠️ | Clé anon Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ | Clé service Supabase (API routes) |

> ⚠️ = optionnel pour le dev local, requis en production

---

## 📁 Structure du projet

```
bars_lyon/
├── app/                          # Application Next.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── [locale]/        # Routes FR/EN
│   │   │   │   ├── page.tsx     # Accueil
│   │   │   │   ├── explorer/    # Carte + filtres
│   │   │   │   ├── lieu/[slug]/ # Fiche établissement
│   │   │   │   ├── evenements/  # Agenda
│   │   │   │   ├── comparateur/ # Comparateur
│   │   │   │   └── mentions-legales/
│   │   │   └── api/
│   │   │       ├── lieux/       # REST API établissements
│   │   │       ├── events/      # REST API événements
│   │   │       └── chat/        # Chat IA (streaming)
│   │   ├── components/
│   │   │   ├── layout/          # Header, Footer, BottomNav
│   │   │   ├── cards/           # LieuCard, EventCard, LieuEvents
│   │   │   ├── map/             # MapView, MapMarker, Cluster
│   │   │   ├── chat/            # ChatPanel, ChatMessage
│   │   │   ├── filters/         # FilterBar, FilterSheet
│   │   │   └── shared/          # ThemeProvider, CookieBanner, JsonLd…
│   │   └── lib/
│   │       ├── utils/geo.ts     # Haversine distance
│   │       └── hooks/           # useFilters, useGeolocation…
│   ├── vitest.config.ts
│   └── vercel.json
├── data/
│   ├── merged-geocoded.json     # 183 établissements géocodés
│   └── events.json              # 20 événements sample
└── scripts/                     # Pipeline de collecte de données
```

---

## 🧪 Tests

```bash
# Tests unitaires (Vitest)
npm test

# Mode watch
npm run test:watch
```

Tests disponibles :
- `src/lib/utils/geo.test.ts` — fonctions Haversine

---

## 🏗️ Build & déploiement

```bash
# Build de production
npm run build

# Démarrer le serveur de production
npm start
```

### Déploiement sur Vercel

1. Connecter le repo GitHub à Vercel
2. Définir le **Root Directory** : `app/`
3. Renseigner les variables d'environnement dans le dashboard Vercel
4. Vercel détecte automatiquement Next.js — pas de config supplémentaire

---

## 🗃️ Pipeline données

Les données sont dans `data/merged-geocoded.json` (183 établissements lyonnais) :

```bash
# (Optionnel) Ré-exécuter le scraping/géocodage
cd scripts
python scrape.py      # Collecte depuis sources publiques
python geocode.py     # Géocodage via Google Maps API
python merge.py       # Fusion et déduplication
```

---

## 🤝 Contribuer

Ce projet est personnel. Pour signaler une erreur sur un établissement ou demander son retrait, ouvrir une issue GitHub.

---

## 📜 Licence

Usage personnel. Voir [Mentions légales](./app/src/app/%5Blocale%5D/mentions-legales/page.tsx).
