import { describe, it, expect } from "vitest";
import { haversineDistance } from "./geo";

describe("haversineDistance", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineDistance(45.764, 4.835, 45.764, 4.835)).toBe(0);
  });

  it("calculates approximate distance between Lyon and Paris (~390 km)", () => {
    const dist = haversineDistance(45.764, 4.835, 48.856, 2.352);
    expect(dist).toBeGreaterThan(380);
    expect(dist).toBeLessThan(400);
  });

  it("calculates short distance within Lyon (< 5 km)", () => {
    // Bellecour to Part-Dieu (~3 km)
    const dist = haversineDistance(45.7577, 4.8321, 45.7602, 4.8598);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(5);
  });

  it("is symmetric (A→B equals B→A)", () => {
    const d1 = haversineDistance(45.764, 4.835, 48.856, 2.352);
    const d2 = haversineDistance(48.856, 2.352, 45.764, 4.835);
    expect(Math.abs(d1 - d2)).toBeLessThan(0.001);
  });

  it("handles negative coordinates (southern hemisphere)", () => {
    const dist = haversineDistance(-33.868, 151.209, -33.868, 151.209);
    expect(dist).toBe(0);
  });
});
