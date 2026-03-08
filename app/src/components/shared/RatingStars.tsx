"use client";

import { Star } from "lucide-react";

interface RatingStarsProps {
  readonly note: number | null;
  readonly size?: "sm" | "md";
}

export function RatingStars({ note, size = "sm" }: RatingStarsProps) {
  if (note === null) return <span className="text-xs text-muted-foreground">N/D</span>;

  const full = Math.floor(note);
  const hasHalf = note - full >= 0.25;
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`${iconSize} ${
              i < full
                ? "fill-amber-400 text-amber-400"
                : i === full && hasHalf
                  ? "fill-amber-400/50 text-amber-400"
                  : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>
      <span className={`font-medium ${size === "sm" ? "text-xs" : "text-sm"}`}>
        {note.toFixed(1)}
      </span>
    </div>
  );
}
