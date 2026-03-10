"use client";

import { Calendar, Clock, MapPin, Music, Ticket } from "lucide-react";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import type { Evenement } from "@/types";

interface EventCardProps {
  readonly event: Evenement & { lieu_nom?: string };
  readonly compact?: boolean;
  /** ISO date string (YYYY-MM-DD) for "today", passed from server to prevent hydration mismatch */
  readonly serverToday?: string;
}

export function EventCard({ event, compact, serverToday }: EventCardProps) {
  const t = useTranslations("events");
  const locale = useLocale();

  const TYPE_CONFIG: Record<string, { emoji: string; labelKey: string; color: string }> = {
    concert: { emoji: "🎵", labelKey: "type_concert_single", color: "bg-blue-500/10 text-blue-400" },
    dj_set: { emoji: "🎧", labelKey: "type_dj_set_single", color: "bg-purple-500/10 text-purple-400" },
    soiree_theme: { emoji: "🎉", labelKey: "type_soiree_single", color: "bg-pink-500/10 text-pink-400" },
    quiz: { emoji: "🧠", labelKey: "type_quiz_single", color: "bg-amber-500/10 text-amber-400" },
    autre: { emoji: "✨", labelKey: "type_other_single", color: "bg-emerald-500/10 text-emerald-400" },
  };

  /* Use server-provided date when available to avoid server/client timezone mismatch */
  const todayIso = useMemo(() => {
    if (serverToday) return serverToday;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, [serverToday]);

  function formatDate(isoDate: string): string {
    const eventDate = new Date(isoDate + "T00:00:00");
    const today = new Date(todayIso + "T00:00:00");
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (eventDate.getTime() === today.getTime()) return t("tonight");
    if (eventDate.getTime() === tomorrow.getTime()) return t("tomorrow");

    return eventDate.toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  const config = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.autre;
  const dateLabel = formatDate(event.date);
  const isTonightOrTomorrow = dateLabel === t("tonight") || dateLabel === t("tomorrow");

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:border-primary/30">
        <span className="text-2xl">{config.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{event.titre}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{dateLabel}</span>
            <span>·</span>
            <span>{event.heure_debut}</span>
          </div>
        </div>
        {event.prix_entree && (
          <span className="shrink-0 text-xs font-medium text-primary">
            {event.prix_entree}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="group rounded-2xl border bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
      {/* Header with type + date */}
      <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-t-2xl bg-gradient-to-br from-muted to-muted/50">
        <span className="text-5xl">{config.emoji}</span>
        <div className="absolute left-3 top-3">
          <Badge className={`${config.color} border-0 text-xs`}>
            {t(config.labelKey)}
          </Badge>
        </div>
        {isTonightOrTomorrow && (
          <div className="absolute right-3 top-3">
            <Badge className="bg-primary text-primary-foreground border-0 text-xs animate-pulse">
              {dateLabel}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-3 p-4">
        <h3 className="text-base font-semibold leading-tight group-hover:text-primary transition-colors">
          {event.titre}
        </h3>

        {event.artiste && (
          <div className="flex items-center gap-1.5 text-sm text-primary">
            <Music className="h-3.5 w-3.5" />
            <span className="truncate font-medium">{event.artiste}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{dateLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>
              {event.heure_debut}
              {event.heure_fin && ` — ${event.heure_fin}`}
            </span>
          </div>
          {event.lieu_nom && (
            <Link
              href={`/lieu/${event.lieu_id}`}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.lieu_nom}</span>
            </Link>
          )}
        </div>

        {event.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {event.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          {event.prix_entree && (
            <div className="flex items-center gap-1 text-sm font-medium">
              <Ticket className="h-3.5 w-3.5 text-primary" />
              <span>{event.prix_entree}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
