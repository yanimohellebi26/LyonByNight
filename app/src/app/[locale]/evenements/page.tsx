"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { AlertTriangle, Calendar, Plus, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { EventCard } from "@/components/cards/EventCard";
import { EventCardSkeletonGrid } from "@/components/cards/EventCardSkeleton";
import {
  FadeIn,
  StaggerList,
  StaggerItem,
} from "@/components/shared/MotionWrapper";
import { PageTransition } from "@/components/shared/PageTransition";
import { translateEvent } from "@/lib/utils/translations";
import type { Evenement } from "@/types";

type EnrichedEvent = Evenement & { lieu_nom: string };

const EVENT_TYPES = [
  { value: "all", labelKey: "type_all" },
  { value: "concert", labelKey: "type_concert" },
  { value: "dj_set", labelKey: "type_dj_set" },
  { value: "soiree_theme", labelKey: "type_soiree" },
  { value: "quiz", labelKey: "type_quiz" },
  { value: "cultural", labelKey: "type_cultural" },
  { value: "student", labelKey: "type_student" },
  { value: "erasmus", labelKey: "type_erasmus" },
  { value: "scientific", labelKey: "type_scientific" },
  { value: "theater", labelKey: "type_theater" },
  { value: "festival", labelKey: "type_festival" },
  { value: "expo", labelKey: "type_expo" },
  { value: "workshop", labelKey: "type_workshop" },
  { value: "sport", labelKey: "type_sport" },
  { value: "autre", labelKey: "type_other" },
] as const;

const PERIOD_OPTIONS = [
  { value: "tonight", labelKey: "tonight" },
  { value: "week", labelKey: "this_week" },
  { value: "month", labelKey: "this_month" },
] as const;

export default function EvenementsPage() {
  const t = useTranslations("events");
  const tCreate = useTranslations("create_event");
  const locale = useLocale();
  const { user } = useAuth();

  const [events, setEvents] = useState<EnrichedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("week");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ period });
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (debouncedSearch) params.set("q", debouncedSearch);

      try {
        const res = await fetch(`/api/events?${params}`, { signal: controller.signal });
        const json = await res.json();
        if (!cancelled && json.success) {
          setEvents((json.data as EnrichedEvent[]).map((e) => ({
            ...translateEvent(e, locale),
            lieu_nom: e.lieu_nom,
          })));
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!cancelled) setError(t("error_loading"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; controller.abort(); };
  }, [period, typeFilter, locale, debouncedSearch, fetchKey, t]);

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
    <PageTransition>
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <FadeIn>
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold">{t("title")}</h1>
          </div>
          {user && (
            <Link href="/evenements/creer">
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                {tCreate("cta")}
              </Button>
            </Link>
          )}
        </div>
      </FadeIn>

      {/* Filters */}
      <FadeIn delay={0.1}>
        <div className="mb-8 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-auto sm:min-w-[250px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("search_events")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

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

          <span className="text-sm text-muted-foreground">
            {t("event_count", { count: events.length })}
          </span>
        </div>

        {/* Type filter pills */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {EVENT_TYPES.map((et) => (
            <button
              key={et.value}
              onClick={() => setTypeFilter(et.value)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                typeFilter === et.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(et.labelKey)}
            </button>
          ))}
        </div>
      </FadeIn>

      {/* Content */}
      {loading ? (
        <EventCardSkeletonGrid count={6} />
      ) : error ? (
        <FadeIn>
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
              <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-destructive" />
              <p className="mb-4 text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFetchKey((k) => k + 1)}
              >
                {t("retry")}
              </Button>
            </div>
          </div>
        </FadeIn>
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
    </PageTransition>
  );
}
