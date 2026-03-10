"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { getContextualSuggestion } from "@/lib/utils/horaires";

interface ChatSuggestionsProps {
  readonly onSelect: (suggestion: string) => void;
}

/** Get dynamic contextual suggestions based on time of day */
function getContextualChatSuggestions(locale: "fr" | "en" = "fr"): string[] {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const isWeekend = day === 0 || day === 5 || day === 6;

  if (locale === "fr") {
    if (hour >= 22 || hour < 3) {
      return [
        "Quel club est encore ouvert ?",
        "Un bar ouvert après minuit",
        isWeekend ? "Meilleur club techno ce soir" : "Bar chill ouvert tard en semaine",
      ];
    }
    if (hour >= 18 && hour < 22) {
      return [
        "Où prendre l'apéro ce soir ?",
        "Bar avec terrasse pas cher",
        isWeekend ? "Meilleur spot pour commencer la soirée" : "Bar afterwork sympa",
      ];
    }
    return [
      "Bar avec terrasse pour cet après-midi",
      "Meilleur cocktail bar de Lyon",
    ];
  }

  // English
  if (hour >= 22 || hour < 3) {
    return [
      "Which clubs are still open?",
      "Bar open past midnight",
      isWeekend ? "Best techno club tonight" : "Chill bar open late on weekdays",
    ];
  }
  if (hour >= 18 && hour < 22) {
    return [
      "Where to grab drinks tonight?",
      "Cheap bar with terrace",
      isWeekend ? "Best spot to start the night" : "Nice afterwork bar",
    ];
  }
  return [
    "Bar with terrace for this afternoon",
    "Best cocktail bar in Lyon",
  ];
}

export function ChatSuggestions({ onSelect }: ChatSuggestionsProps) {
  const t = useTranslations("chat");
  const locale = useLocale() as "fr" | "en";
  const [contextual] = useState<string[]>(() => getContextualChatSuggestions(locale));

  // Mix static i18n suggestions with contextual ones
  const staticSuggestions = [
    t("suggestions.0"),
    t("suggestions.1"),
    t("suggestions.2"),
    t("suggestions.3"),
  ];

  // Take 2 contextual + 2 static for variety
  const suggestions = [
    ...contextual.slice(0, 2),
    ...staticSuggestions.slice(0, 2),
  ];

  // Deduplicate
  const unique = [...new Set(suggestions)].slice(0, 4);

  return (
    <div className="flex flex-wrap gap-2">
      {unique.map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => onSelect(suggestion)}
          className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 hover:border-primary/50"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

/** Banner-style contextual suggestion for the chat welcome screen */
export function ChatContextBanner({ onSelect }: ChatSuggestionsProps) {
  const locale = useLocale() as "fr" | "en";
  const [suggestion] = useState<ReturnType<typeof getContextualSuggestion> | null>(() =>
    getContextualSuggestion(locale)
  );

  if (!suggestion) return null;

  return (
    <button
      onClick={() => onSelect(suggestion.message)}
      className="w-full rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-primary/10"
    >
      {suggestion.message}
    </button>
  );
}
