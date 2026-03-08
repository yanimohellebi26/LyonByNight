"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { X, Plus, Search, Share2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/shared/RatingStars";
import { MusicTags } from "@/components/shared/MusicTags";
import { Link } from "@/i18n/navigation";
import { translateLieu } from "@/lib/utils/translations";
import type { Lieu } from "@/types";

export default function ComparerPage() {
  const t = useTranslations("compare");
  const tLieu = useTranslations("lieu");
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();

  const [allLieux, setAllLieux] = useState<Lieu[]>([]);
  const [selected, setSelected] = useState<Lieu[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const initialIdsRef = useRef<string[]>(
    (searchParams.get("ids") ?? "").split(",").filter(Boolean)
  );

  /* Load all venues once + hydrate from URL params */
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/lieux?limit=200");
      const json = await res.json();
      if (json.success) {
        const translated = (json.data as Lieu[]).map((l) => translateLieu(l, locale));
        setAllLieux(translated);
        /* Hydrate from URL ids */
        if (initialIdsRef.current.length > 0) {
          const fromUrl = translated.filter((l: Lieu) =>
            initialIdsRef.current.includes(l.id)
          );
          if (fromUrl.length > 0) setSelected(fromUrl);
          initialIdsRef.current = [];
        }
      }
    }
    load();
  }, []);

  /* Sync selected IDs → URL */
  useEffect(() => {
    const ids = selected.map((l) => l.id).join(",");
    const params = new URLSearchParams(searchParams.toString());
    if (ids) {
      params.set("ids", ids);
    } else {
      params.delete("ids");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [selected, router, searchParams]);

  const addLieu = useCallback(
    (lieu: Lieu) => {
      if (selected.length >= 4 || selected.find((l) => l.id === lieu.id))
        return;
      setSelected((prev) => [...prev, lieu]);
      setSearchOpen(false);
      setQuery("");
    },
    [selected]
  );

  const removeLieu = useCallback((id: string) => {
    setSelected((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const shareComparison = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback: noop */
    }
  }, []);

  const filtered = query
    ? allLieux.filter(
        (l) =>
          l.nom.toLowerCase().includes(query.toLowerCase()) &&
          !selected.find((s) => s.id === l.id)
      )
    : [];

  /* Comparison rows */
  const rows: {
    label: string;
    render: (lieu: Lieu) => React.ReactNode;
  }[] = [
    {
      label: tLieu("reviews_summary").replace("Résumé des avis", "Note"),
      render: (l) => <RatingStars note={l.note} />,
    },
    {
      label: tLieu("price"),
      render: (l) => (
        <span className="font-mono font-medium">
          {l.prix.fourchette}
          {l.prix.pinte_moy && (
            <span className="block text-xs text-muted-foreground">
              {locale === "en" ? "Pint" : "Pinte"} ~{l.prix.pinte_moy}€
            </span>
          )}
        </span>
      ),
    },
    {
      label: tLieu("music"),
      render: (l) => <MusicTags genres={l.musique} max={3} />,
    },
    {
      label: tLieu("address"),
      render: (l) => (
        <span className="text-sm">
          {l.quartier
            ? `${l.quartier} — Lyon ${l.arrondissement}`
            : l.arrondissement
              ? `Lyon ${l.arrondissement}`
              : l.adresse}
        </span>
      ),
    },
    {
      label: tLieu("features"),
      render: (l) => (
        <div className="flex flex-wrap gap-1">
          {l.specificites.slice(0, 4).map((s) => (
            <Badge key={s} variant="secondary" className="text-[10px]">
              {s}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      label: tLieu("clientele"),
      render: (l) => (
        <span className="text-sm text-muted-foreground">
          {l.clientele ?? "—"}
        </span>
      ),
    },
  ];

  const emptySlots = Math.max(0, 3 - selected.length);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
        <div className="flex items-center gap-2">
          {selected.length >= 2 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={shareComparison}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              {copied ? (locale === "en" ? "Copied!" : "Copié !") : t("share")}
            </Button>
          )}
          {selected.length < 4 && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setSearchOpen(!searchOpen)}
              >
                <Plus className="h-4 w-4" />
                {t("add")}
              </Button>

            {searchOpen && (
              <div className="absolute right-0 top-12 z-20 w-72 rounded-xl border bg-card p-3 shadow-xl">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={locale === "en" ? "Search…" : "Rechercher…"}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-8"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {filtered.slice(0, 8).map((lieu) => (
                    <button
                      key={lieu.id}
                      onClick={() => addLieu(lieu)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary transition-colors"
                    >
                      <span className="font-medium">{lieu.nom}</span>
                      <span className="text-xs text-muted-foreground">
                        {lieu.prix.fourchette}
                      </span>
                    </button>
                  ))}
                  {query && filtered.length === 0 && (
                    <p className="py-3 text-center text-xs text-muted-foreground">
                      Aucun résultat
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {selected.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-muted-foreground">
          <p className="text-lg">{t("empty")}</p>
          <Button
            variant="outline"
            onClick={() => setSearchOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t("add")}
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Header: venue names + photos */}
            <thead>
              <tr>
                <th className="w-32 p-2" />
                {selected.map((lieu) => (
                  <th
                    key={lieu.id}
                    className="min-w-[200px] p-2 text-left align-top"
                  >
                    <div className="relative rounded-xl border bg-card p-4">
                      <button
                        onClick={() => removeLieu(lieu.id)}
                        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                        aria-label="Retirer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/lieu/${lieu.slug}`}
                        className="text-sm font-semibold hover:text-primary transition-colors"
                      >
                        {lieu.nom}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {lieu.type === "club" ? "Club" : "Bar"} ·{" "}
                        {lieu.categorie}
                      </p>
                    </div>
                  </th>
                ))}
                {Array.from({ length: emptySlots }).map((_, i) => (
                  <th key={`empty-${i}`} className="min-w-[200px] p-2">
                    <button
                      onClick={() => setSearchOpen(true)}
                      className="flex h-24 w-full items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                    >
                      <Plus className="h-6 w-6" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Comparison rows */}
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-border/50">
                  <td className="p-3 text-xs font-medium text-muted-foreground">
                    {row.label}
                  </td>
                  {selected.map((lieu) => (
                    <td key={lieu.id} className="p-3">
                      {row.render(lieu)}
                    </td>
                  ))}
                  {Array.from({ length: emptySlots }).map((_, i) => (
                    <td key={`empty-${i}`} className="p-3" />
                  ))}
                </tr>
              ))}
              {/* View button row */}
              <tr className="border-t border-border/50">
                <td className="p-3" />
                {selected.map((lieu) => (
                  <td key={lieu.id} className="p-3">
                    <Link href={`/lieu/${lieu.slug}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        Voir la fiche
                      </Button>
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
