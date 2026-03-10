"use client";

import { Calendar, Clock, ExternalLink, MapPin, Music, Ticket } from "lucide-react";
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

/** Curated Unsplash photos per event type (landscape, 400x200 crop) */
const TYPE_IMAGES: Record<string, string> = {
  concert: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=300&fit=crop",
  dj_set: "https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=600&h=300&fit=crop",
  soiree_theme: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=300&fit=crop",
  quiz: "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=600&h=300&fit=crop",
  cultural: "https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=600&h=300&fit=crop",
  student: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&h=300&fit=crop",
  erasmus: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=300&fit=crop",
  scientific: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=300&fit=crop",
  theater: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=600&h=300&fit=crop",
  festival: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=300&fit=crop",
  expo: "https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=600&h=300&fit=crop",
  workshop: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=300&fit=crop",
  sport: "https://images.unsplash.com/photo-1461896836934-bd45ba8bfb5f?w=600&h=300&fit=crop",
  autre: "https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=600&h=300&fit=crop",
};

export function EventCard({ event, compact, serverToday }: EventCardProps) {
  const t = useTranslations("events");
  const locale = useLocale();

  const TYPE_CONFIG: Record<string, { labelKey: string; color: string }> = {
    concert: { labelKey: "type_concert_single", color: "bg-blue-500/10 text-blue-400" },
    dj_set: { labelKey: "type_dj_set_single", color: "bg-purple-500/10 text-purple-400" },
    soiree_theme: { labelKey: "type_soiree_single", color: "bg-pink-500/10 text-pink-400" },
    quiz: { labelKey: "type_quiz_single", color: "bg-amber-500/10 text-amber-400" },
    cultural: { labelKey: "type_cultural_single", color: "bg-teal-500/10 text-teal-400" },
    student: { labelKey: "type_student_single", color: "bg-orange-500/10 text-orange-400" },
    erasmus: { labelKey: "type_erasmus_single", color: "bg-cyan-500/10 text-cyan-400" },
    scientific: { labelKey: "type_scientific_single", color: "bg-indigo-500/10 text-indigo-400" },
    theater: { labelKey: "type_theater_single", color: "bg-rose-500/10 text-rose-400" },
    festival: { labelKey: "type_festival_single", color: "bg-violet-500/10 text-violet-400" },
    expo: { labelKey: "type_expo_single", color: "bg-lime-500/10 text-lime-400" },
    workshop: { labelKey: "type_workshop_single", color: "bg-sky-500/10 text-sky-400" },
    sport: { labelKey: "type_sport_single", color: "bg-red-500/10 text-red-400" },
    autre: { labelKey: "type_other_single", color: "bg-emerald-500/10 text-emerald-400" },
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
  const imageUrl = event.image || TYPE_IMAGES[event.type] || TYPE_IMAGES.autre;

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:border-primary/30">
        <img
          src={imageUrl}
          alt=""
          className="h-10 w-10 shrink-0 rounded-lg object-cover"
        />
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
      {/* Header with photo */}
      <div className="relative h-40 overflow-hidden rounded-t-2xl">
        <img
          src={imageUrl}
          alt={event.titre}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute left-3 top-3">
          <Badge className={`${config.color} border-0 text-xs backdrop-blur-sm`}>
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
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-base font-semibold leading-tight text-white drop-shadow-md line-clamp-2">
            {event.titre}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3 p-4">
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
            event.lieu_id ? (
              <Link
                href={`/lieu/${event.lieu_id}`}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{event.lieu_nom}</span>
              </Link>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{event.lieu_nom}</span>
              </div>
            )
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
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              {t("view_original")}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
