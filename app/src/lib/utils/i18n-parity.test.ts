import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Ensures that fr.json and en.json have identical key structures.
 * Every key present in one locale must be present in the other.
 */

function loadJson(locale: string): Record<string, unknown> {
  const raw = readFileSync(
    join(process.cwd(), "messages", `${locale}.json`),
    "utf-8",
  );
  return JSON.parse(raw);
}

function collectKeys(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [prefix];
  if (Array.isArray(obj)) return [prefix]; // arrays are leaf values (e.g. suggestions)

  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    keys.push(...collectKeys(value, path));
  }
  return keys;
}

describe("i18n translation parity", () => {
  const fr = loadJson("fr");
  const en = loadJson("en");

  const frKeys = new Set(collectKeys(fr));
  const enKeys = new Set(collectKeys(en));

  it("fr.json and en.json have the same number of keys", () => {
    expect(frKeys.size).toBe(enKeys.size);
  });

  it("every FR key exists in EN", () => {
    const missingInEn = [...frKeys].filter((k) => !enKeys.has(k));
    expect(missingInEn).toEqual([]);
  });

  it("every EN key exists in FR", () => {
    const missingInFr = [...enKeys].filter((k) => !frKeys.has(k));
    expect(missingInFr).toEqual([]);
  });

  it("no translation value is empty string", () => {
    function checkEmpty(obj: unknown, locale: string, prefix = ""): string[] {
      if (obj === null || typeof obj !== "object") {
        if (typeof obj === "string" && obj.trim() === "") return [`${locale}:${prefix}`];
        return [];
      }
      if (Array.isArray(obj)) return [];

      const empty: string[] = [];
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const path = prefix ? `${prefix}.${key}` : key;
        empty.push(...checkEmpty(value, locale, path));
      }
      return empty;
    }

    const emptyFr = checkEmpty(fr, "fr");
    const emptyEn = checkEmpty(en, "en");
    expect([...emptyFr, ...emptyEn]).toEqual([]);
  });

  it("all top-level namespaces match", () => {
    const frNamespaces = Object.keys(fr).sort();
    const enNamespaces = Object.keys(en).sort();
    expect(frNamespaces).toEqual(enNamespaces);
  });
});
