"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useDebounce } from "@/hooks/useDebounce";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  X,
  Clock,
  Sparkles,
  MapPin,
  Star,
  Calendar,
} from "lucide-react";
import type { Lieu, Evenement } from "@/types";

// ── Constants ────────────────────────────────────────────────

const STORAGE_KEY = "lyon-night-recent-searches";
const MAX_RECENT = 5;
const MAX_RESULTS_PER_CATEGORY = 5;

const SUGGESTIONS_FR = ["Bars jazz", "Ce soir", "Presqu'ile", "Techno", "Cocktail bar"];
const SUGGESTIONS_EN = ["Jazz bars", "Tonight", "Presqu'ile", "Techno", "Cocktail bar"];

const VENUE_TYPE_LABELS: Record<string, string> = {
  bar: "Bar",
  club: "Club",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  concert: "bg-blue-500/10 text-blue-400",
  dj_set: "bg-purple-500/10 text-purple-400",
  soiree_theme: "bg-pink-500/10 text-pink-400",
  quiz: "bg-amber-500/10 text-amber-400",
  cultural: "bg-teal-500/10 text-teal-400",
  student: "bg-orange-500/10 text-orange-400",
  erasmus: "bg-cyan-500/10 text-cyan-400",
  scientific: "bg-indigo-500/10 text-indigo-400",
  theater: "bg-rose-500/10 text-rose-400",
  festival: "bg-emerald-500/10 text-emerald-400",
  expo: "bg-violet-500/10 text-violet-400",
  workshop: "bg-lime-500/10 text-lime-400",
  sport: "bg-red-500/10 text-red-400",
  autre: "bg-gray-500/10 text-gray-400",
};

// ── localStorage helpers ─────────────────────────────────────

function loadRecentSearches(): readonly string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string): readonly string[] {
  const current = loadRecentSearches().filter((s) => s !== query);
  const updated = [query, ...current].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage might be full or unavailable
  }
  return updated;
}

// ── Date formatting ──────────────────────────────────────────

function formatEventDate(dateStr: string, locale: string): string {
  try {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

// ── Types ────────────────────────────────────────────────────

interface SearchOverlayProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

interface SearchResultItem {
  readonly id: string;
  readonly type: "venue" | "event";
  readonly venue?: Lieu;
  readonly event?: Evenement;
}

// ── Component ────────────────────────────────────────────────

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const t = useTranslations("common");
  const tEvents = useTranslations("events");
  const [query, setQuery] = useState("");
  const [venues, setVenues] = useState<readonly Lieu[]>([]);
  const [events, setEvents] = useState<readonly Evenement[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<readonly string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Detect locale for suggestions and date formatting
  const locale = typeof document !== "undefined"
    ? (document.documentElement.lang || "fr")
    : "fr";
  const suggestions = locale === "en" ? SUGGESTIONS_EN : SUGGESTIONS_FR;

  // Load recent searches on mount
  useEffect(() => {
    if (open) {
      setRecentSearches(loadRecentSearches());
    }
  }, [open]);

  // Auto-focus input when overlay opens
  useEffect(() => {
    if (open) {
      // Small delay to allow animation to start
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
    // Reset state when closing
    setQuery("");
    setVenues([]);
    setEvents([]);
    setActiveIndex(-1);
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  // Fetch results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setVenues([]);
      setEvents([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const encoded = encodeURIComponent(debouncedQuery);

    Promise.all([
      fetch(`/api/search?q=${encoded}`).then((r) => r.json()),
      fetch(`/api/events?q=${encoded}`).then((r) => r.json()),
    ])
      .then(([venueRes, eventRes]) => {
        if (cancelled) return;
        setVenues(
          venueRes.success
            ? (venueRes.data as Lieu[]).slice(0, MAX_RESULTS_PER_CATEGORY)
            : []
        );
        // Client-side filter for events since API may not support q param
        const allEvents: Evenement[] = eventRes.success
          ? (eventRes.data as Evenement[])
          : [];
        const lower = debouncedQuery.toLowerCase();
        const filtered = allEvents
          .filter(
            (e) =>
              e.titre.toLowerCase().includes(lower) ||
              (e.lieu_nom && e.lieu_nom.toLowerCase().includes(lower)) ||
              (e.description && e.description.toLowerCase().includes(lower)) ||
              e.type.toLowerCase().includes(lower)
          )
          .slice(0, MAX_RESULTS_PER_CATEGORY);
        setEvents(filtered);
      })
      .catch(() => {
        if (!cancelled) {
          setVenues([]);
          setEvents([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Build flat list of results for keyboard navigation
  const flatResults = useMemo<readonly SearchResultItem[]>(() => {
    const items: SearchResultItem[] = [];
    for (const v of venues) {
      items.push({ id: `venue-${v.id}`, type: "venue", venue: v });
    }
    for (const e of events) {
      items.push({ id: `event-${e.id}`, type: "event", event: e });
    }
    return items;
  }, [venues, events]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [flatResults]);

  const handleSelect = useCallback(
    (searchTerm: string) => {
      if (searchTerm.trim()) {
        const updated = saveRecentSearch(searchTerm.trim());
        setRecentSearches(updated);
      }
    },
    []
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setQuery(suggestion);
    },
    []
  );

  const handleRecentClick = useCallback(
    (recent: string) => {
      setQuery(recent);
    },
    []
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < flatResults.length - 1 ? prev + 1 : prev
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
        return;
      }

      if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        const item = flatResults[activeIndex];
        if (!item) return;
        handleSelect(query);
        if (item.type === "venue" && item.venue) {
          // Navigate programmatically by clicking the link
          const link = resultsRef.current?.querySelector(
            `[data-result-id="${item.id}"]`
          ) as HTMLAnchorElement | null;
          link?.click();
        } else if (item.type === "event" && item.event) {
          const link = resultsRef.current?.querySelector(
            `[data-result-id="${item.id}"]`
          ) as HTMLAnchorElement | null;
          link?.click();
        }
      }
    },
    [activeIndex, flatResults, onClose, query, handleSelect]
  );

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0) return;
    const item = flatResults[activeIndex];
    if (!item) return;
    const el = resultsRef.current?.querySelector(
      `[data-result-id="${item.id}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, flatResults]);

  const hasQuery = debouncedQuery.trim().length >= 2;
  const hasResults = venues.length > 0 || events.length > 0;
  const showEmpty = hasQuery && !loading && !hasResults;
  const showRecent = !hasQuery && recentSearches.length > 0;
  const showSuggestions = !hasQuery;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-start justify-center bg-background/80 backdrop-blur-xl"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={t("search_placeholder")}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-2xl mx-4 mt-[10vh] md:mt-[15vh]"
            onKeyDown={handleKeyDown}
          >
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search_placeholder")}
                className="w-full rounded-2xl border border-border/50 bg-card/90 backdrop-blur-sm py-4 pl-12 pr-12 text-lg font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-xl"
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Results container */}
            <div
              ref={resultsRef}
              className="mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-border/50 bg-card/90 backdrop-blur-sm shadow-xl"
            >
              {/* Loading indicator */}
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}

              {/* Empty state */}
              {showEmpty && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("search_no_results")}
                </div>
              )}

              {/* Venue results */}
              {!loading && venues.length > 0 && (
                <div className="p-2">
                  <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("search_venues")}
                  </h3>
                  {venues.map((venue, idx) => {
                    const resultId = `venue-${venue.id}`;
                    const isActive =
                      flatResults[activeIndex]?.id === resultId;
                    return (
                      <Link
                        key={venue.id}
                        href={`/lieu/${venue.slug}` as "/lieu/[slug]"}
                        data-result-id={resultId}
                        onClick={() => {
                          handleSelect(query);
                          onClose();
                        }}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                          isActive
                            ? "bg-primary/10 text-foreground"
                            : "hover:bg-accent text-foreground"
                        }`}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">
                              {venue.nom}
                            </span>
                            <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-secondary-foreground">
                              {VENUE_TYPE_LABELS[venue.type] || venue.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {venue.note && (
                              <span className="flex items-center gap-0.5">
                                <Star className="h-3 w-3 fill-primary text-primary" />
                                {venue.note.toFixed(1)}
                              </span>
                            )}
                            {venue.quartier && (
                              <span className="truncate">
                                {venue.quartier}
                              </span>
                            )}
                            {!venue.quartier && venue.arrondissement && (
                              <span className="truncate">
                                {venue.arrondissement}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Event results */}
              {!loading && events.length > 0 && (
                <div className="p-2">
                  {venues.length > 0 && (
                    <div className="mx-3 my-1 border-t border-border/50" />
                  )}
                  <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("search_events")}
                  </h3>
                  {events.map((event) => {
                    const resultId = `event-${event.id}`;
                    const isActive =
                      flatResults[activeIndex]?.id === resultId;
                    const typeColor =
                      EVENT_TYPE_COLORS[event.type] ||
                      EVENT_TYPE_COLORS.autre;
                    const typeKey = `type_${event.type}_single` as Parameters<typeof tEvents>[0];
                    return (
                      <Link
                        key={event.id}
                        href={
                          event.lieu_id
                            ? (`/lieu/${event.lieu_id}` as "/lieu/[slug]")
                            : ("/evenements" as "/evenements")
                        }
                        data-result-id={resultId}
                        onClick={() => {
                          handleSelect(query);
                          onClose();
                        }}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                          isActive
                            ? "bg-primary/10 text-foreground"
                            : "hover:bg-accent text-foreground"
                        }`}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Calendar className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">
                              {event.titre}
                            </span>
                            <span
                              className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${typeColor}`}
                            >
                              {tEvents(typeKey)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              {formatEventDate(event.date, locale)}
                            </span>
                            {event.lieu_nom && (
                              <>
                                <span>-</span>
                                <span className="truncate">
                                  {event.lieu_nom}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Recent searches */}
              {showRecent && !loading && (
                <div className="p-2">
                  <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("search_recent")}
                  </h3>
                  {recentSearches.map((recent) => (
                    <button
                      key={recent}
                      onClick={() => handleRecentClick(recent)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-accent"
                    >
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{recent}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {showSuggestions && !loading && (
                <div className="p-2">
                  {showRecent && (
                    <div className="mx-3 my-1 border-t border-border/50" />
                  )}
                  <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("search_suggestions")}
                  </h3>
                  <div className="flex flex-wrap gap-2 px-3 pb-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                      >
                        <Sparkles className="h-3 w-3" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Keyboard hint */}
            <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="hidden md:inline-flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  Esc
                </kbd>{" "}
                {locale === "fr" ? "fermer" : "close"}
              </span>
              <span className="hidden md:inline-flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  &uarr;&darr;
                </kbd>{" "}
                {locale === "fr" ? "naviguer" : "navigate"}
              </span>
              <span className="hidden md:inline-flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  Enter
                </kbd>{" "}
                {locale === "fr" ? "ouvrir" : "open"}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
