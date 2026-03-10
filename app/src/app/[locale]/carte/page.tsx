"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Search,
  Loader2,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { MapView } from "@/components/map/MapView";
import { LieuMiniCard } from "@/components/cards/LieuMiniCard";
import { AddressSearch } from "@/components/shared/AddressSearch";
import { translateLieu, translateFilterLabel } from "@/lib/utils/translations";
import type { Lieu } from "@/types";

const MUSIC_GENRES = [
  "Techno", "Electro", "Latino", "Rock", "Jazz", "Hip-hop",
  "House", "Pop", "Reggaeton", "Live", "DJ",
] as const;

const PRICE_OPTIONS = ["€", "€€", "€€€"] as const;

const ARRONDISSEMENTS = ["1er", "2e", "3e", "4e", "5e", "6e", "7e", "9e"] as const;

interface MapFilters {
  type: string | null;
  musique: string[];
  fourchette: string | null;
  arrondissement: string | null;
}

const EMPTY_FILTERS: MapFilters = {
  type: null,
  musique: [],
  fourchette: null,
  arrondissement: null,
};

export default function CartePage() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const tFilters = useTranslations("filters");
  const tMap = useTranslations("map");
  const locale = useLocale();

  const [lieux, setLieux] = useState<Lieu[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<MapFilters>(EMPTY_FILTERS);

  /* Geo search state */
  const [geoCenter, setGeoCenter] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);
  const [radiusKm, setRadiusKm] = useState(2);

  const activeFilterCount =
    (filters.type ? 1 : 0) +
    filters.musique.length +
    (filters.fourchette ? 1 : 0) +
    (filters.arrondissement ? 1 : 0);

  /* Build query params from filters */
  const buildParams = useCallback(() => {
    const params = new URLSearchParams({ limit: "1000" });
    if (search) params.set("q", search);
    if (filters.type) params.set("type", filters.type);
    if (filters.musique.length > 0)
      params.set("musique", filters.musique.join(","));
    if (filters.fourchette) params.set("fourchette", filters.fourchette);
    if (filters.arrondissement)
      params.set("arrondissement", filters.arrondissement);
    if (geoCenter) {
      params.set("lat", geoCenter.lat.toString());
      params.set("lng", geoCenter.lng.toString());
      params.set("rayon_km", radiusKm.toString());
      params.set("sort", "distance");
    }
    return params;
  }, [search, filters, geoCenter, radiusKm]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/lieux?${buildParams().toString()}`);
        const json = await res.json();
        if (json.success) setLieux(json.data.map((l: Lieu) => translateLieu(l, locale)));
      } catch {
        /* noop */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [buildParams, locale]);

  const geoLieux = lieux.filter((l) => l.coordonnees != null);

  const toggleMusique = (genre: string) => {
    const lower = genre.toLowerCase();
    setFilters((prev) => ({
      ...prev,
      musique: prev.musique.includes(lower)
        ? prev.musique.filter((m) => m !== lower)
        : [...prev.musique, lower],
    }));
  };

  return (
    <div className="relative h-[calc(100vh-4rem)]">
      <h1 className="sr-only">{t("map")}</h1>

      {/* ── Filter bar (top overlay) ── */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center gap-2 px-3 py-2">
        <Button
          variant={filtersOpen ? "default" : "outline"}
          size="sm"
          className="gap-1.5 shadow-lg"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {tFilters("title")}
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-[10px] font-bold text-primary">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs shadow-lg bg-background/80 backdrop-blur-sm"
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            <X className="h-3.5 w-3.5" />
            {tFilters("clear")}
          </Button>
        )}
      </div>

      {/* ── Filter panel dropdown ── */}
      {filtersOpen && (
        <div className="absolute left-3 top-12 z-20 w-80 rounded-xl border bg-card p-4 shadow-xl space-y-4">
          {/* Type */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              {tFilters("type")}
            </p>
            <div className="flex gap-2">
              {(["bar", "club"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      type: prev.type === type ? null : type,
                    }))
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filters.type === type
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {tFilters(type)}
                </button>
              ))}
            </div>
          </div>

          {/* Music */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              {tFilters("music")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MUSIC_GENRES.map((genre) => {
                const isActive = filters.musique.includes(genre.toLowerCase());
                return (
                  <button
                    key={genre}
                    onClick={() => toggleMusique(genre)}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {translateFilterLabel(genre, locale)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              {tFilters("price")}
            </p>
            <div className="flex gap-2">
              {PRICE_OPTIONS.map((price) => (
                <button
                  key={price}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      fourchette: prev.fourchette === price ? null : price,
                    }))
                  }
                  className={`rounded-full px-3 py-1 text-xs font-mono font-medium transition-colors ${
                    filters.fourchette === price
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {price}
                </button>
              ))}
            </div>
          </div>

          {/* Arrondissement */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              {tFilters("district")}
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {ARRONDISSEMENTS.map((arr) => (
                <button
                  key={arr}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      arrondissement:
                        prev.arrondissement === arr ? null : arr,
                    }))
                  }
                  className={`rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
                    filters.arrondissement === arr
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {arr}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {tMap("results_count", { count: geoLieux.length })}
          </p>

          {/* Geo search */}
          <div className="border-t pt-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              {tMap("search_proximity")}
            </p>
            <AddressSearch
              onSelect={(lat, lng, label) =>
                setGeoCenter({ lat, lng, label })
              }
              onClear={() => setGeoCenter(null)}
              placeholder={tFilters("address_placeholder")}
              className="mb-2"
            />
            {geoCenter && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  {tMap("radius")} : <span className="text-foreground font-medium">{radiusKm} km</span>
                </p>
                <Slider
                  min={0.5}
                  max={10}
                  step={0.5}
                  value={[radiusKm]}
                  onValueChange={(v) =>
                    setRadiusKm(Array.isArray(v) ? (v[0] ?? 2) : 2)
                  }
                  className="py-2"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0.5 km</span>
                  <span>10 km</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Side panel ── */}
      <div
        className={`absolute left-0 top-0 z-10 flex h-full transition-transform duration-300 ${
          panelOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full w-80 flex-col border-r bg-background">
          <div className="border-b p-3 pt-12">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`${t("map")}…`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {tMap("venues_on_map", { count: geoLieux.length })}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : geoLieux.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {tCommon("no_results")}
              </p>
            ) : (
              geoLieux.map((lieu) => (
                <LieuMiniCard
                  key={lieu.id}
                  lieu={lieu}
                  isActive={hoveredId === lieu.id}
                  onHover={setHoveredId}
                />
              ))
            )}
          </div>
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className="mt-4 flex h-10 w-6 items-center justify-center rounded-r-lg border border-l-0 bg-background text-muted-foreground hover:text-foreground"
        >
          {panelOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* ── Map ── */}
      <MapView
        lieux={lieux}
        hoveredId={hoveredId}
        onHover={setHoveredId}
        className="h-full w-full"
        radiusCircle={
          geoCenter
            ? { lat: geoCenter.lat, lng: geoCenter.lng, radiusKm }
            : null
        }
      />
    </div>
  );
}
