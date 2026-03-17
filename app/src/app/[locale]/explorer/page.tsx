"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { AlertTriangle, Search, Moon, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useFilters } from "@/hooks/useFilters";
import { useCompare } from "@/hooks/useCompare";
import { useFavorites } from "@/hooks/useFavorites";
import { useDebounce } from "@/hooks/useDebounce";
import { LieuCard } from "@/components/cards/LieuCard";
import { LieuCardSkeletonGrid } from "@/components/cards/LieuCardSkeleton";
import {
  FilterSidebar,
  FilterSheet,
} from "@/components/filters/FilterPanel";
import { ContextualBanner } from "@/components/shared/ContextualBanner";
import { translateLieu } from "@/lib/utils/translations";
import type { Lieu } from "@/types";

interface ApiResponse {
  success: boolean;
  data: Lieu[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export default function ExplorerPage() {
  const t = useTranslations("filters");
  const tSort = useTranslations("sort");
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const locale = useLocale();

  const { filters, setFilters, clearFilters, activeCount } = useFilters();
  const { addToCompare, removeFromCompare, isInCompare } = useCompare();
  const { toggleFavorite, isFavorite, favoriteIds, isHydrated } = useFavorites();

  const [lieux, setLieux] = useState<Lieu[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(filters.q ?? "");
  const [tonightMode, setTonightMode] = useState(false);
  const [favoritesMode, setFavoritesMode] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);
  const debouncedSearch = useDebounce(searchInput, 300);

  /* ── Sync debounced search → URL param ── */
  useEffect(() => {
    if (debouncedSearch !== (filters.q ?? "")) {
      setFilters({ q: debouncedSearch || null, page: "1" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  /* ── Fetch data when filters change ── */
  useEffect(() => {
    const controller = new AbortController();

    async function fetchLieux() {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters.type) params.set("type", filters.type);
      if (filters.arrondissement)
        params.set("arrondissement", filters.arrondissement);
      if (filters.musique) params.set("musique", filters.musique);
      if (filters.fourchette) params.set("fourchette", filters.fourchette);
      if (filters.note_min) params.set("note_min", String(filters.note_min));
      if (filters.q) params.set("q", filters.q);
      if (filters.sort) params.set("sort", filters.sort);
      if (filters.page) params.set("page", filters.page);
      if (tonightMode) params.set("tonight", "true");
      params.set("limit", "18");

      try {
        const res = await fetch(`/api/lieux?${params.toString()}`, {
          signal: controller.signal,
        });
        const json: ApiResponse = await res.json();
        if (json.success) {
          let data = json.data.map((l) => translateLieu(l, locale));

          // Client-side favorites filter (favorites are stored locally)
          if (favoritesMode && isHydrated) {
            data = data.filter((l) => favoriteIds.includes(l.id));
          }

          setLieux(data);
          setTotal(favoritesMode ? data.length : json.meta.total);
          setTotalPages(favoritesMode ? 1 : json.meta.pages);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(t("error_loading"));
      } finally {
        setLoading(false);
      }
    }

    fetchLieux();
    return () => controller.abort();
  }, [
    filters.type,
    filters.arrondissement,
    filters.musique,
    filters.fourchette,
    filters.note_min,
    filters.q,
    filters.sort,
    filters.page,
    tonightMode,
    favoritesMode,
    favoriteIds,
    isHydrated,
    locale,
    fetchKey,
    t,
  ]);

  const handleCompare = useCallback(
    (id: string) => {
      if (isInCompare(id)) {
        removeFromCompare(id);
      } else {
        addToCompare(id);
      }
    },
    [isInCompare, removeFromCompare, addToCompare]
  );

  const currentPage = parseInt(filters.page || "1", 10);

  const toggleTonightMode = () => {
    setTonightMode((prev) => !prev);
    setFavoritesMode(false);
    setFilters({ page: "1" });
  };

  const toggleFavoritesMode = () => {
    setFavoritesMode((prev) => !prev);
    setTonightMode(false);
    setFilters({ page: "1" });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* ── Contextual suggestion banner ── */}
      <div className="mb-4">
        <ContextualBanner />
      </div>

      <h1 className="mb-2 text-2xl font-bold">{tNav("explore")}</h1>

      {/* ── Top bar: search + sort + mode toggles + mobile filters ── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`${t("title")}…`}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Tonight mode toggle */}
          <Button
            variant={tonightMode ? "default" : "outline"}
            size="sm"
            onClick={toggleTonightMode}
            className="gap-1.5"
          >
            <Moon className="h-4 w-4" />
            <span className="hidden sm:inline">{tNav("tonight_mode")}</span>
          </Button>

          {/* Favorites mode toggle */}
          <Button
            variant={favoritesMode ? "default" : "outline"}
            size="sm"
            onClick={toggleFavoritesMode}
            className="gap-1.5"
          >
            <Heart className={`h-4 w-4 ${favoritesMode ? "fill-current" : ""}`} />
            <span className="hidden sm:inline">{tNav("favorites")}</span>
          </Button>

          <FilterSheet
            filters={filters}
            onFilterChange={(updates) =>
              setFilters({ ...updates, page: "1" } as Record<string, string | null>)
            }
            onClear={clearFilters}
            activeCount={activeCount}
            resultCount={total}
          />

          <Select
            value={filters.sort}
            onValueChange={(v) => setFilters({ sort: v, page: "1" })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={tSort("label")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="note">{tSort("rating")}</SelectItem>
              <SelectItem value="price">{tSort("price")}</SelectItem>
              <SelectItem value="name">{tSort("name")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Active mode indicator ── */}
      {(tonightMode || favoritesMode) && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
          {tonightMode && (
            <>
              <Moon className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">{tNav("tonight_mode_active")}</span>
            </>
          )}
          {favoritesMode && (
            <>
              <Heart className="h-4 w-4 fill-current text-red-500" />
              <span className="text-sm font-medium text-red-500">{tNav("favorites_active")}</span>
            </>
          )}
          <button
            onClick={() => { setTonightMode(false); setFavoritesMode(false); }}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            {t("clear")}
          </button>
        </div>
      )}

      {/* ── Result count ── */}
      <p className="mb-4 text-sm text-muted-foreground">
        {loading ? tCommon("loading") : t("results", { count: total })}
      </p>

      {/* ── Main layout: sidebar + grid ── */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <FilterSidebar
          filters={filters}
          onFilterChange={(updates) =>
            setFilters({ ...updates, page: "1" } as Record<string, string | null>)
          }
          onClear={clearFilters}
          activeCount={activeCount}
        />

        <div>
          {loading ? (
            <LieuCardSkeletonGrid count={6} />
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
                <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-destructive" />
                <p className="mb-4 text-sm text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFetchKey((k) => k + 1)}
                >
                  {t("retry")}
                </Button>
              </div>
            </div>
          ) : lieux.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
              <p className="text-lg">{tCommon("no_results")}</p>
              {(activeCount > 0 || tonightMode || favoritesMode) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearFilters();
                    setTonightMode(false);
                    setFavoritesMode(false);
                  }}
                >
                  {t("clear")}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {lieux.map((lieu) => (
                  <LieuCard
                    key={lieu.id}
                    lieu={lieu}
                    onCompare={handleCompare}
                    isCompared={isInCompare(lieu.id)}
                    onToggleFavorite={toggleFavorite}
                    isFavorite={isHydrated && isFavorite(lieu.id)}
                  />
                ))}
              </div>

              {/* ── Pagination ── */}
              {totalPages > 1 && !favoritesMode && (
                <div className="mt-8 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setFilters({ page: String(currentPage - 1) })}
                    >
                      ←
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => {
                        if (totalPages <= 7) return true;
                        if (p === 1 || p === totalPages) return true;
                        if (Math.abs(p - currentPage) <= 1) return true;
                        return false;
                      })
                      .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("ellipsis");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, i) =>
                        item === "ellipsis" ? (
                          <span key={`e-${i}`} className="px-1 text-muted-foreground">…</span>
                        ) : (
                          <Button
                            key={item}
                            variant={item === currentPage ? "default" : "outline"}
                            size="sm"
                            className="min-w-[2rem]"
                            onClick={() => setFilters({ page: String(item) })}
                          >
                            {item}
                          </Button>
                        )
                      )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setFilters({ page: String(currentPage + 1) })}
                    >
                      →
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("showing_range", {
                      from: (currentPage - 1) * 18 + 1,
                      to: Math.min(currentPage * 18, total),
                      total,
                    })}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
