"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Moon, Sun, PartyPopper, Clock } from "lucide-react";
import { getContextualSuggestion } from "@/lib/utils/horaires";

const TYPE_ICONS = {
  evening: Sun,
  late_night: Moon,
  afternoon: Sun,
  weekend: PartyPopper,
  default: Clock,
} as const;

export function ContextualBanner() {
  const locale = useLocale();
  const [suggestion, setSuggestion] = useState<ReturnType<typeof getContextualSuggestion> | null>(null);

  useEffect(() => {
    setSuggestion(getContextualSuggestion(locale as "fr" | "en"));
  }, [locale]);

  if (!suggestion) return null;

  const Icon = TYPE_ICONS[suggestion.type];

  return (
    <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <p className="text-muted-foreground">{suggestion.message}</p>
    </div>
  );
}
