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

interface MergedLieu {
  id: string;
  nom: string;
  adresse: string;
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

  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
  };
}

async function main() {
  const lieux: MergedLieu[] = JSON.parse(readFileSync(INPUT, "utf-8"));
  let geocoded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < lieux.length; i++) {
    const lieu = lieux[i];

    // Skip if already geocoded
    if (lieu.coordonnees) {
      skipped++;
      continue;
    }

    // Skip if address is too vague
    if (!lieu.adresse || lieu.adresse.length < 8 || lieu.adresse === "Lyon") {
      console.log(`  ⏭ [${i + 1}/${lieux.length}] "${lieu.nom}" — adresse trop vague: "${lieu.adresse}"`);
      failed++;
      continue;
    }

    console.log(`  🔍 [${i + 1}/${lieux.length}] "${lieu.nom}" — ${lieu.adresse}`);
    const coords = await geocode(lieu.adresse);

    if (coords) {
      lieux[i] = { ...lieu, coordonnees: coords };
      geocoded++;
      console.log(`     ✅ ${coords.lat}, ${coords.lng}`);
    } else {
      // Retry with just "nom, Lyon"
      const fallback = await geocode(`${lieu.nom}, Lyon`);
      if (fallback) {
        lieux[i] = { ...lieu, coordonnees: fallback };
        geocoded++;
        console.log(`     ✅ (fallback by name) ${fallback.lat}, ${fallback.lng}`);
      } else {
        failed++;
        console.log(`     ❌ not found`);
      }
    }

    // Respect rate limit: 1 req/s
    await sleep(1100);
  }

  writeFileSync(OUTPUT, JSON.stringify(lieux, null, 2), "utf-8");

  console.log(`\n✅ Geocoding done → ${OUTPUT}`);
  console.log(`   - ${geocoded} geocoded`);
  console.log(`   - ${skipped} already had coords`);
  console.log(`   - ${failed} failed`);
}

main().catch(console.error);
