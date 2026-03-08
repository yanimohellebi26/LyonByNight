/**
 * Curated Unsplash photos mapped to venue categories.
 * Each venue without a photo_cover gets a deterministic fallback
 * based on its category and ID (so the same venue always gets the same image).
 */

const CATEGORY_IMAGES: Record<string, string[]> = {
  // Cocktail bars & speakeasy
  "cocktail": [
    "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1597290282695-edc43d0e7129?w=800&h=600&fit=crop",
  ],
  // Rooftops & wine bars
  "vin": [
    "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=800&h=600&fit=crop",
  ],
  // Beer bars & pubs
  "biere": [
    "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1555658636-6e4a36218be7?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1600788886242-5c96aabe3757?w=800&h=600&fit=crop",
  ],
  // Péniches & bars dansants
  "peniche": [
    "https://images.unsplash.com/photo-1545128485-c400e7702796?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1519214605650-76a613ee3245?w=800&h=600&fit=crop",
  ],
  // Clubs & nightlife
  "club": [
    "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1571204829887-3b8d69e4094d?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?w=800&h=600&fit=crop",
  ],
  // LGBT-friendly bars
  "lgbt": [
    "https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1504270997636-07ddfbd48945?w=800&h=600&fit=crop",
  ],
  // Pubs irlandais / bars traditionnels
  "pub": [
    "https://images.unsplash.com/photo-1546726747-421c6d69c929?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1585521551073-1649e0e24a62?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&h=600&fit=crop",
  ],
  // Latino bars
  "latino": [
    "https://images.unsplash.com/photo-1504270997636-07ddfbd48945?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1545959570-a94084071b5d?w=800&h=600&fit=crop",
  ],
  // Cosy bars & afterwork
  "cosy": [
    "https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop",
  ],
  // Bar à jeux
  "jeux": [
    "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1611462985358-60d3498e0364?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?w=800&h=600&fit=crop",
  ],
  // Generic bar fallback
  "bar": [
    "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&h=600&fit=crop",
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

  return type === "club" ? "club" : "bar";
}

/** Get a deterministic placeholder image URL for a venue without photos */
export function getPlaceholderImage(id: string, categorie: string, type: string): string {
  const key = resolveKey(categorie, type);
  const images = CATEGORY_IMAGES[key] ?? CATEGORY_IMAGES.bar!;
  return images[hashCode(id) % images.length]!;
}
