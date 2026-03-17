"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

interface Neighborhood {
  readonly id: string;
  readonly name: { fr: string; en: string };
  readonly arrondissement: string;
  readonly image: string;
  readonly description: { fr: string; en: string };
}

const NEIGHBORHOODS: readonly Neighborhood[] = [
  {
    id: "vieux-lyon",
    name: { fr: "Vieux Lyon", en: "Old Lyon" },
    arrondissement: "5e",
    image: "https://images.unsplash.com/photo-1524396309943-e03f5249f002?w=600&h=400&fit=crop",
    description: { fr: "Ruelles medievales & bouchons lyonnais", en: "Medieval streets & traditional bouchons" },
  },
  {
    id: "presquile",
    name: { fr: "Presqu'ile", en: "Presqu'ile" },
    arrondissement: "1er",
    image: "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=600&h=400&fit=crop",
    description: { fr: "Coeur de la vie nocturne lyonnaise", en: "Heart of Lyon's nightlife" },
  },
  {
    id: "confluence",
    name: { fr: "Confluence", en: "Confluence" },
    arrondissement: "2e",
    image: "https://images.unsplash.com/photo-1545893835-abaa50cbe628?w=600&h=400&fit=crop",
    description: { fr: "Quartier moderne & bars tendance", en: "Modern district & trendy bars" },
  },
  {
    id: "guillotiere",
    name: { fr: "Guillotiere", en: "Guillotiere" },
    arrondissement: "7e",
    image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&h=400&fit=crop",
    description: { fr: "Cosmopolite & bars alternatifs", en: "Cosmopolitan & alternative bars" },
  },
  {
    id: "terreaux",
    name: { fr: "Terreaux", en: "Terreaux" },
    arrondissement: "1er",
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop",
    description: { fr: "Place animee & pubs historiques", en: "Lively square & historic pubs" },
  },
  {
    id: "part-dieu",
    name: { fr: "Part-Dieu", en: "Part-Dieu" },
    arrondissement: "3e",
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&h=400&fit=crop",
    description: { fr: "After-work & bars d'hotels", en: "After-work & hotel bars" },
  },
];

function NeighborhoodCard({ neighborhood }: { readonly neighborhood: Neighborhood }) {
  const locale = useLocale();
  const name = locale === "en" ? neighborhood.name.en : neighborhood.name.fr;
  const desc = locale === "en" ? neighborhood.description.en : neighborhood.description.fr;

  return (
    <Link
      href={`/explorer?arrondissement=${neighborhood.arrondissement}`}
      className="group relative block h-48 overflow-hidden rounded-2xl border border-border/50 transition-all duration-500 hover:border-primary/40 hover:shadow-[0_8px_40px_-12px] hover:shadow-primary/20"
    >
      <Image
        src={neighborhood.image}
        alt={name}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="(max-width: 640px) 50vw, 33vw"
        unoptimized
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute bottom-3 left-3 right-3">
        <h3 className="font-display text-lg font-bold text-white drop-shadow-md">{name}</h3>
        <p className="text-xs text-white/80">{desc}</p>
      </div>
    </Link>
  );
}

export function NeighborhoodGrid() {
  return (
    <>
      {NEIGHBORHOODS.map((n) => (
        <NeighborhoodCard key={n.id} neighborhood={n} />
      ))}
    </>
  );
}
