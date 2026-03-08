import { describe, it, expect } from "vitest";
import { boundingBox } from "./geo";

describe("boundingBox", () => {
  it("returns correct structure", () => {
    const box = boundingBox(45.764, 4.835, 5);
    expect(box).toHaveProperty("minLat");
    expect(box).toHaveProperty("maxLat");
    expect(box).toHaveProperty("minLng");
    expect(box).toHaveProperty("maxLng");
  });

  it("center is inside the bounding box", () => {
    const box = boundingBox(45.764, 4.835, 10);
    expect(box.minLat).toBeLessThan(45.764);
    expect(box.maxLat).toBeGreaterThan(45.764);
    expect(box.minLng).toBeLessThan(4.835);
    expect(box.maxLng).toBeGreaterThan(4.835);
  });

  it("larger radius produces a wider box", () => {
    const small = boundingBox(45.764, 4.835, 1);
    const large = boundingBox(45.764, 4.835, 10);

    const smallLatRange = small.maxLat - small.minLat;
    const largeLatRange = large.maxLat - large.minLat;
    expect(largeLatRange).toBeGreaterThan(smallLatRange);

    const smallLngRange = small.maxLng - small.minLng;
    const largeLngRange = large.maxLng - large.minLng;
    expect(largeLngRange).toBeGreaterThan(smallLngRange);
  });

  it("is symmetric around the center", () => {
    const box = boundingBox(45.764, 4.835, 5);
    const latDelta = box.maxLat - 45.764;
    const latDeltaNeg = 45.764 - box.minLat;
    expect(Math.abs(latDelta - latDeltaNeg)).toBeLessThan(0.0001);

    const lngDelta = box.maxLng - 4.835;
    const lngDeltaNeg = 4.835 - box.minLng;
    expect(Math.abs(lngDelta - lngDeltaNeg)).toBeLessThan(0.0001);
  });

  it("zero radius returns the same point", () => {
    const box = boundingBox(45.764, 4.835, 0);
    expect(box.minLat).toBeCloseTo(45.764);
    expect(box.maxLat).toBeCloseTo(45.764);
    expect(box.minLng).toBeCloseTo(4.835);
    expect(box.maxLng).toBeCloseTo(4.835);
  });

  it("5km radius is approximately correct in latitude degrees", () => {
    const box = boundingBox(45.764, 4.835, 5);
    // 5km / 111.32 km per degree ≈ 0.0449 degrees
    const latDelta = box.maxLat - 45.764;
    expect(latDelta).toBeCloseTo(0.0449, 2);
  });

  it("works at the equator", () => {
    const box = boundingBox(0, 0, 10);
    expect(box.minLat).toBeLessThan(0);
    expect(box.maxLat).toBeGreaterThan(0);
    expect(box.minLng).toBeLessThan(0);
    expect(box.maxLng).toBeGreaterThan(0);
  });
});
