/**
 * Add enrichment venue files to the merged-geocoded.json database.
 * Usage: npx tsx scripts/add-enrichments.ts data/enrichments/lyon-7e.json
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"), "..", "data");
const DB_PATH = join(DATA_DIR, "merged-geocoded.json");

interface EnrichmentEntry {
  nom: string;
  adresse: string;
  arrondissement: string | null;
  quartier: string | null;
  type: string;
  categorie: string;
  sous_categories: string[];
  note_google: number | null;
  musique: string[];
  prix: {
    fourchette: string;
    pinte_moy: number | null;
    cocktail_moy: number | null;
  };
  specificites: string[];
  horaires: string | null;
  google_maps: string | null;
  website: string | null;
  instagram: string | null;
  telephone: string | null;
  clientele: string | null;
  description: string | null;
  photos_source: string[];
}

interface MergedLieu {
  id: string;
  nom: string;
  slug: string;
  [key: string]: unknown;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function main() {
  const inputFile = process.argv[2];
  if (!inputFile) {
    // If no file specified, process all files in data/enrichments/
    const enrichDir = join(DATA_DIR, "enrichments");
    try {
      const files = readdirSync(enrichDir).filter(f => f.endsWith(".json"));
      if (files.length === 0) {
        console.log("No enrichment files found in data/enrichments/");
        return;
      }
      for (const file of files) {
        processFile(join(enrichDir, file));
      }
    } catch {
      console.error("No data/enrichments/ directory found");
      return;
    }
  } else {
    processFile(inputFile);
  }
}

function processFile(filePath: string) {
  console.log(`\n📂 Processing: ${filePath}`);

  const db: MergedLieu[] = JSON.parse(readFileSync(DB_PATH, "utf-8"));
  const entries: EnrichmentEntry[] = JSON.parse(readFileSync(filePath, "utf-8"));

  const existingNames = new Set(db.map(l => normalize(l.nom)));
  const existingSlugs = new Set(db.map(l => l.slug));

  // Find max numeric ID
  let maxId = 0;
  for (const l of db) {
    const match = l.id.match(/\d+/);
    if (match) maxId = Math.max(maxId, parseInt(match[0], 10));
  }

  let added = 0;
  let skipped = 0;
  const now = new Date().toISOString().split("T")[0];

  for (const entry of entries) {
    const key = normalize(entry.nom);
    if (existingNames.has(key)) {
      console.log(`  ⏭ Already exists: ${entry.nom}`);
      skipped++;
      continue;
    }

    maxId++;
    let slug = slugify(entry.nom);
    if (existingSlugs.has(slug)) {
      slug = `${slug}-${entry.arrondissement ?? maxId}`;
    }

    const lieu: MergedLieu = {
      id: `enrich-${maxId}`,
      nom: entry.nom,
      slug,
      type: entry.type,
      categorie: entry.categorie,
      sous_categories: entry.sous_categories,
      adresse: entry.adresse,
      arrondissement: entry.arrondissement,
      quartier: entry.quartier,
      coordonnees: null,
      note: entry.note_google,
      prix: {
        fourchette: entry.prix.fourchette,
        pinte_moy: entry.prix.pinte_moy,
        cocktail_moy: entry.prix.cocktail_moy,
      },
      musique: entry.musique,
      specificites: entry.specificites,
      clientele: entry.clientele,
      capacite: null,
      horaires: entry.horaires ? { texte: entry.horaires } : null,
      description: entry.description,
      resume_avis: null,
      photos: entry.photos_source,
      photo_cover: entry.photos_source[0] ?? null,
      site_web: entry.website,
      instagram: entry.instagram,
      google_maps: entry.google_maps,
      telephone: entry.telephone,
      evenements: [],
      happy_hours: null,
      sources: ["enrichment"],
      date_maj: now,
    };

    db.push(lieu);
    existingNames.add(key);
    existingSlugs.add(slug);
    added++;
    console.log(`  ✅ Added: ${entry.nom} (${slug})`);
  }

  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  console.log(`\n✅ Done: ${added} added, ${skipped} skipped`);
  console.log(`   Total venues in DB: ${db.length}`);
}

main();
