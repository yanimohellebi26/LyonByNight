/**
 * Recalibrate venue ratings using asymmetric Bayesian correction.
 *
 * Problem: Many venues have inflated 5.0 ratings with minimal data,
 * while well-established venues cluster at 4.0-4.5. This creates
 * poor differentiation.
 *
 * Solution:
 * - Above the mean: Bayesian average pulls low-confidence ratings down
 * - Below the mean: minimal adjustment (low ratings are more likely genuine)
 * - High-confidence venues: barely affected regardless of direction
 *
 * Run: npx tsx scripts/recalibrate-ratings.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

interface Lieu {
  id: string;
  nom: string;
  note: number | null;
  note_originale?: number | null;
  specificites: string[];
  photos: string[];
  sources: string;
  horaires: { texte?: string } | null;
  site_web: string | null;
  resume_avis: string | null;
  musique: string[];
  clientele: string | null;
  prix: { fourchette: string; pinte_moy: number | null; cocktail_moy: number | null };
  [key: string]: unknown;
}

/**
 * Compute a confidence score (0–12) based on data completeness.
 * More complete venues get higher confidence → their original rating stays.
 * Sparse venues get low confidence → pulled toward the mean.
 */
function computeConfidence(l: Lieu): number {
  let score = 0;

  // Specificites richness (0–4 points)
  score += Math.min(l.specificites?.length ?? 0, 8) / 2;

  // Photos (0–2 points)
  score += Math.min(l.photos?.length ?? 0, 4) / 2;

  // Multiple sources = cross-validated (0–2 points)
  const sourceCount = Array.isArray(l.sources)
    ? l.sources.length
    : typeof l.sources === "string"
      ? l.sources.split(/\s+/).filter(Boolean).length
      : 0;
  score += Math.min(sourceCount, 2);

  // Has structured hours (0–1 point)
  if (l.horaires?.texte) score += 1;

  // Has website (0–1 point)
  if (l.site_web) score += 1;

  // Has music genres listed (0–1 point)
  if (l.musique?.length > 0) score += 1;

  // Has clientele info (0–0.5 point)
  if (l.clientele) score += 0.5;

  // Has price details (0–0.5 point)
  if (l.prix?.pinte_moy || l.prix?.cocktail_moy) score += 0.5;

  return score; // max ~12
}

/* ─── Run ─── */

const dataPath = resolve(__dirname, "../app/data/merged-geocoded.json");
const data: Lieu[] = JSON.parse(readFileSync(dataPath, "utf-8"));

// Compute global mean from rated venues
const rated = data.filter((l) => l.note !== null && l.note > 0);
const globalMean = rated.reduce((sum, l) => sum + l.note!, 0) / rated.length;

// C = confidence threshold for above-mean venues.
// C_low = much smaller threshold for below-mean venues (less correction).
const C_HIGH = 5;
const C_LOW = 1.5;

console.log(`Global mean: ${globalMean.toFixed(2)} (${rated.length} rated venues)`);
console.log(`Confidence threshold: ${C_HIGH} (above mean), ${C_LOW} (below mean)\n`);

let adjustedCount = 0;
const changes: { nom: string; original: number; adjusted: number; conf: number }[] = [];

for (const lieu of data) {
  if (lieu.note === null || lieu.note === 0) continue;

  const original = lieu.note;
  const confidence = computeConfidence(lieu);

  // Use asymmetric correction:
  // - Above mean: stronger pull toward mean (C_HIGH) to deflate unreliable high ratings
  // - Below mean: weaker pull (C_LOW) to preserve genuinely bad ratings
  const C = original > globalMean ? C_HIGH : C_LOW;
  const adjusted = (confidence * original + C * globalMean) / (confidence + C);

  // Round to 1 decimal
  const adjustedRounded = Math.round(adjusted * 10) / 10;

  // Preserve original rating
  lieu.note_originale = original;
  lieu.note = adjustedRounded;

  if (Math.abs(adjustedRounded - original) >= 0.1) {
    adjustedCount++;
    changes.push({ nom: lieu.nom, original, adjusted: adjustedRounded, conf: confidence });
  }
}

writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf-8");
console.log(`✓ Adjusted ${adjustedCount} ratings (${rated.length - adjustedCount} unchanged)`);
console.log(`✓ Written to ${dataPath}`);

// Stats
const newRated = data.filter((l) => l.note !== null && l.note > 0);
const newMean = newRated.reduce((sum, l) => sum + l.note!, 0) / newRated.length;
const newFives = newRated.filter((l) => l.note! >= 4.9).length;
const newFourPlus = newRated.filter((l) => l.note! >= 4).length;

console.log(`\n─── Distribution after recalibration ───`);
console.log(`New mean: ${newMean.toFixed(2)} (was ${globalMean.toFixed(2)})`);
console.log(`5.0 stars: ${newFives} (was 46)`);
console.log(`4.0+ stars: ${newFourPlus} (was 429)`);

// Show biggest changes
changes.sort((a, b) => Math.abs(b.original - b.adjusted) - Math.abs(a.original - a.adjusted));
console.log(`\n─── Biggest adjustments (top 15) ───`);
for (const c of changes.slice(0, 15)) {
  const dir = c.adjusted > c.original ? "↑" : "↓";
  console.log(
    `  ${c.nom}: ${c.original.toFixed(1)} → ${c.adjusted.toFixed(1)} ${dir} (confidence: ${c.conf.toFixed(1)})`
  );
}

// Show that well-known places are preserved
console.log(`\n─── Least adjusted (well-established venues) ───`);
const leastChanged = changes.filter((c) => c.conf >= 8).slice(0, 5);
for (const c of leastChanged) {
  console.log(
    `  ${c.nom}: ${c.original.toFixed(1)} → ${c.adjusted.toFixed(1)} (confidence: ${c.conf.toFixed(1)})`
  );
}
