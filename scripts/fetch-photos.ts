/**
 * fetch-photos.ts — Fetch venue photos from Yelp + Foursquare
 * and upload them to Cloudinary, then update merged-geocoded.json.
 *
 * Usage: npx tsx scripts/fetch-photos.ts
 *
 * Required env vars (in app/.env):
 *   YELP_API_KEY
 *   FOURSQUARE_API_KEY
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DATA_PATH = join(__dirname, "..", "data", "merged-geocoded.json");
const ENV_PATH = join(__dirname, "..", "app", ".env");

/** Parse .env file manually (no dotenv dependency needed) */
function loadEnv(envPath: string): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      env[key] = value;
    }
  } catch {
    // .env not found — rely on process.env
  }
  return env;
}

const envFile = loadEnv(ENV_PATH);
function env(key: string): string {
  const v = process.env[key] ?? envFile[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

const YELP_KEY = env("YELP_API_KEY");
const FOURSQUARE_KEY = env("FOURSQUARE_API_KEY");
const CLOUDINARY_CLOUD = env("CLOUDINARY_CLOUD_NAME");
const CLOUDINARY_API_KEY = env("CLOUDINARY_API_KEY");
const CLOUDINARY_API_SECRET = env("CLOUDINARY_API_SECRET");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Lieu {
  id: string;
  nom: string;
  slug: string;
  adresse: string;
  coordonnees: { lat: number; lng: number } | null;
  photo_cover: string | null;
  photos: string[];
  [key: string]: unknown;
}

interface YelpBusiness {
  id: string;
  alias: string;
  name: string;
  image_url: string;
  coordinates: { latitude: number; longitude: number };
}

interface YelpBusinessDetail {
  id: string;
  photos: string[];
}

// ---------------------------------------------------------------------------
// Yelp API
// ---------------------------------------------------------------------------

const YELP_BASE = "https://api.yelp.com/v3";

async function searchYelpBusiness(
  name: string,
  lat: number,
  lng: number,
): Promise<YelpBusiness | null> {
  const params = new URLSearchParams({
    term: name,
    latitude: String(lat),
    longitude: String(lng),
    radius: "500",
    limit: "1",
    categories: "bars,nightlife,cocktailbars,danceclubs,pubs,lounges",
  });

  const res = await fetch(`${YELP_BASE}/businesses/search?${params}`, {
    headers: {
      Authorization: `Bearer ${YELP_KEY}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) return null;

  const data = await res.json();
  const businesses = data.businesses as YelpBusiness[];
  return businesses.length > 0 ? businesses[0] : null;
}

async function getYelpPhotos(businessId: string): Promise<string[]> {
  const res = await fetch(`${YELP_BASE}/businesses/${businessId}`, {
    headers: {
      Authorization: `Bearer ${YELP_KEY}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as YelpBusinessDetail;
  return data.photos ?? [];
}

// ---------------------------------------------------------------------------
// Foursquare API
// ---------------------------------------------------------------------------

const FSQ_BASE = "https://api.foursquare.com/v3";

async function searchFoursquarePlace(
  name: string,
  lat?: number,
  lng?: number,
): Promise<{ fsq_id: string; name: string } | null> {
  const params: Record<string, string> = {
    query: name,
    near: "Lyon,France",
    limit: "1",
  };
  if (lat != null && lng != null) {
    params.ll = `${lat},${lng}`;
    params.radius = "500";
    delete params.near;
  }

  const res = await fetch(
    `${FSQ_BASE}/places/search?${new URLSearchParams(params)}`,
    {
      headers: {
        Authorization: FOURSQUARE_KEY,
        Accept: "application/json",
      },
    },
  );

  if (!res.ok) return null;

  const data = await res.json();
  const results = data.results as { fsq_id: string; name: string }[];
  return results.length > 0 ? results[0] : null;
}

async function getFoursquarePhotos(fsqId: string): Promise<string[]> {
  const res = await fetch(
    `${FSQ_BASE}/places/${fsqId}/photos?limit=3`,
    {
      headers: {
        Authorization: FOURSQUARE_KEY,
        Accept: "application/json",
      },
    },
  );

  if (!res.ok) return [];

  const photos = (await res.json()) as { prefix: string; suffix: string }[];
  return photos.map((p) => `${p.prefix}original${p.suffix}`);
}

// ---------------------------------------------------------------------------
// Cloudinary Upload (REST API — fixed signature)
// ---------------------------------------------------------------------------

function cloudinarySignature(
  params: Record<string, string>,
  secret: string,
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(sorted + secret).digest("hex");
}

async function uploadToCloudinary(
  imageUrl: string,
  publicId: string,
): Promise<string | null> {
  const timestamp = String(Math.floor(Date.now() / 1000));

  // Only include signable params (no transformation in signed string)
  const signableParams: Record<string, string> = {
    folder: "bars_lyon",
    public_id: publicId,
    timestamp,
  };

  const signature = cloudinarySignature(signableParams, CLOUDINARY_API_SECRET);

  const formData = new FormData();
  formData.append("file", imageUrl);
  formData.append("api_key", CLOUDINARY_API_KEY);
  formData.append("signature", signature);
  formData.append("folder", "bars_lyon");
  formData.append("public_id", publicId);
  formData.append("timestamp", timestamp);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!res.ok) {
    const txt = await res.text();
    console.error(`  ✗ Cloudinary upload failed: ${res.status} — ${txt.slice(0, 120)}`);
    return null;
  }

  const data = await res.json();
  return data.secure_url as string;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  console.log("📸 Fetching photos (Yelp + Foursquare → Cloudinary)...\n");

  const lieux: Lieu[] = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < lieux.length; i++) {
    const lieu = lieux[i];

    // Skip if already has Cloudinary photo
    if (lieu.photo_cover && lieu.photo_cover.includes("cloudinary")) {
      skipped++;
      continue;
    }

    console.log(`  [${i + 1}/${lieux.length}] ${lieu.nom}...`);

    // --- Try Yelp first (if has coordinates) ---
    let photoUrls: string[] = [];

    if (lieu.coordonnees) {
      const biz = await searchYelpBusiness(
        lieu.nom,
        lieu.coordonnees.lat,
        lieu.coordonnees.lng,
      );
      if (biz) {
        const yelpPhotos = await getYelpPhotos(biz.id);
        photoUrls = yelpPhotos.length > 0 ? yelpPhotos.slice(0, 3) : biz.image_url ? [biz.image_url] : [];
      }
      await sleep(300);
    }

    // --- Fallback to Foursquare ---
    if (photoUrls.length === 0) {
      const place = await searchFoursquarePlace(
        lieu.nom,
        lieu.coordonnees?.lat,
        lieu.coordonnees?.lng,
      );
      if (place) {
        photoUrls = await getFoursquarePhotos(place.fsq_id);
        if (photoUrls.length > 0) {
          console.log(`    → Found on Foursquare: "${place.name}"`);
        }
      }
      await sleep(300);
    }

    if (photoUrls.length === 0) {
      console.log(`    → No photos found on either API`);
      failed++;
      continue;
    }

    // --- Upload to Cloudinary ---
    const cloudinaryUrls: string[] = [];
    for (let j = 0; j < Math.min(photoUrls.length, 3); j++) {
      const publicId = `${lieu.slug}-${j + 1}`;
      const url = await uploadToCloudinary(photoUrls[j], publicId);
      if (url) cloudinaryUrls.push(url);
      await sleep(200);
    }

    if (cloudinaryUrls.length > 0) {
      lieu.photo_cover = cloudinaryUrls[0];
      lieu.photos = cloudinaryUrls;
      updated++;
      console.log(`    ✓ ${cloudinaryUrls.length} photo(s) → Cloudinary`);
    } else {
      // Fallback: use source URL directly
      lieu.photo_cover = photoUrls[0];
      lieu.photos = photoUrls.slice(0, 3);
      updated++;
      console.log(`    ✓ Using source URL directly`);
    }

    // Save progress every 20 venues
    if (updated > 0 && updated % 20 === 0) {
      writeFileSync(DATA_PATH, JSON.stringify(lieux, null, 2), "utf-8");
      console.log(`    💾 Progress saved (${updated} updated so far)`);
    }
  }

  // Final save
  writeFileSync(DATA_PATH, JSON.stringify(lieux, null, 2), "utf-8");

  console.log(`\n✅ Done!`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped (already on Cloudinary): ${skipped}`);
  console.log(`   Failed/not found: ${failed}`);
  console.log(`   Total: ${lieux.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
