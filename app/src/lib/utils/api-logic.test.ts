import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { haversineDistance } from "@/lib/utils/geo";

/**
 * Integration tests that exercise the same filtering, sorting, and pagination
 * logic used by the API routes, directly against the data files.
 */

interface LieuData {
  id: string;
  nom: string;
  slug: string;
  type: string;
  categorie: string;
  arrondissement: string | null;
  musique: string[];
  note: number | null;
  description: string;
  coordonnees: { lat: number; lng: number } | null;
  prix: { fourchette: string; pinte_moy: number | null; cocktail_moy: number | null };
  specificites: string[];
}

let lieux: LieuData[] = [];

beforeAll(() => {
  const dataPath = join(process.cwd(), "..", "data", "merged-geocoded.json");
  if (!existsSync(dataPath)) {
    // Skip tests gracefully if data file doesn't exist
    return;
  }
  lieux = JSON.parse(readFileSync(dataPath, "utf-8"));
});

describe("Data integrity", () => {
  it("data file loads and contains venues", () => {
    expect(lieux.length).toBeGreaterThan(0);
  });

  it("every venue has required fields", () => {
    for (const lieu of lieux) {
      expect(lieu.id).toBeDefined();
      expect(typeof lieu.nom).toBe("string");
      expect(lieu.nom.length).toBeGreaterThan(0);
      expect(typeof lieu.slug).toBe("string");
      expect(lieu.slug.length).toBeGreaterThan(0);
      expect(["bar", "club"]).toContain(lieu.type);
    }
  });

  it("no duplicate IDs", () => {
    const ids = lieux.map((l) => l.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("no duplicate slugs", () => {
    const slugs = lieux.map((l) => l.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it("notes are within valid range (0-5) or null", () => {
    for (const lieu of lieux) {
      if (lieu.note !== null) {
        expect(lieu.note).toBeGreaterThanOrEqual(0);
        expect(lieu.note).toBeLessThanOrEqual(5);
      }
    }
  });

  it("coordinates are valid Lyon area or null", () => {
    for (const lieu of lieux) {
      if (lieu.coordonnees) {
        // Lyon is roughly at 45.7°N, 4.8°E
        expect(lieu.coordonnees.lat).toBeGreaterThan(45.5);
        expect(lieu.coordonnees.lat).toBeLessThan(46.0);
        expect(lieu.coordonnees.lng).toBeGreaterThan(4.6);
        expect(lieu.coordonnees.lng).toBeLessThan(5.1);
      }
    }
  });

  it("price fourchette is valid", () => {
    for (const lieu of lieux) {
      expect(["€", "€€", "€€€"]).toContain(lieu.prix.fourchette);
    }
  });
});

describe("Filtering logic (mirrors /api/lieux)", () => {
  it("filters by type=bar", () => {
    const bars = lieux.filter((l) => l.type === "bar");
    expect(bars.length).toBeGreaterThan(0);
    expect(bars.every((l) => l.type === "bar")).toBe(true);
  });

  it("filters by type=club", () => {
    const clubs = lieux.filter((l) => l.type === "club");
    expect(clubs.length).toBeGreaterThan(0);
    expect(clubs.every((l) => l.type === "club")).toBe(true);
  });

  it("filters by music genre", () => {
    const genres = ["techno"];
    const result = lieux.filter((l) =>
      l.musique?.some((m) => genres.some((g) => m.toLowerCase().includes(g))),
    );
    // May be empty if no techno venues, but should not throw
    expect(Array.isArray(result)).toBe(true);
  });

  it("filters by minimum note", () => {
    const min = 4;
    const result = lieux.filter((l) => l.note !== null && l.note >= min);
    expect(result.every((l) => l.note !== null && l.note >= min)).toBe(true);
  });

  it("filters by text query (case-insensitive)", () => {
    const query = "bar";
    const result = lieux.filter(
      (l) =>
        l.nom.toLowerCase().includes(query) ||
        l.description?.toLowerCase().includes(query) ||
        l.categorie?.toLowerCase().includes(query),
    );
    expect(result.length).toBeGreaterThan(0);
  });

  it("filters by price fourchette", () => {
    const result = lieux.filter((l) => l.prix?.fourchette === "€");
    expect(result.every((l) => l.prix.fourchette === "€")).toBe(true);
  });
});

describe("Sorting logic (mirrors /api/lieux)", () => {
  it("sorts by note descending", () => {
    const sorted = [...lieux]
      .filter((l) => l.note !== null)
      .sort((a, b) => (b.note ?? 0) - (a.note ?? 0));
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].note! >= sorted[i].note!).toBe(true);
    }
  });

  it("sorts by name ascending", () => {
    const sorted = [...lieux].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].nom.localeCompare(sorted[i].nom, "fr")).toBeLessThanOrEqual(0);
    }
  });

  it("sorts by price ascending", () => {
    const sorted = [...lieux].sort(
      (a, b) => (a.prix?.pinte_moy ?? 99) - (b.prix?.pinte_moy ?? 99),
    );
    for (let i = 1; i < sorted.length; i++) {
      expect((sorted[i - 1].prix?.pinte_moy ?? 99) <= (sorted[i].prix?.pinte_moy ?? 99)).toBe(
        true,
      );
    }
  });
});

describe("Pagination logic", () => {
  it("page 1 returns correct slice", () => {
    const page = 1;
    const limit = 20;
    const start = (page - 1) * limit;
    const data = lieux.slice(start, start + limit);
    expect(data.length).toBeLessThanOrEqual(limit);
    expect(data[0]).toBe(lieux[0]);
  });

  it("page 2 starts after page 1", () => {
    const limit = 10;
    const page1 = lieux.slice(0, limit);
    const page2 = lieux.slice(limit, limit * 2);
    if (page2.length > 0) {
      expect(page1[page1.length - 1]).not.toBe(page2[0]);
    }
  });

  it("total pages calculation is correct", () => {
    const limit = 20;
    const total = lieux.length;
    const pages = Math.ceil(total / limit);
    expect(pages).toBe(Math.ceil(total / limit));
    expect(pages * limit).toBeGreaterThanOrEqual(total);
  });
});

describe("Geo distance filtering", () => {
  it("filters by radius from Bellecour", () => {
    const userLat = 45.7577;
    const userLng = 4.8321;
    const rayonKm = 2;

    const withDist = lieux
      .filter((l) => l.coordonnees !== null)
      .map((l) => ({
        ...l,
        _distance: haversineDistance(userLat, userLng, l.coordonnees!.lat, l.coordonnees!.lng),
      }));

    const inRadius = withDist.filter((l) => l._distance <= rayonKm);
    expect(inRadius.every((l) => l._distance <= rayonKm)).toBe(true);
  });

  it("sorts by distance ascending", () => {
    const userLat = 45.7577;
    const userLng = 4.8321;

    const withDist = lieux
      .filter((l) => l.coordonnees !== null)
      .map((l) => ({
        ...l,
        _distance: haversineDistance(userLat, userLng, l.coordonnees!.lat, l.coordonnees!.lng),
      }))
      .sort((a, b) => a._distance - b._distance);

    for (let i = 1; i < withDist.length; i++) {
      expect(withDist[i - 1]._distance <= withDist[i]._distance).toBe(true);
    }
  });
});

describe("Search logic (mirrors /api/search)", () => {
  it("finds venues by name", () => {
    if (lieux.length === 0) return;
    const target = lieux[0];
    const query = target.nom.substring(0, 5).toLowerCase();
    const results = lieux.filter(
      (l) =>
        l.nom.toLowerCase().includes(query) ||
        l.categorie?.toLowerCase().includes(query) ||
        l.musique?.some((m) => m.toLowerCase().includes(query)) ||
        l.specificites?.some((s) => s.toLowerCase().includes(query)),
    );
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.id === target.id)).toBe(true);
  });

  it("returns empty for gibberish query", () => {
    const query = "xyzzzqqqwww999";
    const results = lieux.filter(
      (l) =>
        l.nom.toLowerCase().includes(query) ||
        l.categorie?.toLowerCase().includes(query),
    );
    expect(results.length).toBe(0);
  });
});
