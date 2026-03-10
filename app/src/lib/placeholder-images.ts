/**
 * Category-aware fallback images for venues without a photo_cover.
 * Uses local DALL-E generated themed images as primary fallback,
 * with Unsplash URLs as secondary.
 * Each venue gets a deterministic image based on its category and ID.
 */

/** Local themed images (DALL-E generated, in /images/themed/) */
const LOCAL_IMAGES: Record<string, string[]> = {
  cocktail: [
    "/images/themed/bars___cocktails___speakeasy-1.png",
    "/images/themed/bars___cocktails___speakeasy-2.png",
    "/images/themed/bars___cocktails___speakeasy-3.png",
    "/images/themed/bars___cocktails___speakeasy-5.png",
    "/images/themed/bars___cocktails___speakeasy-6.png",
  ],
  vin: [
    "/images/themed/rooftops___bars___vins-1.png",
    "/images/themed/rooftops___bars___vins-4.png",
    "/images/themed/rooftops___bars___vins-6.png",
  ],
  biere: [
    "/images/themed/bars___bi_res__pubs___bars_insolites-1.png",
    "/images/themed/bars___bi_res__pubs___bars_insolites-2.png",
    "/images/themed/bars___bi_res__pubs___bars_insolites-3.png",
    "/images/themed/bars___bi_res__pubs___bars_insolites-4.png",
    "/images/themed/bars___bi_res__pubs___bars_insolites-5.png",
  ],
  peniche: [
    "/images/themed/p_niche-1.png",
    "/images/themed/p_niche-2.png",
    "/images/themed/p_niche-3.png",
  ],
  club: [
    "/images/themed/clubs___bo_tes_de_nuit-1.png",
    "/images/themed/clubs___bo_tes_de_nuit-2.png",
    "/images/themed/clubs___bo_tes_de_nuit-3.png",
    "/images/themed/clubs___bo_tes_de_nuit-4.png",
    "/images/themed/clubs___bo_tes_de_nuit-5.png",
    "/images/themed/clubs___bo_tes_de_nuit-6.png",
    "/images/themed/clubs___bars_dansants-1.png",
    "/images/themed/clubs___bars_dansants-2.png",
    "/images/themed/clubs___bars_dansants-3.png",
    "/images/themed/clubs___bars_dansants-4.png",
  ],
  lgbt: [
    "/images/themed/bars___clubs_lgbt_friendly-1.png",
    "/images/themed/bars___clubs_lgbt_friendly-2.png",
    "/images/themed/bars___clubs_lgbt_friendly-3.png",
  ],
  pub: [
    "/images/themed/pubs_irlandais__cossais___bars_vieux_lyon-1.png",
    "/images/themed/pubs_irlandais__cossais___bars_vieux_lyon-2.png",
    "/images/themed/pubs_irlandais__cossais___bars_vieux_lyon-4.png",
    "/images/themed/pubs_irlandais__cossais___bars_vieux_lyon-5.png",
  ],
  cosy: [
    "/images/themed/bars_cosy___afterworks-2.png",
    "/images/themed/bars_cosy___afterworks-3.png",
    "/images/themed/bars_cosy___afterworks-4.png",
  ],
  latino: [
    "/images/themed/clubs___bars_dansants-1.png",
    "/images/themed/clubs___bars_dansants-2.png",
    "/images/themed/clubs___bars_dansants-3.png",
  ],
  jeux: [
    "/images/themed/bars_cosy___afterworks-2.png",
    "/images/themed/bars_cosy___afterworks-3.png",
    "/images/themed/bars___bi_res__pubs___bars_insolites-3.png",
  ],
  bar: [
    "/images/themed/bar-3.png",
    "/images/themed/bars_cosy___afterworks-2.png",
    "/images/themed/bars___bi_res__pubs___bars_insolites-1.png",
    "/images/themed/pubs_irlandais__cossais___bars_vieux_lyon-1.png",
    "/images/themed/bars___cocktails___speakeasy-1.png",
  ],
};

/** Unsplash fallbacks (secondary — used only if local images are missing) */
const UNSPLASH_IMAGES: Record<string, string[]> = {
  cocktail: [
    "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&h=600&fit=crop",
  ],
  vin: [
    "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&h=600&fit=crop",
  ],
  biere: [
    "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1555658636-6e4a36218be7?w=800&h=600&fit=crop",
  ],
  peniche: [
    "https://images.unsplash.com/photo-1545128485-c400e7702796?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=800&h=600&fit=crop",
  ],
  club: [
    "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1571204829887-3b8d69e4094d?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop",
  ],
  lgbt: [
    "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&h=600&fit=crop",
  ],
  pub: [
    "https://images.unsplash.com/photo-1546726747-421c6d69c929?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1585521551073-1649e0e24a62?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&h=600&fit=crop",
  ],
  latino: [
    "https://images.unsplash.com/photo-1504270997636-07ddfbd48945?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop",
  ],
  cosy: [
    "https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop",
  ],
  jeux: [
    "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1611462985358-60d3498e0364?w=800&h=600&fit=crop",
  ],
  bar: [
    "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&h=600&fit=crop",
  ],
};

/** Simple hash to get a deterministic index from a string */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Map a venue category string to one of our keys */
function resolveKey(categorie: string, type: string): string {
  const cat = categorie.toLowerCase();

  if (cat.includes("cocktail") || cat.includes("speakeasy")) return "cocktail";
  if (cat.includes("vin") || cat.includes("rooftop")) return "vin";
  if (cat.includes("bière") || cat.includes("biere") || cat.includes("insolite")) return "biere";
  if (cat.includes("péniche") || cat.includes("peniche") || cat.includes("dansant")) return "peniche";
  if (cat.includes("lgbt")) return "lgbt";
  if (cat.includes("pub") || cat.includes("irlandais") || cat.includes("écossais") || cat.includes("vieux lyon")) return "pub";
  if (cat.includes("latino")) return "latino";
  if (cat.includes("cosy") || cat.includes("afterwork")) return "cosy";
  if (cat.includes("jeux")) return "jeux";
  if (cat.includes("club") || cat.includes("boîte") || cat.includes("boite") || cat.includes("nuit")) return "club";
  if (cat.includes("sportif") || cat.includes("sport")) return "pub";

  return type === "club" ? "club" : "bar";
}

/** Get a deterministic placeholder image URL for a venue without photos */
export function getPlaceholderImage(id: string, categorie: string, type: string): string {
  const key = resolveKey(categorie, type);
  const hash = hashCode(id);

  // Prefer local themed images
  const local = LOCAL_IMAGES[key] ?? LOCAL_IMAGES.bar!;
  if (local.length > 0) {
    return local[hash % local.length]!;
  }

  // Fall back to Unsplash
  const remote = UNSPLASH_IMAGES[key] ?? UNSPLASH_IMAGES.bar!;
  return remote[hash % remote.length]!;
}
