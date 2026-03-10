/**
 * geocode-addresses.ts — Géocode batch des adresses
 * via Nominatim (OSM, gratuit, 1 req/s).
 *
 * Usage: npx tsx scripts/geocode-addresses.ts
 *
 * Input:  data/merged.json
 * Output: data/merged-geocoded.json
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const DATA_DIR = join(__dirname, "..", "data");
const INPUT = join(DATA_DIR, "merged.json");
const OUTPUT = join(DATA_DIR, "merged-geocoded.json");

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "LyonNightGuide/1.0 (contact@lyonnightguide.fr)";

/** Lyon arrondissement centroids (approximate center of each arrondissement) */
const ARRONDISSEMENT_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "1er": { lat: 45.7676, lng: 4.8344 },
  "2e":  { lat: 45.7530, lng: 4.8280 },
  "3e":  { lat: 45.7580, lng: 4.8500 },
  "4e":  { lat: 45.7760, lng: 4.8280 },
  "5e":  { lat: 45.7590, lng: 4.8210 },
  "6e":  { lat: 45.7680, lng: 4.8530 },
  "7e":  { lat: 45.7460, lng: 4.8400 },
  "8e":  { lat: 45.7350, lng: 4.8640 },
  "9e":  { lat: 45.7780, lng: 4.8050 },
};

interface MergedLieu {
  id: string;
  nom: string;
  adresse: string;
  arrondissement: string | null;
  coordonnees: { lat: number; lng: number } | null;
  [key: string]: unknown;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Normalize address quirks before geocoding */
function normalizeAddress(adresse: string): string {
  return adresse
    .replace(/Lyon\s*\d{1,2}(?:e|er|ème|Eme|ER)\b/gi, "") // remove "Lyon 07" etc — we add "Lyon, France" anyway
    .replace(/\b690\d{2}\s+Lyon\s*\d*/gi, (m) => m.replace(/Lyon\s*\d*/i, "Lyon")) // "69005 Lyon 05" → "69005 Lyon"
    .replace(/\bave\b/gi, "avenue")
    .replace(/\bbd\b/gi, "boulevard")
    .replace(/\bbvd\b/gi, "boulevard")
    .replace(/\bpl\b/gi, "place")
    .replace(/,\s*France\s*$/i, "") // will be added back
    .trim();
}

/** Extract arrondissement from address string */
function extractArr(adresse: string): string | null {
  const zipMatch = adresse.match(/690(\d{2})/);
  if (zipMatch) {
    const num = parseInt(zipMatch[1], 10);
    if (num >= 1 && num <= 9) return `${num}${num === 1 ? "er" : "e"}`;
  }
  const lyonMatch = adresse.match(/Lyon\s*(\d{1,2})/i);
  if (lyonMatch) {
    const num = parseInt(lyonMatch[1], 10);
    if (num >= 1 && num <= 9) return `${num}${num === 1 ? "er" : "e"}`;
  }
  return null;
}

/** Check if coordinates are within greater Lyon area */
function isInLyon(coords: { lat: number; lng: number }): boolean {
  return coords.lat >= 45.70 && coords.lat <= 45.82 && coords.lng >= 4.76 && coords.lng <= 4.92;
}

async function geocode(adresse: string): Promise<{ lat: number; lng: number } | null> {
  const query = adresse.includes("Lyon") ? adresse : `${adresse}, Lyon, France`;

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "fr");

  const response = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    console.warn(`  ⚠ HTTP ${response.status} for "${adresse}"`);
    return null;
  }

  const results: NominatimResult[] = await response.json();
  if (results.length === 0) return null;

  const coords = {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
  };

  // Reject results clearly outside Lyon
  if (!isInLyon(coords)) return null;

  return coords;
}

async function main() {
  const lieux: MergedLieu[] = JSON.parse(readFileSync(INPUT, "utf-8"));
  let geocoded = 0;
  let skipped = 0;
  let failed = 0;
  let centroidFallback = 0;

  for (let i = 0; i < lieux.length; i++) {
    const lieu = lieux[i];

    // Skip if already geocoded and valid
    if (lieu.coordonnees && isInLyon(lieu.coordonnees)) {
      skipped++;
      continue;
    }

    // If had coords but outside Lyon, re-geocode
    if (lieu.coordonnees && !isInLyon(lieu.coordonnees)) {
      console.log(`  🔄 [${i + 1}/${lieux.length}] "${lieu.nom}" — coords outside Lyon, re-geocoding`);
      lieux[i] = { ...lieu, coordonnees: null };
    }

    const isVague = !lieu.adresse || lieu.adresse.length < 8 || /^Lyon\s*\d{0,2}e?r?$/i.test(lieu.adresse.trim());

    if (isVague) {
      // Try arrondissement centroid fallback
      const arr = lieu.arrondissement ?? extractArr(lieu.adresse ?? "");
      if (arr && ARRONDISSEMENT_CENTROIDS[arr]) {
        lieux[i] = { ...lieu, coordonnees: ARRONDISSEMENT_CENTROIDS[arr] };
        centroidFallback++;
        console.log(`  📍 [${i + 1}/${lieux.length}] "${lieu.nom}" — centroid fallback for ${arr}`);
        continue;
      }
      console.log(`  ⏭ [${i + 1}/${lieux.length}] "${lieu.nom}" — adresse trop vague: "${lieu.adresse}"`);
      failed++;
      continue;
    }

    const normalized = normalizeAddress(lieu.adresse);
    console.log(`  🔍 [${i + 1}/${lieux.length}] "${lieu.nom}" — ${normalized}`);

    // Strategy 1: Normalized address
    const coords = await geocode(normalized);
    if (coords) {
      lieux[i] = { ...lieu, coordonnees: coords };
      geocoded++;
      console.log(`     ✅ ${coords.lat}, ${coords.lng}`);
      await sleep(1100);
      continue;
    }

    await sleep(1100);

    // Strategy 2: Venue name + Lyon
    const fallback1 = await geocode(`${lieu.nom}, Lyon`);
    if (fallback1) {
      lieux[i] = { ...lieu, coordonnees: fallback1 };
      geocoded++;
      console.log(`     ✅ (fallback by name) ${fallback1.lat}, ${fallback1.lng}`);
      await sleep(1100);
      continue;
    }

    await sleep(1100);

    // Strategy 3: Venue name + arrondissement
    const arr = lieu.arrondissement ?? extractArr(lieu.adresse);
    if (arr) {
      const fallback2 = await geocode(`${lieu.nom}, Lyon ${arr}`);
      if (fallback2) {
        lieux[i] = { ...lieu, coordonnees: fallback2 };
        geocoded++;
        console.log(`     ✅ (fallback name+arr) ${fallback2.lat}, ${fallback2.lng}`);
        await sleep(1100);
        continue;
      }
      await sleep(1100);
    }

    // Strategy 4: Arrondissement centroid as last resort
    const arrFallback = arr ?? lieu.arrondissement;
    if (arrFallback && ARRONDISSEMENT_CENTROIDS[arrFallback]) {
      lieux[i] = { ...lieu, coordonnees: ARRONDISSEMENT_CENTROIDS[arrFallback] };
      centroidFallback++;
      console.log(`     📍 centroid fallback for ${arrFallback}`);
      continue;
    }

    failed++;
    console.log(`     ❌ not found`);
  }

  writeFileSync(OUTPUT, JSON.stringify(lieux, null, 2), "utf-8");

  console.log(`\n✅ Geocoding done → ${OUTPUT}`);
  console.log(`   - ${geocoded} geocoded`);
  console.log(`   - ${centroidFallback} centroid fallback`);
  console.log(`   - ${skipped} already had coords`);
  console.log(`   - ${failed} failed`);
}

main().catch(console.error);
