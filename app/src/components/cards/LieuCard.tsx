"use client";

import Image from "next/image";
import { MapPin, GitCompareArrows, Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Lieu } from "@/types";
import { RatingStars } from "@/components/shared/RatingStars";
import { PriceDisplay } from "@/components/shared/PriceDisplay";
import { MusicTags } from "@/components/shared/MusicTags";
import { OpenStatusBadge } from "@/components/shared/OpenStatusBadge";
import { getPlaceholderImage } from "@/lib/placeholder-images";

interface LieuCardProps {
  readonly lieu: Lieu;
  readonly onCompare?: (id: string) => void;
  readonly isCompared?: boolean;
  readonly hasEventTonight?: boolean;
  readonly onToggleFavorite?: (id: string) => void;
  readonly isFavorite?: boolean;
}

export function LieuCard({
  lieu,
  onCompare,
  isCompared,
  hasEventTonight,
  onToggleFavorite,
  isFavorite,
}: LieuCardProps) {
  const t = useTranslations("lieu");
  const coverSrc = lieu.photo_cover ?? getPlaceholderImage(lieu.id, lieu.categorie, lieu.type);

  return (
    <Link
      href={`/lieu/${lieu.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border/50 bg-card transition-all duration-500 hover:border-primary/40 hover:shadow-[0_8px_40px_-12px] hover:shadow-primary/20"
    >
      {/* Photo area / category banner */}
      <div className="relative flex h-32 items-center justify-center overflow-hidden sm:h-40 bg-gradient-to-br from-muted to-muted/50">
        <Image
          src={coverSrc}
          alt={lieu.nom}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          unoptimized
        />
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span className="rounded-full bg-background/70 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-md">
            {lieu.type === "club" ? t("type_club") : t("type_bar")}
          </span>
          {hasEventTonight && (
            <span className="animate-pulse rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
              {t("tonight_event")}
            </span>
          )}
        </div>
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite(lieu.id);
              }}
              className={`rounded-full p-2 backdrop-blur-sm transition-all ${
                isFavorite
                  ? "bg-red-500/90 text-white scale-110"
                  : "bg-background/80 text-muted-foreground hover:text-red-500"
              }`}
              aria-label={isFavorite ? t("remove_favorite") : t("add_favorite")}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
            </button>
          )}
          {onCompare && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCompare(lieu.id);
              }}
              className={`rounded-full p-2 backdrop-blur-sm transition-colors ${
                isCompared
                  ? "bg-primary text-primary-foreground"
                  : "bg-background/80 text-muted-foreground hover:text-foreground"
              }`}
              aria-label={t("add_compare")}
            >
              <GitCompareArrows className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2 p-3 sm:space-y-2.5 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <MusicTags genres={lieu.musique} />
          <OpenStatusBadge horaires={lieu.horaires} compact />
        </div>

        <h3 className="font-display text-sm font-semibold leading-tight group-hover:text-primary transition-colors sm:text-base">
          {lieu.nom}
        </h3>

        <div className="flex items-center justify-between">
          <RatingStars note={lieu.note} />
          <PriceDisplay
            fourchette={lieu.prix?.fourchette ?? "€€"}
            pinte_moy={lieu.prix?.pinte_moy ?? null}
            cocktail_moy={lieu.prix?.cocktail_moy ?? null}
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {lieu.quartier
              ? `${lieu.quartier} — Lyon ${lieu.arrondissement}`
              : lieu.arrondissement
                ? `Lyon ${lieu.arrondissement}`
                : lieu.adresse}
          </span>
        </div>

        {lieu.description && (
          <p className="hidden line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:block">
            {lieu.description}
          </p>
        )}
      </div>
    </Link>
  );
}
