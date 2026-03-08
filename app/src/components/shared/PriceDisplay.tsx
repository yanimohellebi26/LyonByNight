"use client";

import type { PriceRange } from "@/types";

interface PriceDisplayProps {
  readonly fourchette: PriceRange;
  readonly pinte_moy?: number | null;
  readonly cocktail_moy?: number | null;
}

export function PriceDisplay({ fourchette, pinte_moy, cocktail_moy }: PriceDisplayProps) {
  const detail = pinte_moy
    ? `Pinte ~${pinte_moy}€`
    : cocktail_moy
      ? `Cocktail ~${cocktail_moy}€`
      : null;

  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="font-semibold text-amber-400">{fourchette}</span>
      {detail && (
        <span className="text-xs text-muted-foreground">· {detail}</span>
      )}
    </span>
  );
}
