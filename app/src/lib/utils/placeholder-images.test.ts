import { describe, it, expect } from "vitest";
import { getPlaceholderImage } from "../placeholder-images";

describe("getPlaceholderImage", () => {
  it("returns a string URL or path", () => {
    const url = getPlaceholderImage("abc123", "Cocktail bar", "bar");
    expect(typeof url).toBe("string");
    expect(url.length).toBeGreaterThan(0);
  });

  it("is deterministic — same inputs yield same output", () => {
    const a = getPlaceholderImage("venue-42", "Bar à bière", "bar");
    const b = getPlaceholderImage("venue-42", "Bar à bière", "bar");
    expect(a).toBe(b);
  });

  it("different IDs may produce different images", () => {
    const a = getPlaceholderImage("id-1", "Bar classique", "bar");
    const b = getPlaceholderImage("id-2", "Bar classique", "bar");
    expect(typeof a).toBe("string");
    expect(typeof b).toBe("string");
  });

  it("resolves cocktail category to themed image", () => {
    const url = getPlaceholderImage("x", "Cocktail bar / Speakeasy", "bar");
    expect(url).toContain("cocktails");
  });

  it("resolves club category to themed image", () => {
    const url = getPlaceholderImage("x", "Boîte de nuit", "club");
    expect(url).toContain("clubs");
  });

  it("resolves pub category to themed image", () => {
    const url = getPlaceholderImage("x", "Pub irlandais", "bar");
    expect(url).toContain("pubs");
  });

  it("resolves LGBT category to themed image", () => {
    const url = getPlaceholderImage("x", "Bar LGBT-friendly", "bar");
    expect(url).toContain("lgbt");
  });

  it("falls back to club images for club type with unknown category", () => {
    const url = getPlaceholderImage("x", "Unknown Category", "club");
    expect(url).toContain("clubs");
  });

  it("falls back to bar images for bar type with unknown category", () => {
    const url = getPlaceholderImage("x", "Unknown Category", "bar");
    expect(url).toContain("/images/themed/");
  });

  it("resolves péniche category to themed image", () => {
    const url = getPlaceholderImage("x", "Péniche / Bar dansant", "bar");
    expect(url).toContain("niche");
  });

  it("resolves vin/rooftop category to themed image", () => {
    const url = getPlaceholderImage("x", "Bar à vin / Rooftop", "bar");
    expect(url).toContain("rooftops");
  });

  it("resolves bar à jeux to themed image", () => {
    const url = getPlaceholderImage("x", "Bar à jeux", "bar");
    expect(url).toContain("/images/themed/");
  });

  it("resolves cosy/afterwork category to themed image", () => {
    const url = getPlaceholderImage("x", "Bar cosy / afterwork", "bar");
    expect(url).toContain("cosy");
  });

  it("resolves latino category to themed image", () => {
    const url = getPlaceholderImage("x", "Bar latino", "bar");
    expect(url).toContain("/images/themed/");
  });
});
