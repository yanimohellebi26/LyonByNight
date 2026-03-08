"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Calendar, Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EventCard } from "@/components/cards/EventCard";
import {
  FadeIn,
  StaggerList,
  StaggerItem,
} from "@/components/shared/MotionWrapper";
import { translateEvent } from "@/lib/utils/translations";
import type { Evenement } from "@/types";

type EnrichedEvent = Evenement & { lieu_nom: string };

const EVENT_TYPES = [
  { value: "all", labelKey: "type_all" },
  { value: "concert", labelKey: "type_concert" },
  { value: "dj_set", labelKey: "type_dj_set" },
  { value: "soiree_theme", labelKey: "type_soiree" },
  { value: "quiz", labelKey: "type_quiz" },
  { value: "autre", labelKey: "type_other" },
] as const;

const PERIOD_OPTIONS = [
  { value: "tonight", labelKey: "tonight" },
  { value: "week", labelKey: "this_week" },
  { value: "month", labelKey: "this_month" },
] as const;

export default function EvenementsPage() {
  const t = useTranslations("events");
  const locale = useLocale();

  const [events, setEvents] = useState<EnrichedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("week");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      const params = new URLSearchParams({ period });
      if (typeFilter !== "all") params.set("type", typeFilter);

      try {
        const res = await fetch(`/api/events?${params}`, { signal: controller.signal });
        const json = await res.json();
        if (!cancelled && json.success) {
          setEvents((json.data as EnrichedEvent[]).map((e) => ({
            ...translateEvent(e, locale),
            lieu_nom: e.lieu_nom,
          })));
        }
      } catch {
        /* aborted */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; controller.abort(); };
  }, [period, typeFilter]);

  // Group events by date
  const grouped = events.reduce<Record<string, EnrichedEvent[]>>((acc, evt) => {
    const key = evt.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(evt);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  function formatDateHeader(iso: string): string {
    const date = new Date(iso + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() === today.getTime()) return t("tonight");
    if (date.getTime() === tomorrow.getTime()) return t("tomorrow");

    return date.toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <FadeIn>
        <div className="mb-8 flex items-center gap-3">
          <Calendar className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">{t("title")}</h1>
        </div>
      </FadeIn>

      {/* Filters */}
      <FadeIn delay={0.1}>
        <div className="mb-8 flex flex-wrap items-center gap-3">
          {/* Period tabs */}
          <div className="flex gap-1 rounded-lg border bg-card p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  period === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((et) => (
                <SelectItem key={et.value} value={et.value}>
                  {t(et.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-sm text-muted-foreground">
            {events.length} {events.length === 1 ? (locale === "en" ? "event" : "événement") : (locale === "en" ? "events" : "événements")}
          </span>
        </div>
      </FadeIn>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : events.length === 0 ? (
        <FadeIn>
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg text-muted-foreground">{t("no_events")}</p>
            <Button
              variant="outline"
              onClick={() => {
                setPeriod("month");
                setTypeFilter("all");
              }}
            >
              {t("see_all_month")}
            </Button>
          </div>
        </FadeIn>
      ) : (
        <div className="space-y-10">
          {sortedDates.map((date) => (
            <section key={date}>
              <h2 className="mb-4 text-lg font-semibold capitalize">
                {formatDateHeader(date)}
              </h2>
              <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grouped[date].map((evt) => (
                  <StaggerItem key={evt.id}>
                    <EventCard event={evt} />
                  </StaggerItem>
                ))}
              </StaggerList>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
