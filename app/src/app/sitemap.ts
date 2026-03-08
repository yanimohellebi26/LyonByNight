import type { MetadataRoute } from "next";
import { readFileSync } from "fs";
import { getDataFilePath } from "@/lib/utils/data-path";

interface LieuSlug {
  slug: string;
  date_maj: string;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://lyon-night-guide.vercel.app";

  let lieux: LieuSlug[] = [];
  try {
    const raw = readFileSync(getDataFilePath("merged-geocoded.json"), "utf-8");
    lieux = JSON.parse(raw) as LieuSlug[];
  } catch {
    // Data not available at build time — return minimal sitemap
  }

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/fr/explorer`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/fr/carte`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/fr/evenements`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/fr/comparer`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/en/explorer`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/en/carte`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/en/evenements`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
  ];

  const lieuPages: MetadataRoute.Sitemap = lieux.map((l) => ({
    url: `${baseUrl}/fr/lieu/${l.slug}`,
    lastModified: l.date_maj ? new Date(l.date_maj) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...lieuPages];
}
