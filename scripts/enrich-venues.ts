/**
 * enrich-venues.ts — Enrich all venues with real data from Yelp + Foursquare + Gemini.
 *
 * For each venue:
 *   1. Search Yelp Business Match → real rating, price, categories, photos
 *   2. Search Foursquare → tips, rating, details
 *   3. Generate a proper French description with Gemini
 *
 * Usage: npx tsx scripts/enrich-venues.ts
 *
 * Input:  data/merged-geocoded.json
 * Output: data/merged-geocoded.json (enriched in-place)
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const INPUT = join(DATA_DIR, "merged-geocoded.json");
const PROGRESS_FILE = join(DATA_DIR, "enrich-progress.json");

// ---------------------------------------------------------------------------
// Env loading
// ---------------------------------------------------------------------------

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const p of [join(ROOT, "app", ".env"), join(ROOT, "app", ".env.local"), join(ROOT, ".env.local")]) {
    try {
      for (const line of readFileSync(p, "utf-8").split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const eq = t.indexOf("=");
        if (eq === -1) continue;
        const key = t.slice(0, eq).trim();
        let val = t.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    } catch { /* skip */ }
  }
  return env;
}

const envFile = loadEnv();
function getEnv(key: string): string {
  const v = process.env[key] ?? envFile[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

const YELP_KEY = getEnv("YELP_API_KEY");
const FOURSQUARE_KEY = getEnv("FOURSQUARE_API_KEY");
const GEMINI_KEY = getEnv("GEMINI_API_KEY");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Lieu {
  id: string;
  nom: string;
  slug: string;
  type: "bar" | "club";
  categorie: string;
  sous_categories: string[];
  adresse: string;
  arrondissement: string | null;
  quartier: string | null;
  coordonnees: { lat: number; lng: number } | null;
  note: number | null;
  prix: {
    fourchette: "€" | "€€" | "€€€";
    pinte_moy: number | null;
    cocktail_moy: number | null;
    entree?: string;
  };
  musique: string[];
  specificites: string[];
  clientele: string | null;
  capacite: number | null;
  horaires: { texte: string } | null;
  description: string;
  resume_avis: string | null;
  photos: string[];
  photo_cover: string | null;
  site_web: string | null;
  instagram: string | null;
  google_maps: string | null;
  telephone: string | null;
  evenements: unknown[];
  happy_hours: unknown;
  sources: string[];
  date_maj: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function saveProgress(lieux: Lieu[], lastIndex: number): void {
  writeFileSync(PROGRESS_FILE, JSON.stringify({ lastIndex }), "utf-8");
  writeFileSync(INPUT, JSON.stringify(lieux, null, 2), "utf-8");
}

function loadProgress(): number {
  try {
    const data = JSON.parse(readFileSync(PROGRESS_FILE, "utf-8"));
    return data.lastIndex ?? 0;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Yelp API
// ---------------------------------------------------------------------------

interface YelpBusiness {
  id: string;
  name: string;
  rating: number;
  review_count: number;
  price?: string;
  categories: { alias: string; title: string }[];
  image_url?: string;
  photos?: string[];
  url: string;
  phone?: string;
  location: { display_address: string[] };
}

async function yelpSearch(name: string, lat: number, lng: number): Promise<YelpBusiness | null> {
  const url = new URL("https://api.yelp.com/v3/businesses/search");
  url.searchParams.set("term", name);
  url.searchParams.set("latitude", lat.toString());
  url.searchParams.set("longitude", lng.toString());
  url.searchParams.set("radius", "500");
  url.searchParams.set("limit", "3");
  url.searchParams.set("locale", "fr_FR");

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${YELP_KEY}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.businesses?.length) return null;

    // Find best match by name similarity
    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const best = data.businesses.find((b: YelpBusiness) => {
      const bName = b.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      return bName.includes(normalized) || normalized.includes(bName) || levenshteinSimilarity(bName, normalized) > 0.6;
    });
    return best ?? data.businesses[0];
  } catch {
    return null;
  }
}

async function yelpDetails(businessId: string): Promise<{ photos: string[]; hours: string | null } | null> {
  try {
    const res = await fetch(`https://api.yelp.com/v3/businesses/${businessId}`, {
      headers: { Authorization: `Bearer ${YELP_KEY}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      photos: data.photos ?? [],
      hours: data.hours?.[0]?.open ? formatYelpHours(data.hours[0].open) : null,
    };
  } catch {
    return null;
  }
}

function formatYelpHours(hours: { day: number; start: string; end: string }[]): string {
  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const grouped = new Map<string, string[]>();
  for (const h of hours) {
    const timeStr = `${h.start.slice(0, 2)}h${h.start.slice(2)}-${h.end.slice(0, 2)}h${h.end.slice(2)}`;
    const existing = grouped.get(timeStr) ?? [];
    existing.push(days[h.day]!);
    grouped.set(timeStr, existing);
  }
  return Array.from(grouped.entries())
    .map(([time, d]) => `${d.join(", ")}: ${time}`)
    .join(" | ");
}

function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;

  const costs: number[] = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) { costs[j] = j; }
      else if (j > 0) {
        let newValue = costs[j - 1]!;
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]!) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }
  return (longer.length - costs[shorter.length]!) / longer.length;
}

// ---------------------------------------------------------------------------
// Foursquare API
// ---------------------------------------------------------------------------

interface FsqPlace {
  fsq_id: string;
  name: string;
  rating?: number;
  price?: number;
  tips?: { text: string }[];
  categories: { name: string }[];
  tel?: string;
  website?: string;
  hours?: { display: string };
  description?: string;
  photos?: { prefix: string; suffix: string }[];
}

async function foursquareSearch(name: string, lat: number, lng: number): Promise<FsqPlace | null> {
  const url = new URL("https://api.foursquare.com/v3/places/search");
  url.searchParams.set("query", name);
  url.searchParams.set("ll", `${lat},${lng}`);
  url.searchParams.set("radius", "500");
  url.searchParams.set("limit", "3");
  url.searchParams.set("fields", "fsq_id,name,rating,price,categories,tel,website,hours,description");

  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: FOURSQUARE_KEY, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.results?.length) return null;

    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const best = data.results.find((p: FsqPlace) => {
      const pName = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      return pName.includes(normalized) || normalized.includes(pName) || levenshteinSimilarity(pName, normalized) > 0.6;
    });
    return best ?? data.results[0];
  } catch {
    return null;
  }
}

async function foursquareTips(fsqId: string): Promise<string[]> {
  try {
    const res = await fetch(`https://api.foursquare.com/v3/places/${fsqId}/tips?limit=5`, {
      headers: { Authorization: FOURSQUARE_KEY, Accept: "application/json" },
    });
    if (!res.ok) return [];
    const tips = await res.json();
    return (tips as { text: string }[]).map((t) => t.text).filter(Boolean);
  } catch {
    return [];
  }
}

async function foursquarePhotos(fsqId: string): Promise<string[]> {
  try {
    const res = await fetch(`https://api.foursquare.com/v3/places/${fsqId}/photos?limit=5`, {
      headers: { Authorization: FOURSQUARE_KEY, Accept: "application/json" },
    });
    if (!res.ok) return [];
    const photos = await res.json();
    return (photos as { prefix: string; suffix: string }[]).map((p) => `${p.prefix}original${p.suffix}`);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Gemini API — Generate descriptions
// ---------------------------------------------------------------------------

async function geminiDescriptions(batch: { nom: string; type: string; categorie: string; specificites: string[]; musique: string[]; quartier: string | null; arrondissement: string | null; yelpCategories: string; tips: string[]; rating: number | null; price: string }[]): Promise<string[]> {
  const prompt = `Tu es un expert des bars et clubs de Lyon. Pour chaque lieu ci-dessous, écris une description attrayante en français de 2-3 phrases (max 200 caractères). Mentionne l'ambiance, les spécialités et ce qui rend le lieu unique. Sois précis et authentique. Réponds UNIQUEMENT avec un JSON array de strings, une description par lieu, dans le même ordre.

Lieux:
${batch.map((b, i) => `${i + 1}. "${b.nom}" — ${b.type} ${b.categorie} à Lyon ${b.arrondissement ?? ""}. Spécificités: ${b.specificites.join(", ") || "aucune"}. Musique: ${b.musique.join(", ") || "variée"}. Catégories Yelp: ${b.yelpCategories || "N/A"}. Avis clients: ${b.tips.slice(0, 2).join(" | ") || "N/A"}. Note: ${b.rating ?? "N/A"}/5. Prix: ${b.price}`).join("\n")}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
        }),
      }
    );
    if (!res.ok) {
      console.warn(`  ⚠ Gemini HTTP ${res.status}`);
      return batch.map(() => "");
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return batch.map(() => "");

    const descriptions: string[] = JSON.parse(jsonMatch[0]);
    return descriptions;
  } catch (err) {
    console.warn(`  ⚠ Gemini error: ${err}`);
    return batch.map(() => "");
  }
}

// ---------------------------------------------------------------------------
// Enrichment logic
// ---------------------------------------------------------------------------

function yelpPriceToFourchette(price: string | undefined): "€" | "€€" | "€€€" | null {
  if (!price) return null;
  if (price === "$" || price === "€") return "€";
  if (price === "$$" || price === "€€") return "€€";
  return "€€€";
}

function fsqPriceToFourchette(price: number | undefined): "€" | "€€" | "€€€" | null {
  if (!price) return null;
  if (price === 1) return "€";
  if (price === 2) return "€€";
  return "€€€";
}

async function enrichVenue(lieu: Lieu): Promise<Lieu> {
  const lat = lieu.coordonnees?.lat ?? 45.764;
  const lng = lieu.coordonnees?.lng ?? 4.8357;

  // --- Yelp ---
  const yelpBiz = await yelpSearch(lieu.nom, lat, lng);
  await sleep(200);

  let yelpPhotos: string[] = [];
  let yelpHours: string | null = null;
  let yelpCategories = "";

  if (yelpBiz) {
    yelpCategories = yelpBiz.categories.map((c) => c.title).join(", ");

    // Get details for photos + hours
    const details = await yelpDetails(yelpBiz.id);
    await sleep(200);
    if (details) {
      yelpPhotos = details.photos;
      yelpHours = details.hours;
    }
  }

  // --- Foursquare ---
  const fsqPlace = await foursquareSearch(lieu.nom, lat, lng);
  await sleep(200);

  let fsqTips: string[] = [];
  let fsqPhotos: string[] = [];

  if (fsqPlace) {
    fsqTips = await foursquareTips(fsqPlace.fsq_id);
    await sleep(200);
    fsqPhotos = await foursquarePhotos(fsqPlace.fsq_id);
    await sleep(200);
  }

  // --- Merge real data ---
  const enriched: Lieu = { ...lieu };

  // Note: prefer Yelp rating (1-5), convert Foursquare (1-10) to 1-5 scale
  if (yelpBiz?.rating && (!lieu.note || lieu.sources.length <= 1)) {
    enriched.note = yelpBiz.rating;
  } else if (fsqPlace?.rating && !lieu.note) {
    enriched.note = Math.round((fsqPlace.rating / 2) * 10) / 10;
  }

  // Prix: prefer Yelp, then Foursquare
  const yelpPrice = yelpPriceToFourchette(yelpBiz?.price);
  const fsqPrice = fsqPriceToFourchette(fsqPlace?.price);
  if (yelpPrice) {
    enriched.prix = { ...enriched.prix, fourchette: yelpPrice };
  } else if (fsqPrice) {
    enriched.prix = { ...enriched.prix, fourchette: fsqPrice };
  }

  // Photos: merge all unique photos
  const allPhotos = [...new Set([...lieu.photos, ...yelpPhotos, ...fsqPhotos])];
  if (allPhotos.length > 0) {
    enriched.photos = allPhotos.slice(0, 8); // max 8 photos
    enriched.photo_cover = enriched.photo_cover ?? allPhotos[0] ?? null;
  }

  // Telephone
  if (!enriched.telephone && yelpBiz?.phone) {
    enriched.telephone = yelpBiz.phone;
  }
  if (!enriched.telephone && fsqPlace?.tel) {
    enriched.telephone = fsqPlace.tel;
  }

  // Website
  if (!enriched.site_web && fsqPlace?.website) {
    enriched.site_web = fsqPlace.website;
  }

  // Horaires
  if (!enriched.horaires && yelpHours) {
    enriched.horaires = { texte: yelpHours };
  }
  if (!enriched.horaires && fsqPlace?.hours?.display) {
    enriched.horaires = { texte: fsqPlace.hours.display };
  }

  // Specificites: merge Yelp categories + Foursquare categories
  const newSpecs = new Set(enriched.specificites);
  if (yelpBiz) {
    for (const cat of yelpBiz.categories) {
      newSpecs.add(cat.title);
    }
  }
  if (fsqPlace) {
    for (const cat of fsqPlace.categories) {
      newSpecs.add(cat.name);
    }
  }
  enriched.specificites = [...newSpecs];

  // Resume avis from Foursquare tips
  if (fsqTips.length > 0 && !enriched.resume_avis) {
    enriched.resume_avis = fsqTips.slice(0, 3).join(" | ");
  }

  // Track enrichment sources
  if (yelpBiz && !enriched.sources.includes("yelp")) {
    enriched.sources = [...new Set([...enriched.sources, "yelp"])];
  }
  if (fsqPlace && !enriched.sources.includes("foursquare")) {
    enriched.sources = [...new Set([...enriched.sources, "foursquare"])];
  }

  // Store temporary data for Gemini batch
  (enriched as any)._yelpCategories = yelpCategories;
  (enriched as any)._tips = fsqTips;

  return enriched;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const lieux: Lieu[] = JSON.parse(readFileSync(INPUT, "utf-8"));
  const startIdx = loadProgress();

  console.log(`\n🔄 Enriching ${lieux.length} venues (resuming from #${startIdx + 1})...\n`);

  // Phase 1: Yelp + Foursquare enrichment
  const BATCH_SIZE = 10;

  for (let i = startIdx; i < lieux.length; i++) {
    const lieu = lieux[i]!;
    console.log(`  [${i + 1}/${lieux.length}] "${lieu.nom}"`);

    try {
      lieux[i] = await enrichVenue(lieu);

      const enriched = lieux[i]!;
      const newNote = enriched.note !== lieu.note ? ` note:${enriched.note}` : "";
      const newPhotos = enriched.photos.length > lieu.photos.length ? ` +${enriched.photos.length - lieu.photos.length} photos` : "";
      const newSpecs = enriched.specificites.length > lieu.specificites.length ? ` +${enriched.specificites.length - lieu.specificites.length} specs` : "";
      console.log(`     ✅${newNote}${newPhotos}${newSpecs}`);
    } catch (err) {
      console.warn(`     ⚠ Error: ${err}`);
    }

    // Save progress every BATCH_SIZE venues
    if ((i + 1) % BATCH_SIZE === 0) {
      saveProgress(lieux, i + 1);
      console.log(`     💾 Saved progress at ${i + 1}/${lieux.length}`);
    }
  }

  // Phase 2: Gemini descriptions (batch of 15)
  console.log(`\n✍ Generating descriptions with Gemini...\n`);
  const GEMINI_BATCH = 15;

  for (let i = 0; i < lieux.length; i += GEMINI_BATCH) {
    const batch = lieux.slice(i, i + GEMINI_BATCH);
    const batchData = batch.map((l) => ({
      nom: l.nom,
      type: l.type,
      categorie: l.categorie,
      specificites: l.specificites,
      musique: l.musique,
      quartier: l.quartier,
      arrondissement: l.arrondissement,
      yelpCategories: (l as any)._yelpCategories ?? "",
      tips: (l as any)._tips ?? [],
      rating: l.note,
      price: l.prix.fourchette,
    }));

    console.log(`  [${i + 1}-${Math.min(i + GEMINI_BATCH, lieux.length)}/${lieux.length}] Generating descriptions...`);

    const descriptions = await geminiDescriptions(batchData);
    for (let j = 0; j < batch.length; j++) {
      if (descriptions[j] && descriptions[j].length > 20) {
        lieux[i + j]!.description = descriptions[j];
      }
    }

    await sleep(1000); // Gemini rate limit
  }

  // Cleanup temp fields
  for (const l of lieux) {
    delete (l as any)._yelpCategories;
    delete (l as any)._tips;
  }

  // Final save
  writeFileSync(INPUT, JSON.stringify(lieux, null, 2), "utf-8");

  // Stats
  const withNote = lieux.filter((l) => l.note !== null).length;
  const withPhotos = lieux.filter((l) => l.photos.length > 0).length;
  const withDesc = lieux.filter((l) => l.description.length > 50).length;
  const withHoraires = lieux.filter((l) => l.horaires !== null).length;

  console.log(`\n✅ Enrichment complete!`);
  console.log(`   - ${withNote}/${lieux.length} with rating`);
  console.log(`   - ${withPhotos}/${lieux.length} with photos`);
  console.log(`   - ${withDesc}/${lieux.length} with description`);
  console.log(`   - ${withHoraires}/${lieux.length} with hours`);
}

main().catch(console.error);
