"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Calendar, Loader2 } from "lucide-react";
import { EventCard } from "@/components/cards/EventCard";
import { translateEvent } from "@/lib/utils/translations";
import type { Evenement } from "@/types";

type EnrichedEvent = Evenement & { lieu_nom: string };

interface LieuEventsProps {
  readonly lieuId: string;
}

export function LieuEvents({ lieuId }: LieuEventsProps) {
  const t = useTranslations("lieu");
  const locale = useLocale();
  const [events, setEvents] = useState<EnrichedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/events?lieu_id=${encodeURIComponent(lieuId)}&period=month`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setEvents(
          (json.data as EnrichedEvent[]).map((e) => ({
            ...translateEvent(e, locale),
            lieu_nom: e.lieu_nom,
          }))
        );
      })
      .finally(() => setLoading(false));
  }, [lieuId, locale]);

  if (loading) {
    return (
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Calendar className="h-5 w-5" /> {t("upcoming_events")}
        </h2>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (events.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <Calendar className="h-5 w-5" /> {t("upcoming_events")}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {events.slice(0, 4).map((evt) => (
          <EventCard key={evt.id} event={evt} compact />
        ))}
      </div>
    </section>
  );
}
