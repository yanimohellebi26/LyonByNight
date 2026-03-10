/**
 * generate-descriptions.ts — Generate French descriptions for all venues using Gemini.
 * Reads enriched data from merged-geocoded.json and updates descriptions in-place.
 *
 * Usage: npx tsx scripts/generate-descriptions.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const INPUT = join(DATA_DIR, "merged-geocoded.json");

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
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
        env[key] = val;
      }
    } catch { /* skip */ }
  }
  return env;
}

const envFile = loadEnv();
const GEMINI_KEY = process.env["GEMINI_API_KEY"] ?? envFile["GEMINI_API_KEY"];
if (!GEMINI_KEY) throw new Error("Missing GEMINI_API_KEY");

interface Lieu {
  nom: string;
  type: string;
  categorie: string;
  specificites: string[];
  musique: string[];
  quartier: string | null;
  arrondissement: string | null;
  note: number | null;
  prix: { fourchette: string };
  resume_avis: string | null;
  description: string;
  [key: string]: unknown;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function geminiDescriptions(batch: Lieu[]): Promise<string[]> {
  const prompt = `Tu es un expert des bars et clubs de Lyon. Pour chaque lieu ci-dessous, écris une description attrayante en français de 2-3 phrases (max 250 caractères). Mentionne l'ambiance, les spécialités et ce qui rend le lieu unique. Sois précis et authentique, pas de clichés. Réponds UNIQUEMENT avec un JSON array de strings, une description par lieu, dans le même ordre. Pas de markdown, juste le JSON.

${batch.map((b, i) => `${i + 1}. "${b.nom}" — ${b.type} (${b.categorie}) à Lyon ${b.arrondissement ?? ""}. Spécificités: ${b.specificites.slice(0, 5).join(", ") || "aucune"}. Musique: ${b.musique.join(", ") || "variée"}. Avis: ${b.resume_avis?.slice(0, 150) ?? "N/A"}. Note: ${b.note ?? "N/A"}/5. Prix: ${b.prix.fourchette}`).join("\n")}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.warn(`  ⚠ Gemini HTTP ${res.status}: ${errText.slice(0, 200)}`);
    return [];
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.warn(`  ⚠ No JSON array in response`);
    return [];
  }

  try {
    return JSON.parse(jsonMatch[0]) as string[];
  } catch {
    console.warn(`  ⚠ Invalid JSON in response`);
    return [];
  }
}

async function main() {
  const lieux: Lieu[] = JSON.parse(readFileSync(INPUT, "utf-8"));

  console.log(`\n✍ Generating descriptions for ${lieux.length} venues with Gemini 2.5 Flash...\n`);

  const BATCH = 20;
  let updated = 0;

  for (let i = 0; i < lieux.length; i += BATCH) {
    const batch = lieux.slice(i, i + BATCH);
    const end = Math.min(i + BATCH, lieux.length);
    console.log(`  [${i + 1}-${end}/${lieux.length}]`);

    const descriptions = await geminiDescriptions(batch);

    if (descriptions.length > 0) {
      for (let j = 0; j < Math.min(batch.length, descriptions.length); j++) {
        if (descriptions[j] && descriptions[j].length > 20) {
          lieux[i + j]!.description = descriptions[j];
          updated++;
        }
      }
      console.log(`     ✅ ${descriptions.length} descriptions`);
    } else {
      console.log(`     ⚠ Failed — keeping existing descriptions`);
    }

    await sleep(2000); // rate limit
  }

  writeFileSync(INPUT, JSON.stringify(lieux, null, 2), "utf-8");
  console.log(`\n✅ Updated ${updated}/${lieux.length} descriptions → ${INPUT}`);
}

main().catch(console.error);
