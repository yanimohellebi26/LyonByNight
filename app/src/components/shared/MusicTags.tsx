"use client";

interface MusicTagsProps {
  readonly genres: readonly string[];
  readonly max?: number;
}

export function MusicTags({ genres, max = 3 }: MusicTagsProps) {
  if (!genres.length) return null;

  const shown = genres.slice(0, max);
  const extra = genres.length - max;

  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((genre) => (
        <span
          key={genre}
          className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
        >
          ♫ {genre}
        </span>
      ))}
      {extra > 0 && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          +{extra}
        </span>
      )}
    </div>
  );
}
