/**
 * Seed Supabase with data from JSON files.
 *
 * Prerequisites:
 *   1. Run migration 004_alter_for_migration.sql on your Supabase project
 *   2. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in app/.env
 *
 * Usage:
 *   npx tsx scripts/seed-supabase.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Load environment variables from app/.env ──────────────────

const envPath = resolve(__dirname, "../app/.env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} catch {
  console.error(`Could not read ${envPath}. Make sure app/.env exists.`);
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in app/.env"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── Types for JSON data ───────────────────────────────────────

interface JsonLieu {
  id: string;
  nom: string;
  slug: string;
  type: string;
  categorie: string;
  sous_categories: string[];
  adresse: string;
  arrondissement: string | null;
  quartier: string | null;
  coordonnees: { lat: number; lng: number } | null;
  note: number | null;
  prix: {
    fourchette: string;
    pinte_moy: number | null;
    cocktail_moy: number | null;
    entree?: string;
  };
  musique: string[];
  specificites: string[];
  clientele: string | null;
  capacite: number | null;
  horaires: Record<string, unknown> | null;
  description: string;
  resume_avis: string | null;
  photos: string[];
  photo_cover: string | null;
  site_web: string | null;
  instagram: string | null;
  google_maps: string | null;
  telephone: string | null;
  sources: string[];
  date_maj: string;
  happy_hours?: {
    jours: string[];
    heure_debut: string;
    heure_fin: string;
    offre: string;
  } | null;
}

interface JsonEvent {
  id: string;
  lieu_id: string;
  titre: string;
  description: string;
  date: string;
  heure_debut: string;
  heure_fin?: string;
  type: string;
  prix_entree?: string;
  artiste?: string;
  image?: string;
  source?: string;
  url?: string;
  lieu_nom?: string;
}

// ── Helpers ───────────────────────────────────────────────────

const BATCH_SIZE = 50;

function lieuToRow(l: JsonLieu) {
  return {
    old_id: l.id,
    nom: l.nom,
    slug: l.slug,
    type: l.type,
    categorie: l.categorie || "",
    sous_categories: l.sous_categories || [],
    adresse: l.adresse || "",
    arrondissement: l.arrondissement,
    quartier: l.quartier,
    lat: l.coordonnees?.lat ?? null,
    lng: l.coordonnees?.lng ?? null,
    note: l.note != null ? Math.round(l.note * 10) / 10 : null,
    prix_fourchette: l.prix?.fourchette || null,
    prix_pinte_moy: l.prix?.pinte_moy ?? null,
    prix_cocktail_moy: l.prix?.cocktail_moy ?? null,
    prix_entree: l.prix?.entree || null,
    musique: l.musique || [],
    specificites: l.specificites || [],
    clientele: l.clientele,
    capacite: l.capacite,
    horaires: l.horaires || null,
    description: l.description || "",
    resume_avis: l.resume_avis,
    photos: l.photos || [],
    photo_cover: l.photo_cover,
    site_web: l.site_web,
    instagram: l.instagram,
    google_maps: l.google_maps,
    telephone: l.telephone,
    sources: l.sources || [],
  };
}

// ── Main seed function ────────────────────────────────────────

async function seed() {
  const dataDir = resolve(__dirname, "../data");

  // Load JSON data
  console.log("Loading JSON data...");
  const lieux: JsonLieu[] = JSON.parse(
    readFileSync(resolve(dataDir, "merged-geocoded.json"), "utf-8")
  );
  const events: JsonEvent[] = JSON.parse(
    readFileSync(resolve(dataDir, "events.json"), "utf-8")
  );
  console.log(`  Found ${lieux.length} lieux and ${events.length} events`);

  // Clear existing data (order matters for FK constraints)
  console.log("\nClearing existing data...");
  const { error: delHH } = await supabase
    .from("happy_hours")
    .delete()
    .not("id", "is", null);
  if (delHH) console.warn("  Warning clearing happy_hours:", delHH.message);

  const { error: delEv } = await supabase
    .from("evenements")
    .delete()
    .not("id", "is", null);
  if (delEv) console.warn("  Warning clearing evenements:", delEv.message);

  const { error: delLx } = await supabase
    .from("lieux")
    .delete()
    .not("id", "is", null);
  if (delLx) console.warn("  Warning clearing lieux:", delLx.message);
  console.log("  Done.");

  // Insert lieux in batches
  console.log("\nInserting lieux...");
  for (let i = 0; i < lieux.length; i += BATCH_SIZE) {
    const batch = lieux.slice(i, i + BATCH_SIZE).map(lieuToRow);
    const { error } = await supabase.from("lieux").insert(batch);
    if (error) {
      console.error(
        `  Error at batch ${i}-${i + batch.length}:`,
        error.message
      );
      // Log the first failing row for debugging
      console.error("  First row in batch:", JSON.stringify(batch[0], null, 2));
      throw error;
    }
    process.stdout.write(
      `  ${Math.min(i + BATCH_SIZE, lieux.length)}/${lieux.length}\r`
    );
  }
  console.log(`  Inserted ${lieux.length} lieux.`);

  // Build old_id → UUID mapping
  console.log("\nBuilding ID mapping...");
  const { data: allLieux, error: mapError } = await supabase
    .from("lieux")
    .select("id, old_id");

  if (mapError) throw mapError;

  const idMap = new Map<string, string>();
  for (const l of allLieux || []) {
    if (l.old_id) idMap.set(l.old_id, l.id);
  }
  console.log(`  Mapped ${idMap.size} old IDs → UUIDs.`);

  // Insert happy hours
  const lieuxWithHH = lieux.filter(
    (l) => l.happy_hours && l.happy_hours.jours?.length
  );
  if (lieuxWithHH.length > 0) {
    console.log(`\nInserting ${lieuxWithHH.length} happy hours...`);
    const hhRows = lieuxWithHH
      .map((l) => {
        const uuid = idMap.get(l.id);
        if (!uuid || !l.happy_hours) return null;
        return {
          lieu_id: uuid,
          jours: l.happy_hours.jours,
          heure_debut: l.happy_hours.heure_debut,
          heure_fin: l.happy_hours.heure_fin,
          offre: l.happy_hours.offre || "",
        };
      })
      .filter(Boolean);

    for (let i = 0; i < hhRows.length; i += BATCH_SIZE) {
      const batch = hhRows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("happy_hours").insert(batch);
      if (error) console.warn("  HH batch error:", error.message);
    }
    console.log(`  Inserted ${hhRows.length} happy hours.`);
  }

  // Insert events in batches
  console.log("\nInserting events...");
  let skipped = 0;

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    const rows = batch.map((e) => {
      const mappedLieuId =
        e.lieu_id && e.lieu_id.length > 0 ? idMap.get(e.lieu_id) ?? null : null;
      if (e.lieu_id && e.lieu_id.length > 0 && !mappedLieuId) {
        skipped++;
      }
      return {
        old_id: e.id,
        lieu_id: mappedLieuId,
        titre: e.titre || "",
        description: e.description || "",
        date: e.date,
        heure_debut: e.heure_debut || null,
        heure_fin: e.heure_fin || null,
        type: e.type || "autre",
        prix_entree: e.prix_entree || null,
        artiste: e.artiste || null,
        image: e.image || null,
        source: e.source || null,
        url: e.url || null,
        lieu_nom: e.lieu_nom || null,
      };
    });

    const { error } = await supabase.from("evenements").insert(rows);
    if (error) {
      console.error(
        `  Error at batch ${i}-${i + rows.length}:`,
        error.message
      );
      throw error;
    }
    process.stdout.write(
      `  ${Math.min(i + BATCH_SIZE, events.length)}/${events.length}\r`
    );
  }
  console.log(`  Inserted ${events.length} events.`);
  if (skipped > 0) {
    console.log(
      `  (${skipped} events had a lieu_id that couldn't be mapped — lieu_id set to null)`
    );
  }

  // Summary
  console.log("\n✓ Seed complete!");
  console.log(`  ${lieux.length} lieux`);
  console.log(`  ${events.length} events`);
  console.log(`  ${lieuxWithHH.length} happy hours`);
  console.log("\nNext steps:");
  console.log("  1. Add DATA_SOURCE=supabase to app/.env");
  console.log("  2. Restart the dev server");
}

seed().catch((err) => {
  console.error("\nSeed failed:", err);
  process.exit(1);
});
