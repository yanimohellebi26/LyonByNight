"use client";

import { useTranslations } from "next-intl";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/* ─── Grouped music genres (simplified from raw data) ─── */
const MUSIC_GENRES = [
  "Techno",
  "Electro",
  "Latino",
  "Rock",
  "Jazz",
  "Hip-hop",
  "House",
  "Pop",
  "Reggaeton",
  "Variété",
  "Live",
  "DJ",
] as const;

const PRICE_OPTIONS = ["€", "€€", "€€€"] as const;

const ARRONDISSEMENTS = [
  "1er",
  "2e",
  "3e",
  "4e",
  "5e",
  "6e",
  "7e",
  "9e",
] as const;

const SPECIFICITES = [
  "terrasse",
  "happy hour",
  "LGBTQ+ friendly",
  "jeux de société",
  "cocktails",
  "piste de danse",
  "karaoké",
  "concerts",
  "rooftop",
  "péniche",
  "speakeasy",
] as const;

interface Filters {
  type: string | null;
  arrondissement: string | null;
  musique: string | null;
  fourchette: string | null;
  note_min: number | null;
  q: string | null;
  sort: string;
  page: string;
}

interface FilterPanelProps {
  readonly filters: Filters;
  readonly onFilterChange: (
    updates: Partial<Record<string, string | number | null>>
  ) => void;
  readonly onClear: () => void;
  readonly activeCount: number;
  readonly resultCount?: number;
}

/* ─── Inner filter content (shared between desktop sidebar & mobile sheet) ─── */
function FilterContent({
  filters,
  onFilterChange,
  onClear,
  activeCount,
  resultCount,
}: FilterPanelProps) {
  const t = useTranslations("filters");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("clear")}
          </Button>
        )}
      </div>

      {/* Type */}
      <section>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          {t("type")}
        </h3>
        <div className="flex gap-2">
          {(["bar", "club"] as const).map((type) => (
            <button
              key={type}
              onClick={() =>
                onFilterChange({
                  type: filters.type === type ? null : type,
                })
              }
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filters.type === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {t(type)}
            </button>
          ))}
        </div>
      </section>

      {/* Music genre */}
      <section>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          {t("music")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {MUSIC_GENRES.map((genre) => {
            const isActive = filters.musique
              ?.split(",")
              .includes(genre.toLowerCase());
            return (
              <button
                key={genre}
                onClick={() => {
                  const current = filters.musique
                    ? filters.musique.split(",")
                    : [];
                  const lower = genre.toLowerCase();
                  const next = isActive
                    ? current.filter((g) => g !== lower)
                    : [...current, lower];
                  onFilterChange({
                    musique: next.length > 0 ? next.join(",") : null,
                  });
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </section>

      {/* Price range */}
      <section>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          {t("price")}
        </h3>
        <div className="flex gap-2">
          {PRICE_OPTIONS.map((price) => (
            <button
              key={price}
              onClick={() =>
                onFilterChange({
                  fourchette: filters.fourchette === price ? null : price,
                })
              }
              className={`rounded-full px-4 py-1.5 text-sm font-medium font-mono transition-colors ${
                filters.fourchette === price
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {price}
            </button>
          ))}
        </div>
      </section>

      {/* Arrondissement */}
      <section>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          {t("district")}
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {ARRONDISSEMENTS.map((arr) => (
            <button
              key={arr}
              onClick={() =>
                onFilterChange({
                  arrondissement: filters.arrondissement === arr ? null : arr,
                })
              }
              className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                filters.arrondissement === arr
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {arr}
            </button>
          ))}
        </div>
      </section>

      {/* Rating slider */}
      <section>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          {t("rating")}{" "}
          {filters.note_min != null && (
            <span className="text-primary">≥ {filters.note_min}</span>
          )}
        </h3>
        <Slider
          min={0}
          max={5}
          step={0.5}
          value={[filters.note_min ?? 0]}
          onValueChange={(value) =>
            onFilterChange({
              note_min:
                Array.isArray(value)
                  ? (value[0] ?? 0) > 0
                    ? value[0]
                    : null
                  : typeof value === "number" && value > 0
                    ? value
                    : null,
            })
          }
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0</span>
          <span>5</span>
        </div>
      </section>

      {/* Spécificités */}
      <section>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          {t("features")}
        </h3>
        <div className="space-y-2">
          {SPECIFICITES.map((spec) => {
            // specificités filter uses the "q" param as text search
            // For a proper implementation, we'd need a separate param,
            // but for MVP we keep it simple
            return (
              <label
                key={spec}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={false}
                  disabled
                  className="border-muted-foreground/50"
                />
                <span className="capitalize">{spec}</span>
              </label>
            );
          })}
        </div>
      </section>

      {/* Result count (mobile) */}
      {resultCount != null && (
        <Button className="w-full" size="lg">
          {t("results", { count: resultCount })}
        </Button>
      )}
    </div>
  );
}

/* ─── Desktop: sticky sidebar ─── */
export function FilterSidebar(props: FilterPanelProps) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border bg-card p-5 scrollbar-thin">
        <FilterContent {...props} />
      </div>
    </aside>
  );
}

/* ─── Mobile: bottom sheet ─── */
export function FilterSheet(props: FilterPanelProps) {
  const t = useTranslations("filters");

  return (
    <Sheet>
      <SheetTrigger>
        <Button variant="outline" size="sm" className="gap-2 lg:hidden">
          <SlidersHorizontal className="h-4 w-4" />
          {t("title")}
          {props.activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {props.activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="sr-only">{t("title")}</SheetTitle>
        </SheetHeader>
        <FilterContent {...props} />
      </SheetContent>
    </Sheet>
  );
}
