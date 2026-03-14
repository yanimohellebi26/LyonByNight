"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { MapPin, Search, X } from "lucide-react";

interface LieuOption {
  readonly id: string;
  readonly nom: string;
  readonly adresse: string;
  readonly slug: string;
}

interface LieuSelectorProps {
  readonly onSelect: (lieu: { id: string; nom: string } | null) => void;
  readonly onCustom: (custom: { nom: string; adresse: string }) => void;
  readonly selectedId?: string;
  readonly selectedName?: string;
}

export function LieuSelector({
  onSelect,
  onCustom,
  selectedId,
  selectedName,
}: LieuSelectorProps) {
  const t = useTranslations("create_event");
  const [query, setQuery] = useState(selectedName || "");
  const [results, setResults] = useState<LieuOption[]>([]);
  const [open, setOpen] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const [customAdresse, setCustomAdresse] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Search venues as user types
  useEffect(() => {
    if (query.length < 2 || selectedId) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        const json = await res.json();
        if (json.success) {
          setResults(
            (json.data as LieuOption[]).map((l) => ({
              id: l.id,
              nom: l.nom,
              adresse: l.adresse,
              slug: l.slug,
            }))
          );
          setOpen(true);
        }
      } catch {
        // aborted or network error
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, selectedId]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelectVenue(lieu: LieuOption) {
    setQuery(lieu.nom);
    setOpen(false);
    setIsCustom(false);
    onSelect({ id: lieu.id, nom: lieu.nom });
  }

  function handleUseCustom() {
    setOpen(false);
    setIsCustom(true);
    onSelect(null);
    onCustom({ nom: query, adresse: customAdresse });
  }

  function handleClear() {
    setQuery("");
    setIsCustom(false);
    setCustomAdresse("");
    onSelect(null);
    onCustom({ nom: "", adresse: "" });
  }

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <label className="text-sm font-medium">{t("lieu")}</label>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (selectedId) onSelect(null);
          }}
          placeholder={t("lieu_placeholder")}
          className="pl-9 pr-8"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Dropdown results */}
        {open && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border bg-background shadow-lg max-h-60 overflow-y-auto">
            {results.map((lieu) => (
              <button
                key={lieu.id}
                type="button"
                onClick={() => handleSelectVenue(lieu)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">{lieu.nom}</p>
                  <p className="text-xs text-muted-foreground">{lieu.adresse}</p>
                </div>
              </button>
            ))}
            {/* Custom location option */}
            <button
              type="button"
              onClick={handleUseCustom}
              className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm text-primary hover:bg-accent"
            >
              <MapPin className="h-4 w-4" />
              {t("lieu_custom", { name: query })}
            </button>
          </div>
        )}

        {/* When no results found */}
        {open && query.length >= 2 && results.length === 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border bg-background p-3 shadow-lg">
            <button
              type="button"
              onClick={handleUseCustom}
              className="flex items-center gap-2 text-sm text-primary"
            >
              <MapPin className="h-4 w-4" />
              {t("lieu_custom", { name: query })}
            </button>
          </div>
        )}
      </div>

      {/* Custom address field */}
      {isCustom && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            {t("lieu_adresse")}
          </label>
          <Input
            value={customAdresse}
            onChange={(e) => {
              setCustomAdresse(e.target.value);
              onCustom({ nom: query, adresse: e.target.value });
            }}
            placeholder={t("lieu_adresse_placeholder")}
          />
        </div>
      )}

      {/* Selected venue indicator */}
      {selectedId && (
        <p className="flex items-center gap-1 text-xs text-green-600">
          <MapPin className="h-3 w-3" />
          {t("lieu_selected")}
        </p>
      )}
    </div>
  );
}
