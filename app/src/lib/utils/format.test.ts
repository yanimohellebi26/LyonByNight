import { describe, it, expect } from "vitest";
import {
  formatNote,
  formatPriceRange,
  formatPrice,
  formatAdresseShort,
  slugify,
} from "./format";

describe("formatNote", () => {
  it("returns 'N/D' for null", () => {
    expect(formatNote(null)).toBe("N/D");
  });

  it("formats a whole number with one decimal", () => {
    expect(formatNote(4)).toBe("4.0 / 5");
  });

  it("formats a decimal number", () => {
    expect(formatNote(3.7)).toBe("3.7 / 5");
  });

  it("formats zero", () => {
    expect(formatNote(0)).toBe("0.0 / 5");
  });

  it("formats 5 (max)", () => {
    expect(formatNote(5)).toBe("5.0 / 5");
  });
});

describe("formatPriceRange", () => {
  it("returns the range symbol as-is", () => {
    expect(formatPriceRange("€")).toBe("€");
    expect(formatPriceRange("€€")).toBe("€€");
    expect(formatPriceRange("€€€")).toBe("€€€");
  });
});

describe("formatPrice", () => {
  it("returns 'N/D' for null", () => {
    expect(formatPrice(null)).toBe("N/D");
  });

  it("formats an integer price", () => {
    expect(formatPrice(6)).toBe("6,00 €");
  });

  it("formats a decimal price", () => {
    expect(formatPrice(8.5)).toBe("8,50 €");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("0,00 €");
  });
});

describe("formatAdresseShort", () => {
  it("strips postal code and Lyon suffix", () => {
    expect(formatAdresseShort("12 rue de la République, 69001 Lyon")).toBe(
      "12 rue de la République"
    );
  });

  it("handles address without postal code", () => {
    expect(formatAdresseShort("Place Bellecour")).toBe("Place Bellecour");
  });

  it("handles address with just postal code (no comma)", () => {
    expect(formatAdresseShort("1 quai Rambaud 69002 Lyon")).toBe(
      "1 quai Rambaud"
    );
  });

  it("returns empty string for empty input", () => {
    expect(formatAdresseShort("")).toBe("");
  });
});

describe("slugify", () => {
  it("creates URL-friendly slug from accented French text", () => {
    expect(slugify("Le Café des Négociants")).toBe("le-cafe-des-negociants");
  });

  it("replaces spaces and special chars with hyphens", () => {
    expect(slugify("L'Opéra (Bar)")).toBe("l-opera-bar");
  });

  it("handles multiple consecutive special chars", () => {
    expect(slugify("foo---bar")).toBe("foo-bar");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  it("lowercases everything", () => {
    expect(slugify("GRAND CAFÉ")).toBe("grand-cafe");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });
});
