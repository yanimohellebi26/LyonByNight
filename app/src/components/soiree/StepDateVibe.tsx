"use client";

import { useTranslations } from "next-intl";
import { Wine, PartyPopper, Palette, Compass, ArrowRight } from "lucide-react";
import type { VibeKey } from "@/app/[locale]/soiree/page";

interface VibeOption {
  readonly key: VibeKey;
  readonly icon: React.ReactNode;
  readonly titleKey: string;
  readonly descKey: string;
}

const VIBE_OPTIONS: readonly VibeOption[] = [
  {
    key: "chill",
    icon: <Wine className="h-6 w-6" />,
    titleKey: "vibe_chill",
    descKey: "vibe_chill_desc",
  },
  {
    key: "party",
    icon: <PartyPopper className="h-6 w-6" />,
    titleKey: "vibe_party",
    descKey: "vibe_party_desc",
  },
  {
    key: "culture",
    icon: <Palette className="h-6 w-6" />,
    titleKey: "vibe_culture",
    descKey: "vibe_culture_desc",
  },
  {
    key: "discover",
    icon: <Compass className="h-6 w-6" />,
    titleKey: "vibe_discover",
    descKey: "vibe_discover_desc",
  },
];

interface StepDateVibeProps {
  readonly date: string;
  readonly onDateChange: (date: string) => void;
  readonly vibes: readonly VibeKey[];
  readonly onToggleVibe: (vibe: VibeKey) => void;
  readonly onNext: () => void;
}

export function StepDateVibe({
  date,
  onDateChange,
  vibes,
  onToggleVibe,
  onNext,
}: StepDateVibeProps) {
  const t = useTranslations("soiree");

  const canProceed = vibes.length > 0 && date.length > 0;

  return (
    <div className="space-y-6 py-4">
      {/* Date picker */}
      <div>
        <label
          htmlFor="soiree-date"
          className="mb-2 block text-sm font-medium text-muted-foreground"
        >
          {t("date_label")}
        </label>
        <input
          id="soiree-date"
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Vibe selector */}
      <div className="grid grid-cols-2 gap-3">
        {VIBE_OPTIONS.map((vibe) => {
          const isActive = vibes.includes(vibe.key);
          return (
            <button
              key={vibe.key}
              type="button"
              onClick={() => onToggleVibe(vibe.key)}
              className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/30 hover:bg-primary/[0.02]"
              }`}
            >
              <div
                className={`transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {vibe.icon}
              </div>
              <div>
                <p className="text-sm font-semibold">{t(vibe.titleKey)}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {t(vibe.descKey)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Next button */}
      <button
        type="button"
        disabled={!canProceed}
        onClick={onNext}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:brightness-110 disabled:opacity-40 disabled:shadow-none disabled:hover:brightness-100"
      >
        {t("next")}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
