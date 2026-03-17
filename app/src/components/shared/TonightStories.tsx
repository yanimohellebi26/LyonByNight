"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Lieu } from "@/types";
import { getPlaceholderImage } from "@/lib/placeholder-images";

const STORY_DURATION_MS = 5000;

interface TonightStoriesProps {
  readonly venues: readonly Lieu[];
}

function getVenueCover(venue: Lieu): string {
  return (
    venue.photo_cover ??
    getPlaceholderImage(venue.id, venue.categorie, venue.type)
  );
}

function getTypeBadge(type: string): string {
  return type === "club" ? "Club" : "Bar";
}

function getTonightEvent(venue: Lieu): string | null {
  const today = new Date().toISOString().split("T")[0];
  const event = venue.evenements.find((e) => e.date === today);
  return event?.titre ?? null;
}

export function TonightStories({ venues }: TonightStoriesProps) {
  const t = useTranslations("home");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const isOpen = activeIndex !== null;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    clearTimer();
    setActiveIndex(null);
    setProgress(0);
  }, [clearTimer]);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => {
      if (prev === null) return null;
      if (prev >= venues.length - 1) {
        // last story => close
        return null;
      }
      return prev + 1;
    });
    setProgress(0);
  }, [venues.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => {
      if (prev === null || prev <= 0) return prev;
      return prev - 1;
    });
    setProgress(0);
  }, []);

  // Auto-advance timer
  useEffect(() => {
    if (!isOpen) return;

    clearTimer();
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(elapsed / STORY_DURATION_MS, 1);
      setProgress(pct);

      if (pct >= 1) {
        goNext();
      }
    }, 50);

    return clearTimer;
  }, [isOpen, activeIndex, clearTimer, goNext]);

  // When goNext sets activeIndex to null (past last story), close
  useEffect(() => {
    if (activeIndex === null) {
      clearTimer();
      setProgress(0);
    }
  }, [activeIndex, clearTimer]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, close, goNext, goPrev]);

  // Prevent body scroll when overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (venues.length === 0) return null;

  const activeVenue =
    activeIndex !== null ? venues[activeIndex] ?? null : null;

  return (
    <>
      {/* Horizontal scrollable story strip */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide px-1">
        {venues.map((venue, i) => {
          const hasEvent = getTonightEvent(venue) !== null;
          const cover = getVenueCover(venue);

          return (
            <button
              key={venue.id}
              type="button"
              onClick={() => {
                setActiveIndex(i);
                setProgress(0);
              }}
              className="flex shrink-0 flex-col items-center gap-1.5"
            >
              <div
                className={`rounded-full p-0.5 ${
                  hasEvent
                    ? "bg-gradient-to-br from-primary to-accent"
                    : "bg-border"
                }`}
              >
                <div className="h-[72px] w-[72px] rounded-full border-2 border-background overflow-hidden">
                  <Image
                    src={cover}
                    alt={venue.nom}
                    width={72}
                    height={72}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>
              </div>
              <span className="max-w-[80px] truncate text-[10px] text-muted-foreground">
                {venue.nom}
              </span>
            </button>
          );
        })}
      </div>

      {/* Fullscreen story overlay */}
      <AnimatePresence>
        {isOpen && activeVenue && (
          <motion.div
            key="story-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90"
            onClick={close}
          >
            {/* Progress bar */}
            <div className="absolute left-0 right-0 top-0 z-10 flex gap-1 px-3 pt-3">
              {venues.map((_, i) => (
                <div
                  key={venues[i]!.id}
                  className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/20"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-100 ease-linear"
                    style={{
                      width:
                        i < (activeIndex ?? 0)
                          ? "100%"
                          : i === activeIndex
                            ? `${progress * 100}%`
                            : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
              className="absolute right-4 top-8 z-10 text-white/80 transition-colors hover:text-white"
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Story content card */}
            <motion.div
              key={activeVenue.id}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cover photo */}
              <div className="relative h-64 w-full">
                <Image
                  src={getVenueCover(activeVenue)}
                  alt={activeVenue.nom}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 448px"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                {/* Type badge */}
                <div className="absolute left-4 top-4">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                    {getTypeBadge(activeVenue.type)}
                  </span>
                </div>
              </div>

              {/* Venue info */}
              <div className="p-5">
                <h3 className="font-display text-xl font-bold text-white">
                  {activeVenue.nom}
                </h3>

                {getTonightEvent(activeVenue) && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium text-primary">
                      {t("stories_tonight")}
                    </span>
                    <span className="text-sm text-white/70">
                      {getTonightEvent(activeVenue)}
                    </span>
                  </div>
                )}

                <Link
                  href={`/lieu/${activeVenue.slug}`}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110"
                  onClick={close}
                >
                  {t("stories_view_venue")}
                </Link>
              </div>
            </motion.div>

            {/* Navigation arrows */}
            {(activeIndex ?? 0) > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 backdrop-blur transition-colors hover:bg-white/20"
                aria-label="Previous"
              >
                <ChevronLeft className="h-5 w-5 text-white" />
              </button>
            )}
            {(activeIndex ?? 0) < venues.length - 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 backdrop-blur transition-colors hover:bg-white/20"
                aria-label="Next"
              >
                <ChevronRight className="h-5 w-5 text-white" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
