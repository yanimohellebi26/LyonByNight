/**
 * generate-fallback-photos.ts — Generate themed fallback photos for venues
 * that still have no photo after fetch-photos.ts, using DALL-E 3.
 *
 * Strategy:
 *  1. Generate a pool of ~5-10 photos per category via DALL-E 3
 *  2. Upload each to Cloudinary
 *  3. Assign round-robin to venues without photos
 *
 * Run AFTER fetch-photos.ts completes.
 * Usage: npx tsx scripts/generate-fallback-photos.ts
 *
 * Cost estimate: ~60-80 images × $0.04 = ~$2.50-3.20
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = join(__dirname, "..");
const DATA_PATH = join(ROOT, "data", "merged-geocoded.json");
const POOL_CACHE_PATH = join(ROOT, "data", "photo-pool-cache.json");
const ENV_PATH = join(ROOT, "app", ".env");
const IMAGES_DIR = join(ROOT, "app", "public", "images", "themed");

function loadEnv(envPath: string): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  } catch {
    // .env not found
  }
  return env;
}

const envFile = loadEnv(ENV_PATH);
function getEnv(key: string): string {
  const v = process.env[key] ?? envFile[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

const OPENAI_API_KEY = getEnv("OPENAI_API_KEY");

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
  specificites: string[];
  musique: string[];
  photo_cover: string | null;
  photos: string[];
  [key: string]: unknown;
}

interface PhotoPool {
  [category: string]: string[]; // Cloudinary URLs
}

// ---------------------------------------------------------------------------
// DALL-E 3 prompts per category
// ---------------------------------------------------------------------------

const CATEGORY_PROMPTS: Record<string, string[]> = {
  "Bars à cocktails & Speakeasy": [
    "Interior photograph of an elegant speakeasy cocktail bar, dim amber lighting, art deco details, crystal glassware, dark wood bar counter, vintage glamour atmosphere, no text no watermark",
    "Moody cocktail bar interior, expert bartender crafting drinks behind marble counter, low hanging pendant lights, shelves of premium spirits, intimate sophisticated atmosphere, no text",
    "Hidden speakeasy bar with velvet curtains, exposed brick, candlelit tables, craft cocktails on counter, 1920s inspired decor, warm golden tones, no text",
    "Stylish cocktail lounge with leather booths, dramatic lighting, colorful artisan cocktails on bar, mirrored shelves with bottles, upscale nightlife, no text",
    "Intimate underground cocktail bar, barrel-aged spirits display, copper accents, botanical garnishes, mixology tools, moody blue-amber lighting, no text",
    "Art nouveau cocktail bar interior, ornate ceiling, polished brass fixtures, elegant glassware arrangement, premium spirits wall, soft warm lighting, no text",
  ],

  "Clubs & Boîtes de nuit": [
    "Vibrant nightclub interior, colorful LED light beams, DJ booth with turntables, energetic dance floor, neon accents, party atmosphere, no text",
    "Modern nightclub with laser light show, packed dance floor, professional DJ setup, deep blue and purple lighting, electronic music venue, no text",
    "Underground techno club, industrial raw aesthetic, strobe lights, concrete walls, minimal design, intense red and blue lighting, no text",
    "Sleek VIP nightclub area, bottle service tables, dramatic spotlights, luxurious interior, velvet ropes, purple ambient lighting, no text",
    "Large nightclub dance floor from DJ perspective, massive LED wall behind booth, crowd silhouettes, electric atmosphere, no text",
    "Warehouse-style club venue, exposed metal beams, fog machine effects, green and blue laser patterns, raw industrial nightlife, no text",
  ],

  "Rooftops & Bars à vins": [
    "Rooftop wine bar terrace at golden hour sunset, panoramic city skyline view, wine glasses on elegant table, string lights, warm evening ambiance, no text",
    "Cozy wine bar interior, rustic wooden shelves lined with bottles, candlelit atmosphere, cheese board on counter, warm brick walls, intimate feel, no text",
    "Modern rooftop bar with city views at dusk, comfortable lounge seating, wine and charcuterie, soft lighting, sophisticated outdoor dining, no text",
    "Natural wine bar with minimalist design, exposed stone walls, curated bottle selection, terracotta tones, wooden tables, artisanal atmosphere, no text",
    "Elegant rooftop terrace bar overlooking river and old town at twilight, fairy lights, potted plants, cocktail glasses, romantic setting, no text",
    "Charming French cave à vin interior, wine barrels, tasting counter, chalk menu board, rustic cellar ambiance, warm yellow lighting, no text",
  ],

  "Pubs irlandais/écossais & Bars Vieux Lyon": [
    "Traditional Irish pub interior, warm dark wood paneling, beer taps row, cozy fireplace, vintage signs, pub atmosphere, warm golden lighting, no text",
    "Classic Scottish pub with tartan accents, whisky collection behind bar, oak counter, brass fittings, stained glass, warm welcoming feel, no text",
    "Old town pub in medieval stone building, vaulted ceiling, heavy wooden tables, beer mugs, candle sconces, historic tavern atmosphere, no text",
    "Lively Irish pub with live music corner, guitar on wall, Guinness taps, wooden bar stools, friendly neighborhood pub feel, no text",
    "Authentic pub interior, dark wooden beams, collection of beer mats, dartboard, brass rail, frosted glass windows, traditional British pub, no text",
  ],

  "Bars à bières, Pubs & Bars insolites": [
    "Craft beer bar interior, row of artisan beer taps, industrial exposed brick, chalkboard menu, amber lighting, beer flight on counter, no text",
    "Quirky unusual themed bar interior, eclectic vintage decor, mismatched furniture, neon signs, creative atmosphere, craft beer selection, no text",
    "Microbrewery taproom, stainless steel brewing tanks visible, long wooden communal table, flight of craft beers, industrial chic, no text",
    "Bohemian beer bar with retro arcade games, colorful walls, unusual light fixtures, craft beer bottles display, hip alternative vibe, no text",
    "Belgian-style beer café, extensive tap list, monastic wood decor, chalice glasses, warm amber tones, cozy European beer hall, no text",
  ],

  "Bars Cosy & Afterworks": [
    "Cozy afterwork bar lounge, soft warm lighting, comfortable velvet sofas, candles on low tables, friends socializing, relaxed intimate atmosphere, no text",
    "Chic lounge bar with plush seating, soft jazz ambiance, wine glasses, dim pendant lights, elegant casual evening out, no text",
    "Warm neighborhood bar interior, exposed brick, wooden shelves with plants, soft ambient lighting, cocktails on rustic table, welcoming cozy feel, no text",
    "Modern lounge bar with fireplace, mid-century modern furniture, warm earth tones, book-lined walls, sophisticated relaxed evening, no text",
    "Intimate wine and tapas bar, small plates on wooden board, warm lighting, comfortable booth seating, afterwork gathering spot, no text",
  ],

  "Bars karaoké": [
    "Fun karaoke bar interior, colorful stage lights, microphone on stand, disco ball reflections, neon song lyrics screen, party atmosphere, no text",
    "Private karaoke room with plush seating, glowing LED walls, dual microphones, cocktail table, fun nightlife entertainment, no text",
    "Vibrant karaoke club with stage, colorful spotlights, tambourines and props, enthusiastic crowd, festive celebration mood, no text",
    "Retro karaoke lounge, 80s inspired neon decor, disco ball, velvet seating, cocktails, fun nostalgic nightlife, no text",
  ],

  "Bars sportifs": [
    "Sports bar interior with multiple large TV screens showing football match, beer on counter, team jerseys on walls, energetic game day atmosphere, no text",
    "Modern sports pub, big projection screen, billiard table, draft beer taps, sports memorabilia, lively crowd watching game, no text",
    "American-style sports bar, wall of screens, nachos and wings on table, cold beer mugs, pennants and caps decor, game night, no text",
  ],

  "Bars & Clubs LGBT-friendly": [
    "Vibrant inclusive nightlife bar, rainbow accents in elegant decor, colorful ambient lighting, dance floor, festive welcoming atmosphere, no text",
    "Stylish LGBTQ-friendly lounge, pride flag colors in subtle lighting, modern interior, cocktails, warm inclusive community vibe, no text",
    "Energetic queer nightclub, dramatic purple and pink lights, DJ booth, lively dance floor, celebration of diversity, no text",
  ],

  "Clubs & Bars Dansants": [
    "Dance bar interior, small dance floor with colored lights, DJ playing vinyl, energetic crowd, festive Latin music atmosphere, no text",
    "Trendy dance club with live DJ, mirror ball, moving colored lights, people dancing salsa, warm nightlife energy, no text",
    "Underground dance bar, exposed concrete, minimal red and blue lighting, turntable setup, alternative music venue, raw energy, no text",
    "Lively dance bar with tropical decor, colorful lanterns, wooden dance floor, cocktails, festive Caribbean island vibe, no text",
  ],

  "Latino": [
    "Latin dance bar interior, warm tropical colors, salsa dance floor, rum bottles display, Cuban-inspired decor, festive Latino atmosphere, no text",
    "Vibrant Latin American bar, colorful papel picado banners, tequila and mezcal collection, live music stage, passionate dance vibes, no text",
    "Caribbean-inspired nightlife bar, bamboo accents, tropical cocktails, reggaeton dance floor, warm festive energy, no text",
  ],

  "Péniche": [
    "Interior of a cozy floating bar on a river barge, warm wood paneling, porthole windows with river views, nautical rope decor, intimate boat bar, no text",
    "Rooftop deck of a péniche bar on the river at sunset, string lights, cocktails on railing, city skyline, floating party boat atmosphere, no text",
    "Converted barge nightclub interior, low ceiling with industrial pipes, dance floor, DJ booth, river reflections through windows, unique venue, no text",
  ],

  "Bar à jeux": [
    "Board game bar interior, shelves full of board games, people playing at wooden tables, craft beer, warm cozy geek-friendly atmosphere, no text",
    "Gaming café bar, retro arcade machines, board games stacked on shelves, colorful casual decor, fun social gaming night, no text",
    "Tabletop gaming pub, dungeons and dragons setup on table, dice and figurines, warm lighting, nerdy welcoming atmosphere, no text",
  ],

  // Generic fallback
  "Bar": [
    "Stylish modern bar interior in a French city, ambient warm lighting, long bar counter with bottles, contemporary minimalist design, evening atmosphere, no text",
    "Neighborhood bar with character, eclectic vintage posters, zinc counter, high stools, warm incandescent bulbs, authentic French bar, no text",
    "Trendy urban bar, exposed brick and metal, Edison bulb lighting, cocktails on wooden counter, hipster industrial aesthetic, no text",
    "Classic French café-bar interior, marble counter top, brass fixtures, mirrors, art on walls, Parisian style ambiance, no text",
    "Contemporary bar with creative interior design, plants hanging from ceiling, terrazzo counter, natural materials, Scandinavian-meets-French style, no text",
    "Lively corner bar at night, warm glow from windows, outdoor terrace with small tables, French street scene, inviting nightlife, no text",
    "Wine and cocktail bar, elegant backlit bottle display, leather bar stools, dark moody atmosphere, sophisticated urban nightlife, no text",
    "Cozy basement bar, stone arched ceiling, candles, intimate tables for two, underground charm, secret bar feel, no text",
  ],
};

// ---------------------------------------------------------------------------
// OpenAI DALL-E 3
// ---------------------------------------------------------------------------

async function generateImage(prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1792x1024",
      quality: "standard",
      response_format: "url",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DALL-E error ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.data[0].url;
}

// ---------------------------------------------------------------------------
// Download image to local filesystem
// ---------------------------------------------------------------------------

async function downloadImage(
  imageUrl: string,
  filename: string,
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl);
    if (!res.ok || !res.body) {
      console.error(`    Download failed: ${res.status}`);
      return null;
    }

    const filePath = join(IMAGES_DIR, `${filename}.png`);
    const nodeStream = Readable.fromWeb(res.body as any);
    await pipeline(nodeStream, createWriteStream(filePath));

    // Return the public URL path (relative to app/public)
    return `/images/themed/${filename}.png`;
  } catch (err) {
    console.error(`    Download error: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function matchCategory(lieu: Lieu): string {
  const cat = lieu.categorie.toLowerCase();
  const subs = lieu.sous_categories.join(" ").toLowerCase();
  const specs = lieu.specificites.join(" ").toLowerCase();

  // Check specific categories first
  if (cat.includes("cocktail") || cat.includes("speakeasy") || subs.includes("cocktail")) {
    return "Bars à cocktails & Speakeasy";
  }
  if (cat.includes("boîte") || cat.includes("discoth") || (lieu.type === "club" && cat.includes("club"))) {
    return "Clubs & Boîtes de nuit";
  }
  if (cat.includes("rooftop") || cat.includes("vin") || subs.includes("wine") || subs.includes("vin")) {
    return "Rooftops & Bars à vins";
  }
  if (cat.includes("irlandais") || cat.includes("écossais") || cat.includes("vieux lyon") || subs.includes("pub") || subs.includes("irish")) {
    return "Pubs irlandais/écossais & Bars Vieux Lyon";
  }
  if (cat.includes("bière") || cat.includes("insolite") || subs.includes("beer") || subs.includes("brew")) {
    return "Bars à bières, Pubs & Bars insolites";
  }
  if (cat.includes("cosy") || cat.includes("afterwork") || subs.includes("lounge")) {
    return "Bars Cosy & Afterworks";
  }
  if (cat.includes("karaoké") || cat.includes("karaoke") || subs.includes("karaoke")) {
    return "Bars karaoké";
  }
  if (cat.includes("sportif") || subs.includes("sport")) {
    return "Bars sportifs";
  }
  if (cat.includes("lgbt") || subs.includes("gay") || subs.includes("lgb")) {
    return "Bars & Clubs LGBT-friendly";
  }
  if (cat.includes("dansant") || specs.includes("danse") || specs.includes("dancing")) {
    return "Clubs & Bars Dansants";
  }
  if (cat.includes("latino") || specs.includes("salsa") || specs.includes("latino") || specs.includes("reggaeton")) {
    return "Latino";
  }
  if (cat.includes("péniche") || specs.includes("péniche") || specs.includes("bateau") || specs.includes("boat")) {
    return "Péniche";
  }
  if (cat.includes("jeux") || specs.includes("jeux") || specs.includes("board game") || subs.includes("game")) {
    return "Bar à jeux";
  }
  if (lieu.type === "club") {
    return "Clubs & Boîtes de nuit";
  }

  return "Bar";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("=== Generating themed fallback photos ===\n");

  // Load venues
  const lieux: Lieu[] = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  const needPhoto = lieux.filter((l) => !l.photo_cover);

  console.log(`Total venues: ${lieux.length}`);
  console.log(`Already have photos: ${lieux.length - needPhoto.length}`);
  console.log(`Need fallback photos: ${needPhoto.length}\n`);

  if (needPhoto.length === 0) {
    console.log("All venues have photos. Nothing to do.");
    return;
  }

  // Group venues needing photos by category
  const categoryGroups = new Map<string, Lieu[]>();
  for (const lieu of needPhoto) {
    const cat = matchCategory(lieu);
    if (!categoryGroups.has(cat)) {
      categoryGroups.set(cat, []);
    }
    categoryGroups.get(cat)!.push(lieu);
  }

  console.log("Categories needing photos:");
  for (const [cat, venues] of categoryGroups) {
    console.log(`  ${cat}: ${venues.length} venues`);
  }

  // Ensure images directory exists
  mkdirSync(IMAGES_DIR, { recursive: true });

  // Load or create photo pool cache
  let pool: PhotoPool = {};
  if (existsSync(POOL_CACHE_PATH)) {
    pool = JSON.parse(readFileSync(POOL_CACHE_PATH, "utf-8"));
    console.log(`\nLoaded cached photo pool (${Object.keys(pool).length} categories)`);
  }

  // Generate photos for each category that needs them
  let totalGenerated = 0;
  for (const [category, venues] of categoryGroups) {
    const prompts = CATEGORY_PROMPTS[category] ?? CATEGORY_PROMPTS["Bar"];

    // Skip if we already have enough cached photos for this category
    if (pool[category] && pool[category].length >= prompts.length) {
      console.log(`\n  [${category}] Using ${pool[category].length} cached photos`);
      continue;
    }

    console.log(`\n  [${category}] Generating ${prompts.length} photos...`);
    pool[category] = pool[category] ?? [];

    const startIdx = pool[category].length;
    for (let i = startIdx; i < prompts.length; i++) {
      const prompt = prompts[i];
      console.log(`    [${i + 1}/${prompts.length}] Generating...`);

      try {
        // Generate with DALL-E 3
        const dalleUrl = await generateImage(prompt);
        console.log(`    -> DALL-E OK, downloading locally...`);

        // Download to local public folder
        const filename = `${category.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}-${i + 1}`;
        const localPath = await downloadImage(dalleUrl, filename);

        if (localPath) {
          pool[category].push(localPath);
          totalGenerated++;
          console.log(`    -> Saved: ${localPath}`);
        } else {
          console.log(`    -> Download failed, skipping`);
        }

        // Save cache after each generation (in case of crash)
        writeFileSync(POOL_CACHE_PATH, JSON.stringify(pool, null, 2), "utf-8");
      } catch (err) {
        console.error(`    ERROR: ${err instanceof Error ? err.message : err}`);
      }

      await sleep(2000); // Rate limit for DALL-E
    }
  }

  console.log(`\nGenerated ${totalGenerated} new photos total`);

  // Assign photos to venues round-robin
  let assigned = 0;
  for (const [category, venues] of categoryGroups) {
    const photos = pool[category];
    if (!photos || photos.length === 0) {
      console.log(`  [${category}] No photos available, skipping ${venues.length} venues`);
      continue;
    }

    for (let i = 0; i < venues.length; i++) {
      const photo = photos[i % photos.length];
      const lieu = lieux.find((l) => l.id === venues[i].id);
      if (lieu && !lieu.photo_cover) {
        lieu.photo_cover = photo;
        lieu.photos = [photo];
        assigned++;
      }
    }
    console.log(`  [${category}] Assigned photos to ${venues.length} venues (from ${photos.length} unique images)`);
  }

  // Save updated data
  writeFileSync(DATA_PATH, JSON.stringify(lieux, null, 2), "utf-8");

  console.log(`\n=== Done ===`);
  console.log(`  Photos generated: ${totalGenerated}`);
  console.log(`  Venues with new photos: ${assigned}`);
  console.log(`  Total venues with photos now: ${lieux.filter((l) => l.photo_cover).length}/${lieux.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
