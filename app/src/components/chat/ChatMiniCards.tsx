"use client";

import { useEffect, useState } from "react";
import { MapPin, Star } from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { translateLieu } from "@/lib/utils/translations";
import type { Lieu } from "@/types";

interface ChatMiniCardsProps {
  readonly lieuIds: string[];
}

export function ChatMiniCards({ lieuIds }: ChatMiniCardsProps) {
  const [lieux, setLieux] = useState<Lieu[]>([]);
  const locale = useLocale();

  useEffect(() => {
    if (lieuIds.length === 0) return;

    async function fetchLieux() {
      const results: Lieu[] = [];
      for (const id of lieuIds.slice(0, 4)) {
        try {
          const res = await fetch(`/api/lieux/${encodeURIComponent(id)}`);
          const json = await res.json();
          if (json.success && json.data) {
            results.push(translateLieu(json.data, locale));
          }
        } catch {
          // skip failed fetches
        }
      }
      setLieux(results);
    }

    fetchLieux();
  }, [lieuIds]);

  if (lieux.length === 0) return null;

  return (
    <div className="space-y-1.5 pl-2">
      {lieux.map((lieu) => (
        <Link
          key={lieu.id}
          href={`/lieu/${lieu.slug}`}
          className="flex items-center gap-3 rounded-xl border bg-card p-2.5 transition-colors hover:border-primary/30"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">
            {lieu.type === "club" ? "🎵" : "🍺"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{lieu.nom}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {lieu.note && (
                <span className="flex items-center gap-0.5 text-amber-400">
                  <Star className="h-3 w-3 fill-current" />
                  {lieu.note}
                </span>
              )}
              <span>{lieu.prix.fourchette}</span>
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                {lieu.arrondissement
                  ? `Lyon ${lieu.arrondissement}`
                  : lieu.quartier ?? ""}
              </span>
            </div>
          </div>
          <span className="text-xs text-primary">{locale === "en" ? "View →" : "Voir →"}</span>
        </Link>
      ))}
    </div>
  );
}
