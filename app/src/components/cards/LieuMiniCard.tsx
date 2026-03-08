"use client";

import { MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Lieu } from "@/types";
import { RatingStars } from "@/components/shared/RatingStars";

interface LieuMiniCardProps {
  readonly lieu: Lieu;
  readonly isActive?: boolean;
  readonly onHover?: (id: string | null) => void;
}

export function LieuMiniCard({ lieu, isActive, onHover }: LieuMiniCardProps) {
  return (
    <Link
      href={`/lieu/${lieu.slug}`}
      className={`block rounded-xl border p-3 transition-all ${
        isActive
          ? "border-primary bg-primary/5"
          : "bg-card hover:border-primary/30"
      }`}
      onMouseEnter={() => onHover?.(lieu.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <h3 className="text-sm font-semibold leading-tight">{lieu.nom}</h3>
      <div className="mt-1 flex items-center gap-2">
        <RatingStars note={lieu.note} size="sm" />
        <span className="text-xs font-medium text-amber-400">
          {lieu.prix.fourchette}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3 shrink-0" />
        <span className="truncate">{lieu.arrondissement ? `Lyon ${lieu.arrondissement}` : lieu.adresse}</span>
        {(lieu as Lieu & { _distance?: number })._distance != null && (
          <span className="ml-auto shrink-0 text-primary">
            {(lieu as Lieu & { _distance?: number })._distance! < 1
              ? `${Math.round((lieu as Lieu & { _distance?: number })._distance! * 1000)}m`
              : `${(lieu as Lieu & { _distance?: number })._distance} km`}
          </span>
        )}
      </div>
      {lieu.musique.length > 0 && (
        <p className="mt-1 truncate text-xs text-muted-foreground">
          ♫ {lieu.musique.slice(0, 2).join(", ")}
        </p>
      )}
    </Link>
  );
}
