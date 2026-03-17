"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  ArrowLeft,
  Copy,
  Share2,
  RotateCcw,
  MapPin,
  Star,
  Check,
} from "lucide-react";
import type { SoireePlan } from "@/app/[locale]/soiree/page";
import { getPlaceholderImage } from "@/lib/placeholder-images";

interface StepSharePlanProps {
  readonly plan: SoireePlan;
  readonly onRestart: () => void;
  readonly onBack: () => void;
}

function buildPlanText(plan: SoireePlan): string {
  const lines: string[] = [];
  lines.push(`Night plan - ${plan.date}`);
  lines.push("");

  if (plan.venues.length > 0) {
    lines.push("Venues:");
    plan.venues.forEach((v, i) => {
      const rating = v.note != null ? ` (${v.note.toFixed(1)}/5)` : "";
      const location = v.quartier ?? v.adresse;
      lines.push(`${i + 1}. ${v.nom}${rating} - ${location}`);
    });
    lines.push("");
  }

  if (plan.events.length > 0) {
    lines.push("Events:");
    plan.events.forEach((e) => {
      const venue = e.lieu_nom ? ` @ ${e.lieu_nom}` : "";
      lines.push(`- ${e.titre} (${e.heure_debut})${venue}`);
    });
    lines.push("");
  }

  lines.push("Built with Lyon Night Guide");
  return lines.join("\n");
}

export function StepSharePlan({ plan, onRestart, onBack }: StepSharePlanProps) {
  const t = useTranslations("soiree");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildPlanText(plan));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in some contexts
    }
  }

  async function handleShare() {
    const text = buildPlanText(plan);

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: t("title"),
          text,
        });
        return;
      } catch {
        // User cancelled or share not available, fall through to copy
      }
    }

    // Fallback to copy
    handleCopy();
  }

  return (
    <div className="space-y-6 py-4">
      {/* Plan header */}
      <div>
        <h2 className="font-display text-lg font-bold">{t("your_plan")}</h2>
        <p className="text-xs text-muted-foreground">{plan.date}</p>
      </div>

      {/* Venue list */}
      {plan.venues.length > 0 && (
        <div className="space-y-2">
          {plan.venues.map((venue, i) => {
            const coverSrc =
              venue.photo_cover ??
              getPlaceholderImage(venue.id, venue.categorie, venue.type);

            return (
              <div
                key={venue.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                {/* Step number */}
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </div>

                {/* Thumbnail */}
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={coverSrc}
                    alt={venue.nom}
                    fill
                    className="object-cover"
                    sizes="48px"
                    unoptimized
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold">{venue.nom}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {venue.note != null && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        {venue.note.toFixed(1)}
                      </span>
                    )}
                    {venue.quartier && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{venue.quartier}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Events */}
      {plan.events.length > 0 && (
        <div className="space-y-2">
          {plan.events.map((event) => (
            <div
              key={event.id}
              className="rounded-2xl border border-border bg-card p-3"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {event.type}
                </span>
                <span className="text-xs text-muted-foreground">
                  {event.heure_debut}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold">{event.titre}</p>
              {event.lieu_nom && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {event.lieu_nom}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:brightness-110"
        >
          <Share2 className="h-4 w-4" />
          {t("share_group")}
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-7 py-3 text-sm font-medium transition-colors hover:bg-secondary"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              {t("copied")}
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              {t("copy_plan")}
            </>
          )}
        </button>
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onRestart}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t("restart")}
        </button>
      </div>
    </div>
  );
}
