"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Loader2, X, LocateFixed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/useGeolocation";

interface AddressResult {
  readonly display_name: string;
  readonly lat: string;
  readonly lon: string;
}

interface AddressSearchProps {
  readonly onSelect: (lat: number, lng: number, label: string) => void;
  readonly onClear?: () => void;
  readonly placeholder?: string;
  readonly className?: string;
}

export function AddressSearch({
  onSelect,
  onClear,
  placeholder = "Adresse ou lieu…",
  className,
}: AddressSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AddressResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const geo = useGeolocation();

  /* Close dropdown on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* Debounced Nominatim search */
  const search = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: `${q}, Lyon, France`,
          format: "json",
          limit: "5",
          addressdetails: "1",
        });
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          { headers: { "Accept-Language": "fr" } }
        );
        const data: AddressResult[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedLabel(null);
    search(value);
  };

  const handleSelect = (result: AddressResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const label = result.display_name.split(",").slice(0, 2).join(",");
    setSelectedLabel(label);
    setQuery(label);
    setOpen(false);
    onSelect(lat, lng, label);
  };

  const handleGeolocate = () => {
    if (geo.latitude != null && geo.longitude != null) {
      setSelectedLabel("Ma position");
      setQuery("Ma position");
      setOpen(false);
      onSelect(geo.latitude, geo.longitude, "Ma position");
    }
  };

  const handleClear = () => {
    setQuery("");
    setSelectedLabel(null);
    setResults([]);
    onClear?.();
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={placeholder}
            className="pl-9 pr-8"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          {selectedLabel && !loading && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={handleGeolocate}
          disabled={geo.loading || geo.error != null}
          title="Utiliser ma position"
        >
          <LocateFixed className="h-4 w-4" />
        </Button>
      </div>

      {/* Dropdown results */}
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border bg-card shadow-xl">
          {results.map((r, i) => (
            <button
              key={`${r.lat}-${r.lon}-${i}`}
              onClick={() => handleSelect(r)}
              className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-secondary transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="line-clamp-2">
                {r.display_name.split(",").slice(0, 3).join(",")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
