"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Lieu } from "@/types";
import { getPlaceholderImage } from "@/lib/placeholder-images";

interface FeaturedVenueCardProps {
  readonly lieu: Lieu;
}

export function FeaturedVenueCard({ lieu }: FeaturedVenueCardProps) {
  const t = useTranslations("home");
  const tLieu = useTranslations("lieu");
  const locale = useLocale();

  const coverSrc =
    lieu.photo_cover ?? getPlaceholderImage(lieu.id, lieu.categorie, lieu.type);

  const badgeLabel = locale === "fr" ? "Coup de c\u0153ur" : "Editor\u2019s Pick";

  return (
    <Link
      href={`/lieu/${lieu.slug}`}
      className="group relative block h-64 w-full overflow-hidden rounded-2xl border border-border/50 md:h-80"
    >
      <Image
        src={coverSrc}
        alt={lieu.nom}
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-105"
        sizes="(max-width: 768px) 100vw, 1152px"
        unoptimized
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Badge */}
      <div className="absolute left-4 top-4 flex items-center gap-1.5">
        <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg">
          {badgeLabel}
        </span>
        <span className="rounded-full bg-background/70 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-md">
          {lieu.type === "club" ? tLieu("type_club") : tLieu("type_bar")}
        </span>
      </div>

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-2xl font-bold leading-tight text-white md:text-3xl">
              {lieu.nom}
            </h3>
            {lieu.note != null && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-medium text-white/90">
                  {lieu.note.toFixed(1)}
                </span>
              </div>
            )}
            {lieu.description && (
              <p className="mt-2 line-clamp-2 max-w-lg text-sm leading-relaxed text-white/70">
                {lieu.description}
              </p>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all group-hover:brightness-110 group-hover:shadow-xl">
            {t("discover")}
          </span>
        </div>
      </div>
    </Link>
  );
}
