"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import type { Horaires } from "@/types";
import { getOpenStatus } from "@/lib/utils/horaires";

interface OpenStatusBadgeProps {
  readonly horaires: Horaires | null;
  readonly compact?: boolean;
}

const STATUS_CONFIG = {
  open: {
    label: { fr: "Ouvert", en: "Open" },
    dot: "bg-green-500",
    text: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
  },
  closing_soon: {
    label: { fr: "Ferme bientôt", en: "Closing soon" },
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  closed: {
    label: { fr: "Fermé", en: "Closed" },
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  unknown: {
    label: { fr: "Horaires N/D", en: "Hours N/A" },
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    bg: "bg-muted/50",
    border: "border-border",
  },
} as const;

export function OpenStatusBadge({ horaires, compact = false }: OpenStatusBadgeProps) {
  const [status, setStatus] = useState<ReturnType<typeof getOpenStatus>>("unknown");
  const locale = useLocale() as "fr" | "en";

  useEffect(() => {
    setStatus(getOpenStatus(horaires));

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      setStatus(getOpenStatus(horaires));
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [horaires]);

  const config = STATUS_CONFIG[status];

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.text} ${config.bg} border ${config.border}`}
        title={config.label[locale]}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${config.dot} ${status === "open" ? "animate-pulse" : ""}`} />
        {config.label[locale]}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.text} ${config.bg} border ${config.border}`}
    >
      <span className={`h-2 w-2 rounded-full ${config.dot} ${status === "open" ? "animate-pulse" : ""}`} />
      {config.label[locale]}
    </span>
  );
}
