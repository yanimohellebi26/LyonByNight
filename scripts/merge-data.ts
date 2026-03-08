/**
 * merge-data.ts — Fusionne liste1.json + liste2.json + liste3.json
 * en un fichier unifié data/merged.json au format Lieu[].
 *
 * Usage: npx tsx scripts/merge-data.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// ============================================================
// Types locaux pour les données brutes
// ============================================================

interface L1Entry {
  nom: string;
  note: number;
  gamme_prix: string;
  style_musique: string;
  specificites: string[];
  adresse: string;
  site_web: string;
}

interface L2Entry {
  nom: string;
  arrondissement: string;
  note: string;
  musique: string;
  prix_pinte: string;
  specificite: string;
}

interface L3Entry {
  id: number;
  nom: string;
  categorie: string;
  sous_categories: string[];
  adresse: string;
  arrondissement: string | null;
  quartier: string | null;
  note_google: number;
  musique: string[];
  prix: {
    fourchette: string;
    pinte_moy: number | null;
    cocktail_moy: number | null;
    entree?: string;
  };
  specificites: string[];
  horaires: string;
  google_maps: string;
  website: string | null;
  instagram: string | null;
  clientele: string;
  capacite?: number;
}

interface MergedLieu {
  id: string;
  nom: string;
  slug: string;
  type: "bar" | "club";
  categorie: string;
  sous_categories: string[];
  adresse: string;
  arrondissement: string | null;
  quartier: string | null;
  coordonnees: null;
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
  evenements: [];
  happy_hours: null;
  sources: string[];
  date_maj: string;
}

// ============================================================
// Helpers
// ============================================================

const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function parsePriceRange(raw: string): "€" | "€€" | "€€€" {
  if (raw.includes("€€€") || raw.includes("20–30") || raw.includes("20-30")) return "€€€";
  if (raw.includes("€€") || raw.includes("10–20") || raw.includes("10-20")) return "€€";
  return "€";
}

function parseNote(raw: string | number | null): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return raw;
  const s = String(raw);
  if (s === "N/D") return null;
  // "4.3/5" → 4.3
  const match5 = s.match(/([\d.]+)\s*\/\s*5/);
  if (match5) return parseFloat(match5[1]);
  // "9.3/10" → 4.65
  const match10 = s.match(/([\d.]+)\s*\/\s*10/);
  if (match10) return parseFloat(match10[1]) / 2;
  const num = parseFloat(s);
  return isNaN(num) ? null : num;
}

function parsePintePrix(raw: string): number | null {
  if (!raw || raw === "N/D") return null;
  const match = raw.match(/([\d.,]+)/);
  if (!match) return null;
  return parseFloat(match[1].replace(",", "."));
}

function parseMusique(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,/&]/)
    .map((s) => s.replace(/\s*\(.*?\)\s*/g, "").trim())
    .filter(Boolean);
}

function extractArrondissement(adresse: string): string | null {
  // "56 Rue Ney, 69006 Lyon" → "6e"
  const matchZip = adresse.match(/690(\d{2})/);
  if (matchZip) {
    const num = parseInt(matchZip[1], 10);
    if (num >= 1 && num <= 9) return `${num}${num === 1 ? "er" : "e"}`;
  }
  // "Lyon 7" → "7e"
  const matchLyon = adresse.match(/Lyon\s+(\d+)/i);
  if (matchLyon) {
    const num = parseInt(matchLyon[1], 10);
    return `${num}${num === 1 ? "er" : "e"}`;
  }
  return null;
}

function extractArrFromL2(raw: string): string | null {
  // "Lyon 7" → "7e"
  const match = raw.match(/Lyon\s+(\d+)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    return `${num}${num === 1 ? "er" : "e"}`;
  }
  return null;
}

function inferType(entry: { categorie?: string; sous_categories?: string[]; nom?: string }): "bar" | "club" {
  const cat = (entry.categorie ?? "").toLowerCase();
  const subs = (entry.sous_categories ?? []).map((s) => s.toLowerCase());
  if (cat === "club" || subs.some((s) => s.includes("club") || s.includes("discothèque"))) return "club";
  return "bar";
}

function inferCategorie(entry: { specificites?: string[]; sous_categories?: string[]; style_musique?: string }): string {
  const subs = (entry.sous_categories ?? []).join(" ").toLowerCase();
  const specs = (entry.specificites ?? []).join(" ").toLowerCase();
  const music = (entry.style_musique ?? "").toLowerCase();

  if (subs.includes("cocktail") || subs.includes("speakeasy") || specs.includes("cocktail")) return "Cocktail & Speakeasy";
  if (subs.includes("péniche") || specs.includes("péniche")) return "Péniche";
  if (subs.includes("rooftop") || specs.includes("rooftop")) return "Rooftop & Bar à vins";
  if (subs.includes("pub") || subs.includes("irlandais") || subs.includes("écossais")) return "Pub";
  if (subs.includes("lgbt") || specs.includes("gay") || specs.includes("lgbtq")) return "LGBT-friendly";
  if (subs.includes("bière") || specs.includes("bière") || specs.includes("craft")) return "Bar à bières";
  if (music.includes("latino") || music.includes("salsa") || music.includes("reggaeton")) return "Latino";
  if (specs.includes("jeux") || specs.includes("ludothèque") || specs.includes("geek")) return "Bar à jeux";
  if (subs.includes("club") || subs.includes("discothèque")) return "Club";
  if (specs.includes("vin") || subs.includes("vin")) return "Bar à vins";
  return "Bar";
}

// ============================================================
// Main merge logic
// ============================================================

function loadJSON<T>(filename: string): T {
  const raw = readFileSync(join(DATA_DIR, filename), "utf-8");
  return JSON.parse(raw) as T;
}

function main() {
  const now = new Date().toISOString().split("T")[0];
  const seen = new Map<string, MergedLieu>();

  // ---- liste3.json (richest schema, process first) ----
  const l3Data = loadJSON<{ categorie: string; etablissements: L3Entry[] }[]>("liste3.json");
  for (const cat of l3Data) {
    for (const e of cat.etablissements) {
      const key = normalize(e.nom);
      const lieu: MergedLieu = {
        id: `l3-${e.id}`,
        nom: e.nom,
        slug: slugify(e.nom),
        type: e.categorie === "club" ? "club" : inferType({ categorie: e.categorie, sous_categories: e.sous_categories }),
        categorie: cat.categorie,
        sous_categories: [...e.sous_categories],
        adresse: e.adresse,
        arrondissement: e.arrondissement,
        quartier: e.quartier,
        coordonnees: null,
        note: e.note_google,
        prix: {
          fourchette: (e.prix.fourchette as "€" | "€€" | "€€€") || "€€",
          pinte_moy: e.prix.pinte_moy,
          cocktail_moy: e.prix.cocktail_moy,
          entree: e.prix.entree,
        },
        musique: [...e.musique],
        specificites: [...e.specificites],
        clientele: e.clientele,
        capacite: e.capacite ?? null,
        horaires: e.horaires ? { texte: e.horaires } : null,
        description: e.specificites.join(". ") + ".",
        resume_avis: null,
        photos: [],
        photo_cover: null,
        site_web: e.website,
        instagram: e.instagram,
        google_maps: e.google_maps,
        telephone: null,
        evenements: [],
        happy_hours: null,
        sources: ["liste3"],
        date_maj: now,
      };
      seen.set(key, lieu);
    }
  }

  // ---- liste1.json (enrich or add) ----
  const l1Data = loadJSON<{ bars: L1Entry[]; clubs: L1Entry[] }>("liste1.json");
  const l1All = [
    ...l1Data.bars.map((e) => ({ ...e, _section: "bars" as const })),
    ...l1Data.clubs.map((e) => ({ ...e, _section: "clubs" as const })),
  ];

  for (const e of l1All) {
    const key = normalize(e.nom);
    if (seen.has(key)) {
      // Enrich existing entry
      const existing = seen.get(key)!;
      const enriched: MergedLieu = {
        ...existing,
        site_web: existing.site_web ?? e.site_web ?? null,
        note: existing.note ?? e.note ?? null,
        adresse: existing.adresse.length < 10 ? e.adresse : existing.adresse,
        arrondissement: existing.arrondissement ?? extractArrondissement(e.adresse),
        sources: [...existing.sources, "liste1"],
      };
      seen.set(key, enriched);
    } else {
      // New entry
      const lieu: MergedLieu = {
        id: `l1-${key}`,
        nom: e.nom,
        slug: slugify(e.nom),
        type: e._section === "clubs" ? "club" : "bar",
        categorie: inferCategorie({ specificites: e.specificites, style_musique: e.style_musique }),
        sous_categories: [],
        adresse: e.adresse,
        arrondissement: extractArrondissement(e.adresse),
        quartier: null,
        coordonnees: null,
        note: e.note,
        prix: {
          fourchette: parsePriceRange(e.gamme_prix),
          pinte_moy: null,
          cocktail_moy: null,
        },
        musique: parseMusique(e.style_musique),
        specificites: [...e.specificites],
        clientele: null,
        capacite: null,
        horaires: null,
        description: e.specificites.join(". ") + ".",
        resume_avis: null,
        photos: [],
        photo_cover: null,
        site_web: e.site_web || null,
        instagram: null,
        google_maps: null,
        telephone: null,
        evenements: [],
        happy_hours: null,
        sources: ["liste1"],
        date_maj: now,
      };
      seen.set(key, lieu);
    }
  }

  // ---- liste2.json (enrich or add) ----
  const l2Data = loadJSON<{ categories: { id: string; nom: string; etablissements: L2Entry[] | string }[] }>("liste2.json");
  for (const cat of l2Data.categories) {
    if (!Array.isArray(cat.etablissements)) continue;
    for (const e of cat.etablissements) {
      const key = normalize(e.nom);
      if (seen.has(key)) {
        const existing = seen.get(key)!;
        const enriched: MergedLieu = {
          ...existing,
          arrondissement: existing.arrondissement ?? extractArrFromL2(e.arrondissement),
          note: existing.note ?? parseNote(e.note),
          prix: {
            ...existing.prix,
            pinte_moy: existing.prix.pinte_moy ?? parsePintePrix(e.prix_pinte),
          },
          sources: [...existing.sources, "liste2"],
        };
        seen.set(key, enriched);
      } else {
        const lieu: MergedLieu = {
          id: `l2-${key}`,
          nom: e.nom,
          slug: slugify(e.nom),
          type: cat.nom.toLowerCase().includes("club") ? "club" : "bar",
          categorie: cat.nom,
          sous_categories: [],
          adresse: `${e.arrondissement}`,
          arrondissement: extractArrFromL2(e.arrondissement),
          quartier: null,
          coordonnees: null,
          note: parseNote(e.note),
          prix: {
            fourchette: parsePintePrix(e.prix_pinte) !== null
              ? parsePintePrix(e.prix_pinte)! <= 5 ? "€" : "€€"
              : "€€",
            pinte_moy: parsePintePrix(e.prix_pinte),
            cocktail_moy: null,
          },
          musique: parseMusique(e.musique),
          specificites: e.specificite ? [e.specificite] : [],
          clientele: null,
          capacite: null,
          horaires: null,
          description: e.specificite || "",
          resume_avis: null,
          photos: [],
          photo_cover: null,
          site_web: null,
          instagram: null,
          google_maps: null,
          telephone: null,
          evenements: [],
          happy_hours: null,
          sources: ["liste2"],
          date_maj: now,
        };
        seen.set(key, lieu);
      }
    }
  }

  // ---- Generate final array ----
  const merged = Array.from(seen.values());

  // Ensure unique slugs
  const slugCount = new Map<string, number>();
  for (const lieu of merged) {
    const count = slugCount.get(lieu.slug) ?? 0;
    slugCount.set(lieu.slug, count + 1);
    if (count > 0) {
      lieu.slug = `${lieu.slug}-${count + 1}`;
    }
  }

  // Write output
  mkdirSync(DATA_DIR, { recursive: true });
  const outPath = join(DATA_DIR, "merged.json");
  writeFileSync(outPath, JSON.stringify(merged, null, 2), "utf-8");

  console.log(`✅ Merged ${merged.length} lieux → ${outPath}`);
  console.log(`   - liste3: ${l3Data.reduce((n, c) => n + c.etablissements.length, 0)} entries`);
  console.log(`   - liste1: ${l1All.length} entries`);
  console.log(`   - liste2: ${l2Data.categories.reduce((n, c) => n + (Array.isArray(c.etablissements) ? c.etablissements.length : 0), 0)} entries`);

  // Stats
  const bars = merged.filter((l) => l.type === "bar").length;
  const clubs = merged.filter((l) => l.type === "club").length;
  const withAddr = merged.filter((l) => l.adresse && l.adresse.includes("69")).length;
  console.log(`   - ${bars} bars, ${clubs} clubs`);
  console.log(`   - ${withAddr} with full address (geocodable)`);
}

main();
