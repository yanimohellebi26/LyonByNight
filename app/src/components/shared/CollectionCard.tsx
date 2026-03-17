"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

interface Collection {
  readonly id: string;
  readonly title: { readonly fr: string; readonly en: string };
  readonly filter: string;
  readonly image: string;
  readonly count: number;
}

const COLLECTIONS: readonly Collection[] = [
  {
    id: "jazz",
    title: { fr: "Bars Jazz", en: "Jazz Bars" },
    filter: "musique=jazz",
    image:
      "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&h=400&fit=crop",
    count: 8,
  },
  {
    id: "rooftop",
    title: { fr: "Rooftops & Terrasses", en: "Rooftops & Terraces" },
    filter: "categorie=rooftop",
    image:
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&h=400&fit=crop",
    count: 5,
  },
  {
    id: "budget",
    title: { fr: "Budget \u00c9tudiant", en: "Student Budget" },
    filter: "fourchette=%E2%82%AC",
    image:
      "https://images.unsplash.com/photo-1575037614876-c38a4c44f5b8?w=600&h=400&fit=crop",
    count: 12,
  },
  {
    id: "dancefloor",
    title: { fr: "Clubs & Dancefloors", en: "Clubs & Dancefloors" },
    filter: "type=club",
    image:
      "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=600&h=400&fit=crop",
    count: 10,
  },
] as const;

export function CollectionCard({ collection }: { readonly collection: Collection }) {
  const locale = useLocale();
  const title = locale === "fr" ? collection.title.fr : collection.title.en;
  const venueLabel = locale === "fr" ? "lieux" : "venues";

  return (
    <Link
      href={`/explorer?${collection.filter}`}
      className="group relative block h-40 min-w-[200px] flex-shrink-0 overflow-hidden rounded-2xl md:min-w-0"
    >
      <Image
        src={collection.image}
        alt={title}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-110"
        sizes="(max-width: 768px) 200px, 25vw"
        unoptimized
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="font-display text-base font-bold leading-tight text-white">
          {title}
        </h3>
        <p className="mt-0.5 text-xs text-white/70">
          {collection.count} {venueLabel}
        </p>
      </div>
    </Link>
  );
}

export function CollectionGrid() {
  return (
    <>
      {COLLECTIONS.map((collection) => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </>
  );
}
