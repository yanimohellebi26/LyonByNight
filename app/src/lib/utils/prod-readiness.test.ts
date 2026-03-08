import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Production readiness checks:
 * - vercel.json is valid
 * - manifest.json is valid PWA manifest
 * - Security headers are configured
 * - Required files exist
 */

describe("Vercel configuration", () => {
  const vercelPath = join(process.cwd(), "vercel.json");

  it("vercel.json exists", () => {
    expect(existsSync(vercelPath)).toBe(true);
  });

  it("vercel.json is valid JSON", () => {
    const raw = readFileSync(vercelPath, "utf-8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("vercel.json has correct framework", () => {
    const config = JSON.parse(readFileSync(vercelPath, "utf-8"));
    expect(config.framework).toBe("nextjs");
  });

  it("vercel.json has CDG region for France", () => {
    const config = JSON.parse(readFileSync(vercelPath, "utf-8"));
    expect(config.regions).toContain("cdg1");
  });

  it("vercel.json has build command", () => {
    const config = JSON.parse(readFileSync(vercelPath, "utf-8"));
    expect(config.buildCommand).toBe("npm run build");
  });
});

describe("PWA manifest", () => {
  const manifestPath = join(process.cwd(), "public", "manifest.json");

  it("manifest.json exists", () => {
    expect(existsSync(manifestPath)).toBe(true);
  });

  it("manifest.json is valid JSON", () => {
    const raw = readFileSync(manifestPath, "utf-8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("manifest has required PWA fields", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.start_url).toBeDefined();
    expect(manifest.display).toBeDefined();
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  it("manifest has standalone display mode", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.display).toBe("standalone");
  });

  it("manifest has valid theme color", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it("manifest has valid background color", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe("PWA icons", () => {
  it("192x192 icon exists", () => {
    expect(existsSync(join(process.cwd(), "public", "icons", "icon-192.svg"))).toBe(true);
  });

  it("512x512 icon exists", () => {
    expect(existsSync(join(process.cwd(), "public", "icons", "icon-512.svg"))).toBe(true);
  });
});

describe("Service worker", () => {
  it("sw.js exists in public/", () => {
    expect(existsSync(join(process.cwd(), "public", "sw.js"))).toBe(true);
  });

  it("sw.js contains install event handler", () => {
    const sw = readFileSync(join(process.cwd(), "public", "sw.js"), "utf-8");
    expect(sw).toContain("install");
  });

  it("sw.js contains fetch event handler", () => {
    const sw = readFileSync(join(process.cwd(), "public", "sw.js"), "utf-8");
    expect(sw).toContain("fetch");
  });
});

describe("Security headers in next.config", () => {
  const configPath = join(process.cwd(), "next.config.ts");

  it("next.config.ts exists", () => {
    expect(existsSync(configPath)).toBe(true);
  });

  it("has X-Content-Type-Options header", () => {
    const raw = readFileSync(configPath, "utf-8");
    expect(raw).toContain("X-Content-Type-Options");
    expect(raw).toContain("nosniff");
  });

  it("has X-Frame-Options header", () => {
    const raw = readFileSync(configPath, "utf-8");
    expect(raw).toContain("X-Frame-Options");
    expect(raw).toContain("DENY");
  });

  it("has Referrer-Policy header", () => {
    const raw = readFileSync(configPath, "utf-8");
    expect(raw).toContain("Referrer-Policy");
  });

  it("has Permissions-Policy header", () => {
    const raw = readFileSync(configPath, "utf-8");
    expect(raw).toContain("Permissions-Policy");
  });
});

describe("Environment example file", () => {
  it(".env.example exists", () => {
    expect(existsSync(join(process.cwd(), ".env.example"))).toBe(true);
  });

  it(".env.example documents required variables", () => {
    const raw = readFileSync(join(process.cwd(), ".env.example"), "utf-8");
    expect(raw).toContain("MAPBOX");
    expect(raw).toContain("OPENAI");
  });
});

describe("Required project files", () => {
  const requiredFiles = [
    "package.json",
    "tsconfig.json",
    "next.config.ts",
    "public/manifest.json",
    "public/sw.js",
    "messages/fr.json",
    "messages/en.json",
  ];

  for (const file of requiredFiles) {
    it(`${file} exists`, () => {
      expect(existsSync(join(process.cwd(), file))).toBe(true);
    });
  }
});
