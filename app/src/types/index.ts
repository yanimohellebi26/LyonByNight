// ============================================================
// Lyon Night Guide — Unified Data Types
// ============================================================

/** Type principal d'un établissement */
export type LieuType = "bar" | "club";

/** Fourchette de prix */
export type PriceRange = "€" | "€€" | "€€€";

/** Type d'événement */
export type EventType = "concert" | "dj_set" | "soiree_theme" | "quiz" | "autre";

/** Coordonnées géographiques */
export interface Coordonnees {
  readonly lat: number;
  readonly lng: number;
}

/** Informations de prix */
export interface PrixInfo {
  readonly fourchette: PriceRange;
  readonly pinte_moy: number | null;
  readonly cocktail_moy: number | null;
  readonly entree?: string;
}

/** Horaires structurés (JSONB en DB) */
export interface Horaires {
  readonly lundi?: string;
  readonly mardi?: string;
  readonly mercredi?: string;
  readonly jeudi?: string;
  readonly vendredi?: string;
  readonly samedi?: string;
  readonly dimanche?: string;
  readonly texte?: string; // format libre ("Mar-Sam 18h-3h")
}

/** Happy Hour */
export interface HappyHour {
  readonly jours: readonly string[];
  readonly heure_debut: string;
  readonly heure_fin: string;
  readonly offre: string;
}

/** Événement */
export interface Evenement {
  readonly id: string;
  readonly lieu_id: string;
  readonly titre: string;
  readonly description: string;
  readonly date: string; // ISO date
  readonly heure_debut: string;
  readonly heure_fin?: string;
  readonly type: EventType;
  readonly prix_entree?: string;
  readonly artiste?: string;
  readonly image?: string;
}

/** Schéma principal — Lieu */
export interface Lieu {
  readonly id: string;
  readonly nom: string;
  readonly slug: string;
  readonly type: LieuType;
  readonly categorie: string;
  readonly sous_categories: readonly string[];

  // Localisation
  readonly adresse: string;
  readonly arrondissement: string | null;
  readonly quartier: string | null;
  readonly coordonnees: Coordonnees | null;

  // Informations clés
  readonly note: number | null;
  readonly note_originale?: number | null;
  readonly prix: PrixInfo;
  readonly musique: readonly string[];
  readonly specificites: readonly string[];
  readonly clientele: string | null;
  readonly capacite: number | null;

  // Horaires
  readonly horaires: Horaires | null;

  // Contenu riche
  readonly description: string;
  readonly resume_avis: string | null;
  readonly photos: readonly string[];
  readonly photo_cover: string | null;

  // Contact & liens
  readonly site_web: string | null;
  readonly instagram: string | null;
  readonly google_maps: string | null;
  readonly telephone: string | null;

  // Données dynamiques
  readonly evenements: readonly Evenement[];
  readonly happy_hours: HappyHour | null;

  // Source & traçabilité
  readonly sources: readonly string[];
  readonly date_maj: string; // ISO date
}

// ============================================================
// Types pour les filtres et l'API
// ============================================================

/** Paramètres de filtrage pour GET /api/lieux */
export interface LieuxFilters {
  readonly type?: LieuType;
  readonly categorie?: string;
  readonly arrondissement?: string;
  readonly quartier?: string;
  readonly musique?: string;
  readonly prix?: PriceRange;
  readonly note_min?: number;
  readonly specificite?: string;
  readonly search?: string;
  readonly lat?: number;
  readonly lng?: number;
  readonly rayon_km?: number;
  readonly sort?: "note" | "prix" | "nom" | "distance";
  readonly order?: "asc" | "desc";
  readonly page?: number;
  readonly limit?: number;
}

/** Réponse paginée */
export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly has_more: boolean;
}

/** Réponse API standard */
export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: string | null;
}

// ============================================================
// Types pour le merge des données sources
// ============================================================

/** Entrée brute de liste1.json */
export interface Liste1Entry {
  readonly nom: string;
  readonly note: number;
  readonly gamme_prix: string;
  readonly style_musique: string;
  readonly specificites: readonly string[];
  readonly adresse: string;
  readonly site_web: string;
}

/** Entrée brute de liste2.json */
export interface Liste2Entry {
  readonly nom: string;
  readonly arrondissement: string;
  readonly note: string;
  readonly musique: string;
  readonly prix_pinte: string;
  readonly specificite: string;
}

/** Entrée brute de liste3.json */
export interface Liste3Entry {
  readonly id: number;
  readonly nom: string;
  readonly categorie: string;
  readonly sous_categories: readonly string[];
  readonly adresse: string;
  readonly arrondissement: string | null;
  readonly quartier: string | null;
  readonly note_google: number;
  readonly musique: readonly string[];
  readonly prix: {
    readonly fourchette: string;
    readonly pinte_moy: number | null;
    readonly cocktail_moy: number | null;
    readonly entree?: string;
  };
  readonly specificites: readonly string[];
  readonly horaires: string;
  readonly google_maps: string;
  readonly website: string | null;
  readonly instagram: string | null;
  readonly clientele: string;
  readonly capacite?: number;
}
