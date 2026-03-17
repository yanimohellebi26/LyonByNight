"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ArrowLeft, ArrowRight, MapPin, Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { Lieu, Evenement } from "@/types";
import type { VibeKey } from "@/app/[locale]/soiree/page";
import { getPlaceholderImage } from "@/lib/placeholder-images";

/** Map vibes to search keywords */
const VIBE_KEYWORDS: Record<VibeKey, readonly string[]> = {
  chill: ["bar calme", "jazz", "terrasse", "vin", "cosy"],
  party: ["club", "dj", "dancefloor", "techno", "festif"],
  culture: ["concert", "théâtre", "expo", "culturel"],
  discover: ["insolite", "nouveau", "quartier", "péniche"],
};

interface StepSuggestionsProps {
  readonly date: string;
  readonly vibes: readonly VibeKey[];
  readonly selectedVenues: readonly Lieu[];
  readonly onSelectedVenuesChange: (venues: Lieu[]) => void;
  readonly selectedEvents: readonly Evenement[];
  readonly onSelectedEventsChange: (events: Evenement[]) => void;
  readonly onNext: () => void;
  readonly onBack: () => void;
}

export function StepSuggestions({
  date,
  vibes,
  selectedVenues,
  onSelectedVenuesChange,
  selectedEvents,
  onSelectedEventsChange,
  onNext,
  onBack,
}: StepSuggestionsProps) {
  const t = useTranslations("soiree");

  const [loading, setLoading] = useState(true);
  const [suggestedVenues, setSuggestedVenues] = useState<Lieu[]>([]);
  const [suggestedEvents, setSuggestedEvents] = useState<Evenement[]>([]);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);

    try {
      // Build search queries from selected vibes
      const keywords = vibes.flatMap((v) => VIBE_KEYWORDS[v]);
      const searchQuery = keywords.slice(0, 3).join(" ");

      // Fetch venues and events in parallel
      const [venuesRes, eventsRes] = await Promise.all([
        fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`),
        fetch(`/api/events?date=${date}`),
      ]);

      const venuesJson = await venuesRes.json();
      const eventsJson = await eventsRes.json();

      const venues: Lieu[] = venuesJson.success
        ? (venuesJson.data as Lieu[]).slice(0, 5)
        : [];
      const events: Evenement[] = eventsJson.success
        ? (eventsJson.data as Evenement[]).slice(0, 5)
        : [];

      setSuggestedVenues(venues);
      setSuggestedEvents(events);

      // Pre-select all venues if user hasn't selected any yet
      if (selectedVenues.length === 0 && venues.length > 0) {
        onSelectedVenuesChange(venues);
      }
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
      setSuggestedVenues([]);
      setSuggestedEvents([]);
    } finally {
      setLoading(false);
    }
  }, [date, vibes, selectedVenues.length, onSelectedVenuesChange]);

  useEffect(() => {
    fetchSuggestions();
    // Only fetch on mount / when vibes or date change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, vibes]);

  function toggleVenue(venue: Lieu) {
    const exists = selectedVenues.some((v) => v.id === venue.id);
    if (exists) {
      onSelectedVenuesChange(
        selectedVenues.filter((v) => v.id !== venue.id)
      );
    } else {
      onSelectedVenuesChange([...selectedVenues, venue]);
    }
  }

  function toggleEvent(event: Evenement) {
    const exists = selectedEvents.some((e) => e.id === event.id);
    if (exists) {
      onSelectedEventsChange(
        selectedEvents.filter((e) => e.id !== event.id)
      );
    } else {
      onSelectedEventsChange([...selectedEvents, event]);
    }
  }

  const hasSelection = selectedVenues.length > 0 || selectedEvents.length > 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="absolute inset-2 animate-pulse rounded-full bg-primary/30" />
          <div className="relative h-8 w-8 rounded-full bg-primary/60" />
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {t("ai_loading")}
        </p>
      </div>
    );
  }

  if (suggestedVenues.length === 0 && suggestedEvents.length === 0) {
    return (
      <div className="space-y-6 py-8 text-center">
        <p className="text-sm text-muted-foreground">{t("no_results")}</p>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("restart")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Venue suggestions */}
      {suggestedVenues.length > 0 && (
        <div className="space-y-3">
          {suggestedVenues.map((venue) => {
            const isSelected = selectedVenues.some((v) => v.id === venue.id);
            const coverSrc =
              venue.photo_cover ??
              getPlaceholderImage(venue.id, venue.categorie, venue.type);

            return (
              <button
                key={venue.id}
                type="button"
                onClick={() => toggleVenue(venue)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                {/* Thumbnail */}
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                  <Image
                    src={coverSrc}
                    alt={venue.nom}
                    fill
                    className="object-cover"
                    sizes="64px"
                    unoptimized
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                      {venue.type}
                    </span>
                    {venue.note != null && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        {venue.note.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm font-semibold">
                    {venue.nom}
                  </p>
                  {venue.quartier && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{venue.quartier}</span>
                    </p>
                  )}
                </div>

                {/* Checkbox */}
                <div className="shrink-0 pointer-events-none">
                  <Checkbox
                    checked={isSelected}
                    aria-label={`${t("include")} ${venue.nom}`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Event suggestions */}
      {suggestedEvents.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("step_suggestions")}
          </h3>
          {suggestedEvents.map((event) => {
            const isSelected = selectedEvents.some((e) => e.id === event.id);

            return (
              <button
                key={event.id}
                type="button"
                onClick={() => toggleEvent(event)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {event.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {event.heure_debut}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm font-semibold">
                    {event.titre}
                  </p>
                  {event.lieu_nom && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{event.lieu_nom}</span>
                    </p>
                  )}
                </div>

                <div className="shrink-0 pointer-events-none">
                  <Checkbox
                    checked={isSelected}
                    aria-label={`${t("include")} ${event.titre}`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={!hasSelection}
          onClick={onNext}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:brightness-110 disabled:opacity-40 disabled:shadow-none disabled:hover:brightness-100"
        >
          {t("next")}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
