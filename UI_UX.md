# UI/UX — Lyon Night Guide

> Description détaillée de l'interface utilisateur, des écrans, du design system et des parcours utilisateurs.

---

## 1. Philosophie de design

### 1.1 Principes directeurs

| Principe | Détail |
|----------|--------|
| **Dark-first** | Mode sombre par défaut — l'app est pensée pour être utilisée le soir. Fond noir profond (#0A0A0A) avec accents lumineux. |
| **Visuellement immersif** | Les photos d'ambiance dominent. Chaque card fait envie avant même de lire le texte. |
| **Rapide à scanner** | Informations clés visibles en un coup d'œil (note, prix, musique, distance). |
| **Mobile-first** | 70%+ du trafic attendu sur mobile. Chaque composant est conçu pour le pouce. |
| **Fun & vivant** | Micro-animations, gradients subtils, transitions fluides. L'app doit refléter l'énergie de la nuit lyonnaise. |

### 1.2 Identité visuelle

```
Palette principale :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
│  #0A0A0A  │  Fond principal (noir profond)    │
│  #141414  │  Surfaces élevées (cards, modals) │
│  #1E1E1E  │  Bords, séparateurs              │
│  #FFFFFF  │  Texte principal                  │
│  #A0A0A0  │  Texte secondaire                │
│  #FF6B35  │  Accent primaire (orange vif)     │
│  #FF3366  │  Accent secondaire (rose/red)     │
│  #7C3AED  │  Accent tertiaire (violet)        │
│  #10B981  │  Succès / ouvert / disponible     │
│  #F59E0B  │  Warning / happy hour en cours    │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Typographie :
- Titres : Inter Bold ou Satoshi Bold
- Corps : Inter Regular
- Monospace (prix) : JetBrains Mono

Iconographie :
- Lucide Icons (cohérent, léger, open source)
- Emojis pour les catégories (🍸 🎵 🎮 🏳️‍🌈 ⛵ 🍺 🍷)
```

### 1.3 Mode clair (optionnel)

Même architecture, palette inversée :
- Fond : `#FAFAFA`, surfaces : `#FFFFFF`, texte : `#111111`
- Accents conservés identiques
- Toggle dans le header

---

## 2. Structure des pages

### 2.1 Arborescence

```
/                          → Page d'accueil (hero + highlights)
/explorer                  → Catalogue avec filtres + grille
/carte                     → Vue carte plein écran
/lieu/:slug                → Fiche détaillée d'un lieu
/comparer                  → Comparateur (2-4 lieux)
/evenements                → Calendrier des événements
/parcours                  → Générateur de parcours (Nice-to-have)
/a-propos                  → À propos, mentions légales
```

### 2.2 Navigation

**Header sticky (mobile + desktop)** :
```
┌───────────────────────────────────────────────────┐
│  🌙 Lyon Night Guide     🔍  📍  💬  🌐FR  ☰    │
└───────────────────────────────────────────────────┘
       Logo/Nom         Search Geo Chat Lang Menu
```

**Bottom navigation (mobile uniquement)** :
```
┌─────────────────────────────────────────────┐
│  🏠 Accueil  🔍 Explorer  🗺 Carte  💬 Chat │
└─────────────────────────────────────────────┘
```

**Sidebar navigation (desktop)** : Menu latéral rétractable avec les sections.

### 2.3 Sélecteur de langue

L'application est disponible en **français** (par défaut) et **anglais**, avec possibilité d'ajouter d'autres langues ultérieurement.

**Composant `LanguageSwitcher`** :

```
 Desktop : dropdown dans le header
 ┌──────────┐
 │ 🌐 FR ▾  │
 └──────────┘
     │
     ▼
 ┌──────────┐
 │ 🇫🇷 FR   │  ← actif (highlight accent)
 │ 🇬🇧 EN   │
 │ 🇪🇸 ES   │  ← grisé "bientôt"
 └──────────┘

 Mobile : même dropdown, accessible via le header
 ou dans le menu ☰ hamburger
```

#### Comportement

- **Détection automatique** : la langue du navigateur est détectée au premier chargement (header `Accept-Language`). Si `en`, l'interface bascule en anglais ; sinon français par défaut.
- **Persistance** : le choix est sauvegardé en `localStorage` et respecté aux visites suivantes.
- **URL localisées** : les slugs restent identiques (`/lieu/le-sucre`), seul le contenu textuel de l'interface change.
- **Transition** : le changement de langue est instantané (pas de rechargement de page), les textes morphent avec une transition fade de 150ms.
- **Contenu des fiches** : les descriptions des lieux restent en français (données source), mais les labels d'interface, filtres, boutons, chatbot et textes système sont traduits.
- **Chatbot bilingue** : le chatbot détecte la langue de l'utilisateur et répond dans la même langue.

#### Éléments traduits

| Élément | Exemple FR | Exemple EN |
|---------|-----------|------------|
| Barre de recherche | "Rechercher un bar..." | "Search for a bar..." |
| Filtres | "Genre musique", "Gamme de prix" | "Music genre", "Price range" |
| Boutons | "Voir la fiche", "Comparer" | "View details", "Compare" |
| Cards | "ouvert", "fermé", labels | "open", "closed", labels |
| Chatbot | Suggestions & réponses | Suggestions & responses |
| Navigation | "Accueil", "Explorer", "Carte" | "Home", "Explore", "Map" |
| États vides | "Aucun résultat..." | "No results found..." |
| Pages légales | Mentions légales | Legal notice |

#### Implémentation technique

- **Librairie** : `next-intl` (intégré à Next.js App Router)
- **Fichiers de traduction** : `messages/fr.json` et `messages/en.json`
- **Structure** : namespaces par section (`common`, `explorer`, `chat`, `events`, etc.)

---

## 3. Écrans détaillés

### 3.1 Page d'accueil — `/`

#### Layout

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              🌙 LYON NIGHT GUIDE                        │
│                                                         │
│    "Trouve ton bar idéal à Lyon, ce soir."              │
│                                                         │
│    ┌──────────────────────────────────────────────┐     │
│    │ 🔍 Rechercher un bar, un style, un quartier… │     │
│    └──────────────────────────────────────────────┘     │
│                                                         │
│    [Cocktails]  [Clubs]  [Péniches]  [Bars à jeux]     │
│    [LGBTQ+]  [Bières craft]  [Vins]  [Cosy]            │
│                                                         │
│  ─── Photo de fond (skyline Lyon nuit, floue) ───       │
└─────────────────────────────────────────────────────────┘
│                                                         │
│  🔥 TENDANCES DU MOMENT                                │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │
│  │ Card 1 │ │ Card 2 │ │ Card 3 │ │ Card 4 │  (scroll) │
│  └────────┘ └────────┘ └────────┘ └────────┘           │
│                                                         │
│  🎉 CE SOIR À LYON                                     │
│  ┌─────────────────────────────────────────────┐        │
│  │ EventCard 1 — DJ Set @ Le Petit Salon 22h   │        │
│  │ EventCard 2 — Quiz Night @ L'Atenium 20h30  │        │
│  └─────────────────────────────────────────────┘        │
│                                                         │
│  📍 PRÈS DE CHEZ TOI                                    │
│  [Activer la géolocalisation →]                         │
│  ┌────────┐ ┌────────┐ ┌────────┐                      │
│  │ Card   │ │ Card   │ │ Card   │  (après opt-in)      │
│  └────────┘ └────────┘ └────────┘                      │
└─────────────────────────────────────────────────────────┘
```

#### Comportement

- Hero avec image de fond plein écran (skyline Lyon de nuit) + overlay gradient noir
- Barre de recherche proéminente avec autocomplétion
- Chips de catégories rapides (cliquables → redirigent vers `/explorer?categorie=X`)
- Carrousel horizontal de cards "Tendances" (basé sur les meilleures notes + popularité)
- Section "Ce soir" : événements du jour triés par heure
- Section "Près de chez toi" : apparaît après activation géolocalisation

---

### 3.2 Explorateur — `/explorer`

#### Layout desktop

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
├────────────────────┬────────────────────────────────────────┤
│                    │                                        │
│   FILTRES (sticky) │   RÉSULTATS                            │
│                    │                                        │
│ ── Genre musique   │   "48 lieux trouvés"   [Grille│Liste] │
│ □ Techno/Electro   │   Tri: [Note ▾]  [Prix ▴]  [Distance] │
│ □ Latino           │                                        │
│ □ Rock/Indie       │   ┌────────┐ ┌────────┐ ┌────────┐    │
│ □ Jazz/Soul        │   │        │ │        │ │        │    │
│ □ Variété          │   │ Card 1 │ │ Card 2 │ │ Card 3 │    │
│ □ Mixte            │   │        │ │        │ │        │    │
│                    │   └────────┘ └────────┘ └────────┘    │
│ ── Gamme de prix   │   ┌────────┐ ┌────────┐ ┌────────┐    │
│ [€] [€€] [€€€]    │   │        │ │        │ │        │    │
│                    │   │ Card 4 │ │ Card 5 │ │ Card 6 │    │
│ ── Arrondissement  │   │        │ │        │ │        │    │
│ □ Lyon 1           │   └────────┘ └────────┘ └────────┘    │
│ □ Lyon 2           │                                        │
│ □ Lyon 3           │   [Charger plus →]                     │
│ ...                │                                        │
│                    │                                        │
│ ── Note minimale   │                                        │
│ ★★★★☆ et plus      │                                        │
│                    │                                        │
│ ── Spécificités    │                                        │
│ □ Terrasse         │                                        │
│ □ Happy Hour       │                                        │
│ □ LGBTQ+ friendly  │                                        │
│ □ Jeux de société  │                                        │
│ □ Cocktails        │                                        │
│ □ Dancefloor       │                                        │
│                    │                                        │
│ ── Géolocalisation │                                        │
│ [📍 Mon adresse  ] │                                        │
│ Rayon: ○──●──○ 2km │                                        │
│                    │                                        │
│ [Réinitialiser]    │                                        │
├────────────────────┴────────────────────────────────────────┤
│ FOOTER                                                       │
└─────────────────────────────────────────────────────────────┘
```

#### Layout mobile

```
┌──────────────────────────┐
│ HEADER                    │
├──────────────────────────┤
│ 🔍 Rechercher...          │
│ [Filtres ▾]  Tri: [Note▾] │
├──────────────────────────┤
│                          │
│ ┌──────────────────────┐ │
│ │     PHOTO             │ │
│ │                      │ │
│ │  ♫ Techno    ★ 4.5   │ │
│ │  Le Petit Salon      │ │
│ │  €€  ·  Lyon 1       │ │
│ │  [♡]  [⚖ Comparer]   │ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │     PHOTO             │ │
│ │                      │ │
│ │  ♫ Latino    ★ 4.2   │ │
│ │  Calle Latino        │ │
│ │  €   ·  Lyon 2       │ │
│ │  [♡]  [⚖ Comparer]   │ │
│ └──────────────────────┘ │
│                          │
│  ... (infinite scroll)   │
├──────────────────────────┤
│ 🏠  🔍  🗺  💬           │
└──────────────────────────┘
```

#### Filtres mobile

Panneau coulissant (sheet bottom-up) avec les mêmes filtres que la sidebar desktop :

```
┌──────────────────────────┐
│  ─── (handle)            │
│                          │
│  FILTRES     [Réinit.]   │
│                          │
│  Genre musique           │
│  [Techno] [Latino] [Rock]│
│  [Jazz] [Variété] [Mix]  │
│                          │
│  Gamme de prix           │
│  [€] [€€] [€€€]         │
│                          │
│  Arrondissement          │
│  [Lyon 1▾]               │
│                          │
│  Note minimale           │
│  ★★★★☆ et plus           │
│                          │
│  📍 Géolocalisation      │
│  [Mon adresse...       ] │
│  Rayon: ○──●──○ 2km      │
│                          │
│  [Appliquer (48 résult.)]│
└──────────────────────────┘
```

---

### 3.3 Card d'un lieu

#### Composant Card (grille)

```
┌──────────────────────────────┐
│                              │
│     📸 PHOTO D'AMBIANCE      │  ← Aspect ratio 16:9
│                              │  ← Badge "OUVERT" ou "🎉 Event ce soir"
│     [♡ Favori]               │  ← En haut à droite
│                              │
├──────────────────────────────┤
│                              │
│  ♫ Techno / Electro         │  ← Tags musique (couleur accent)
│                              │
│  Le Petit Salon              │  ← Nom (bold, 18px)
│  ★★★★☆ 4.5  ·  €€           │  ← Note + prix
│                              │
│  📍 Lyon 1 — Presqu'île     │  ← Arrondissement + quartier
│  📏 850m                    │  ← Distance (si géoloc. active)
│                              │
│  "Ambiance club selecte,    │  ← Extrait description (2 lignes)
│   excellent son..."          │
│                              │
│  [Voir ↗]  [⚖ Comparer +]   │  ← Actions
│                              │
└──────────────────────────────┘
```

#### Design tokens de la card

- Fond : `#141414`, bordure : `1px solid #1E1E1E`
- Border-radius : `16px`
- Ombre : `0 4px 24px rgba(0,0,0,0.4)`
- Hover (desktop) : scale(1.02) + ombre accentuée + bordure `#FF6B35` subtile
- Transition : `all 300ms ease`
- Photo : lazy-loaded, placeholder blur

---

### 3.4 Fiche détaillée — `/lieu/:slug`

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   📸 GALERIE PHOTOS (carrousel plein écran)              │
│   ← →                                  [1/5]           │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ♫ Techno · Electro · House                             │
│                                                         │
│  Le Petit Salon                          ★★★★☆ 4.5     │
│  ──────────────────────                                 │
│  📍 1 Rue de la République, Lyon 1                      │
│  💰 €€ · Pinte ~6€                                     │
│  🕐 Ven-Sam : 22h-5h                                   │
│  🌐 lepetitsalon.fr  ·  📸 @lepetitsalon               │
│                                                         │
│  [🗺 Voir sur la carte]  [♡ Favoris]  [↗ Partager]     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📝 DESCRIPTION                                         │
│  ─────────────                                          │
│  Le Petit Salon est un lieu incontournable de la        │
│  nuit lyonnaise. Situé en plein cœur de la Presqu'île,  │
│  ce club sélect propose une programmation techno et     │
│  house pointue dans un cadre intimiste et soigné...     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  💬 RÉSUMÉ DES AVIS                                     │
│  ─────────────────                                      │
│  ┌─────────────────────────────────────────────┐        │
│  │  👍 Points forts         👎 Points faibles   │        │
│  │  · Ambiance unique       · Sélection porte   │        │
│  │  · Son de qualité        · Prix élevés       │        │
│  │  · Cocktails excellents  · Bondé le samedi   │        │
│  └─────────────────────────────────────────────┘        │
│                                                         │
│  Basé sur 127 avis — Sources : Yelp, Google             │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✨ SPÉCIFICITÉS                                        │
│  ───────────────                                        │
│  [🎧 Dancefloor]  [🍸 Cocktails]  [👔 Dress code]      │
│  [📸 Photobooth]  [🎂 Privatisation possible]           │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🎉 PROCHAINS ÉVÉNEMENTS                                │
│  ──────────────────────                                 │
│  ┌──────────────────────────────────────────────┐       │
│  │  Sam 15 Mars — "Deep House Night"            │       │
│  │  DJ Resident + Guest · 23h-5h · Entrée 12€  │       │
│  │  [Détails →]                                 │       │
│  └──────────────────────────────────────────────┘       │
│  ┌──────────────────────────────────────────────┐       │
│  │  Ven 21 Mars — "Lyon Techno Collective"      │       │
│  │  3 DJs · 22h-6h · Entrée 15€                │       │
│  │  [Détails →]                                 │       │
│  └──────────────────────────────────────────────┘       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🗺 LOCALISATION                                        │
│  ──────────────                                         │
│  ┌──────────────────────────────────────────────┐       │
│  │                                              │       │
│  │          [mini carte Mapbox]                  │       │
│  │              📍                               │       │
│  │                                              │       │
│  └──────────────────────────────────────────────┘       │
│  [📍 Itinéraire] [🚗 Uber] [🚊 TCL]                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  🔗 LIEUX SIMILAIRES                                    │
│  ┌────────┐ ┌────────┐ ┌────────┐                      │
│  │Terminal│ │  Le    │ │ Sound  │                       │
│  │ Club   │ │Sucre   │ │Factory │                       │
│  └────────┘ └────────┘ └────────┘                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### 3.5 Vue carte — `/carte`

```
┌─────────────────────────────────────────────────────────┐
│ HEADER                                                   │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  MINI LISTE  │        CARTE INTERACTIVE                 │
│  (scrollable)│        (Mapbox GL / Leaflet)             │
│              │                                          │
│ ┌──────────┐ │         📍 📍                            │
│ │MiniCard 1│ │      📍    📍 📍                         │
│ └──────────┘ │        📍                                │
│ ┌──────────┐ │   📍       📍  📍                        │
│ │MiniCard 2│ │                                          │
│ └──────────┘ │            📍📍                          │
│ ┌──────────┐ │     📍         📍                        │
│ │MiniCard 3│ │                                          │
│ └──────────┘ │                                          │
│ ...          │   ┌─────────────────────┐                │
│              │   │ 🔍 Filtrer la carte  │                │
│              │   └─────────────────────┘                │
│              │                                          │
│              │   [📍 Me localiser]  [+] [-]             │
│              │                                          │
├──────────────┴──────────────────────────────────────────┤
│ FOOTER                                                   │
└─────────────────────────────────────────────────────────┘
```

#### Comportement de la carte

- **Markers** : icônes personnalisées par catégorie (couleur d'accent par type)
- **Clusters** : regroupement auto quand zoom faible, avec compteur
- **Popup au clic** : mini-card avec photo, nom, note, bouton "Voir la fiche"
- **Filtre intégré** : même filtres que `/explorer` dans un panneau overlay
- **Rayon de recherche** : cercle visuel sur la carte quand géolocalisation active
- **Sync liste-carte** : hover sur la mini-liste highlight le marker, et vice versa
- **Mobile** : carte plein écran avec sheet bottom-up pour la liste

---

### 3.6 Comparateur — `/comparer`

```
┌─────────────────────────────────────────────────────────┐
│ COMPARATEUR                              [+ Ajouter]    │
├──────────────┬──────────────┬──────────────┬───────────┤
│   📸 Photo   │   📸 Photo   │   📸 Photo   │  (vide)   │
│              │              │              │           │
│  Le Petit    │  Terminal    │  Sound       │  [+ Lieu] │
│  Salon       │  Club        │  Factory     │           │
├──────────────┼──────────────┼──────────────┼───────────┤
│ Note         │              │              │           │
│  ★★★★☆ 4.5  │  ★★★★ 4.0   │  ★★★★☆ 4.3  │           │
├──────────────┼──────────────┼──────────────┤           │
│ Prix         │              │              │           │
│  €€          │  €€          │  €           │           │
├──────────────┼──────────────┼──────────────┤           │
│ Musique      │              │              │           │
│  Techno      │  Electro     │  Techno,     │           │
│  House       │  Bass        │  Minimal     │           │
├──────────────┼──────────────┼──────────────┤           │
│ Quartier     │              │              │           │
│  Lyon 1      │  Lyon 7      │  Lyon 3      │           │
├──────────────┼──────────────┼──────────────┤           │
│ Spécificités │              │              │           │
│  Cocktails   │  Grande      │  Line-up     │           │
│  Sélection   │  capacité    │  pointu      │           │
│  Intimiste   │  Afterwork   │  Prix doux   │           │
├──────────────┼──────────────┼──────────────┤           │
│ Happy Hour   │              │              │           │
│  Non         │  17h-20h     │  18h-21h     │           │
├──────────────┼──────────────┼──────────────┤           │
│              │              │              │           │
│ [Voir fiche] │ [Voir fiche] │ [Voir fiche] │           │
└──────────────┴──────────────┴──────────────┴───────────┘
```

#### Comportement

- Maximum 4 lieux côte à côte (desktop) / 2 en swipe (mobile)
- Ajout via dropdown avec autocomplétion du nom
- Meilleure valeur par critère mise en surbrillance (vert)
- Retrait d'un lieu via bouton ✕
- Bouton "Partager cette comparaison" (URL avec IDs)

---

### 3.7 Chatbot — Panneau latéral / Modale

```
┌──────────────────────────────────────┐
│  💬 Lyon Night Assistant              │
│  ──────────────────────              │
│                                      │
│  🤖  Salut ! Je suis ton guide de    │
│      la nuit lyonnaise. Pose-moi     │
│      une question ou choisis :       │
│                                      │
│  ┌──────────────────────────────┐    │
│  │ 🎵 "Un bar techno pas cher"  │    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │ 🍸 "Meilleur bar à cocktails"│    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │ 🎉 "Quoi faire ce soir ?"    │    │
│  └──────────────────────────────┘    │
│                                      │
│  ─── conversation ───                │
│                                      │
│  👤 Je cherche un bar avec terrasse  │
│     dans le vieux Lyon, ambiance     │
│     chill pour un afterwork          │
│                                      │
│  🤖 Voici 3 suggestions :            │
│                                      │
│  1. **La Traboule** ★★★★             │
│     📍 Vieux Lyon · €€ · Terrasse    │
│     "Cadre typiquement lyonnais..."  │
│     [Voir la fiche →]                │
│                                      │
│  2. **Le Faro** ★★★★☆               │
│     📍 Lyon 5 · € · Vue Saône       │
│     "Parfait pour un apéro..."       │
│     [Voir la fiche →]                │
│                                      │
│  3. **Maison Courgette** ★★★★        │
│     📍 Lyon 5 · €€ · Cosy           │
│     "Ambiance unique dans une..."    │
│     [Voir la fiche →]                │
│                                      │
│  🤖 Tu veux plus de détails sur      │
│     l'un d'eux ?                     │
│                                      │
├──────────────────────────────────────┤
│  [📎]  Écris ton message...    [➤]   │
└──────────────────────────────────────┘
```

#### Comportement

- **Desktop** : panneau latéral droit (400px) — slide-in au clic sur l'icône 💬
- **Mobile** : modale plein écran avec handle de fermeture
- **Suggestions rapides** : chips cliquables au-dessus du champ de saisie
- **Cards inline** : les résultats du chatbot contiennent des mini-cards cliquables
- **Indicateur de frappe** : animation 3 dots pendant la génération de réponse
- **Historique** : conversation conservée pendant la session
- **Feedback** : boutons 👍/👎 sur chaque réponse

---

### 3.8 Événements — `/evenements`

```
┌─────────────────────────────────────────────────────────┐
│  📅 ÉVÉNEMENTS À LYON                                    │
│                                                         │
│  [Aujourd'hui] [Cette semaine] [Ce mois] [Calendrier]   │
│                                                         │
│  Filtrer : [Tous▾] [Concerts▾] [DJ Sets▾] [Quiz▾]      │
│                                                         │
│  ─── AUJOURD'HUI · Vendredi 14 Mars ───                 │
│                                                         │
│  ┌────────────────────────────────────────────────┐     │
│  │ 📸  │  Deep House Night                         │     │
│  │     │  📍 Le Petit Salon · Lyon 1               │     │
│  │     │  🕐 22h — 5h  ·  💰 12€                   │     │
│  │     │  🎧 DJ Resident + Guest                   │     │
│  │     │  [Détails →]                              │     │
│  └────────────────────────────────────────────────┘     │
│                                                         │
│  ┌────────────────────────────────────────────────┐     │
│  │ 📸  │  Quiz Musical                             │     │
│  │     │  📍 L'Atenium · Lyon 3                    │     │
│  │     │  🕐 20h30 — 23h  ·  💰 Gratuit            │     │
│  │     │  🎮 Teams de 2 à 6                        │     │
│  │     │  [Détails →]                              │     │
│  └────────────────────────────────────────────────┘     │
│                                                         │
│  ─── DEMAIN · Samedi 15 Mars ───                        │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Composants réutilisables

### 4.1 Design system — Composants clés

| Composant | Variantes | Utilisation |
|-----------|-----------|-------------|
| `Card` | standard, mini (liste carte), compact (comparateur) | Affichage lieu partout |
| `FilterPanel` | sidebar (desktop), sheet (mobile) | Page explorer, carte |
| `SearchBar` | hero (grand), header (compact) | Accueil, header |
| `MapView` | plein écran, embed (fiche lieu) | Carte, fiche |
| `RatingStars` | lecture seule, interactive | Cards, fiche, comparateur |
| `PriceRange` | display, filter toggle | Cards, filtres |
| `MusicTags` | display (card), filter (chips) | Partout |
| `Badge` | statut (ouvert/fermé), event, happy hour | Cards, fiche |
| `ChatBubble` | user, assistant, suggestion | Chatbot |
| `EventCard` | standard, compact | Événements, fiche lieu |
| `CompareSlot` | filled, empty | Comparateur |
| `RadiusSlider` | — | Filtres géolocalisation |
| `BottomSheet` | filtres, détail rapide | Mobile |
| `LanguageSwitcher` | dropdown header, menu mobile | Header, menu hamburger |

### 4.2 Micro-interactions & animations

| Interaction | Animation |
|-------------|-----------|
| Hover card | Scale 1.02 + glow border orange (300ms ease) |
| Ajout favori | Cœur pulse + particules (Lottie) |
| Ajout comparateur | Card shrink vers l'icône comparateur |
| Ouverture filtres (mobile) | Sheet spring-up (framer-motion) |
| Chargement carte | Markers drop-in séquentiels |
| Message chatbot | Typing indicator → fade-in texte |
| Changement filtre | Reflow cards avec layout animation |
| Scroll carte ↔ liste | Highlight croisé avec transition 200ms |
| Toggle vue grille/liste | Morph animation entre layouts |
| Compteur résultats | Number roll-up animation |

---

## 5. Responsive breakpoints & adaptations

| Breakpoint | Disposition |
|------------|-------------|
| **< 640px** (mobile) | 1 colonne, bottom nav, bottom sheets, carte plein écran |
| **640-1024px** (tablet) | 2 colonnes cards, sidebar filtres rétractable |
| **> 1024px** (desktop) | 3 colonnes cards, sidebar filtres permanente, panneau chat latéral |

---

## 6. Parcours utilisateurs

### 6.1 Parcours "Je cherche un bar ce soir"

```
Accueil → Clic "Clubs" → Explorer filtré
       → Scroll cards → Clic card
       → Fiche détaillée → Clic "Itinéraire"
```

### 6.2 Parcours "Comparer des options"

```
Explorer → Clic "⚖ Comparer" sur Card 1
        → Clic "⚖ Comparer" sur Card 2
        → Badge "2 lieux" apparaît → Clic
        → Page comparateur → Décision → Clic "Voir fiche"
```

### 6.3 Parcours "Où aller près de moi ?"

```
Accueil → Clic "📍 Près de chez toi"
        → Permission géolocalisation → Accepter
        → Cards les plus proches affichées
        OU
        → Clic "📍" header → Saisie adresse + rayon
        → Explorer filtré par distance
```

### 6.4 Parcours "Demander conseil au chatbot"

```
N'importe quelle page → Clic 💬
→ Panel chatbot s'ouvre
→ Clic suggestion rapide OU saisie libre
→ Résultats avec mini-cards
→ Clic mini-card → Fiche détaillée
```

### 6.5 Parcours "Voir les events de la semaine"

```
Accueil → Section "Ce soir" → "Voir tous"
        → Page événements → Filtre "Cette semaine"
        → Clic event → Fiche du lieu (section événement)
```

---

## 7. États vides & erreurs

| Situation | Affichage |
|-----------|-----------|
| Aucun résultat filtres | Illustration + "Aucun lieu ne correspond à tes critères. Essaie d'élargir tes filtres." + bouton reset |
| Géolocalisation refusée | "Active ta localisation pour voir les lieux proches" + champ adresse manuelle |
| Erreur chargement | "Oups, quelque chose a planté 🌙 Réessaye dans un instant." + bouton retry |
| Chatbot lent | Skeleton + "Je réfléchis..." avec animation |
| Pas d'événement | "Rien de prévu pour le moment. Reviens bientôt !" |
| Photo manquante | Placeholder gradient avec icône du type de lieu |
