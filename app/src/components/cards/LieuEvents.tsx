"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar, Loader2 } from "lucide-react";
import { EventCard } from "@/components/cards/EventCard";
import type { Evenement } from "@/types";

type EnrichedEvent = Evenement & { lieu_nom: string };

interface LieuEventsProps {
  readonly lieuId: string;
}

export function LieuEvents({ lieuId }: LieuEventsProps) {
  const t = useTranslations("lieu");
  const [events, setEvents] = useState<EnrichedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/events?lieu_id=${encodeURIComponent(lieuId)}&period=month`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setEvents(json.data);
      })
      .finally(() => setLoading(false));
  }, [lieuId]);

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
