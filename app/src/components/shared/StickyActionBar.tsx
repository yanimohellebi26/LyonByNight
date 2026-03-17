"use client";

import { useState } from "react";
import { Navigation2, Share2, Heart, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFavorites } from "@/hooks/useFavorites";

interface StickyActionBarProps {
  readonly lieuId: string;
  readonly lieuNom: string;
  readonly description: string;
  readonly googleMaps?: string;
  readonly lat?: number;
  readonly lng?: number;
}

export function StickyActionBar({
  lieuId,
  lieuNom,
  description,
  googleMaps,
  lat,
  lng,
}: StickyActionBarProps) {
  const t = useTranslations("lieu");
  const { isFavorite, toggleFavorite } = useFavorites();
  const [copied, setCopied] = useState(false);

  const favorited = isFavorite(lieuId);

  function handleDirections() {
    const url =
      googleMaps ??
      (lat != null && lng != null
        ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
        : null);

    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: lieuNom, text: description, url });
        return;
      } catch {
        // User cancelled or API failed, fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  function handleFavorite() {
    toggleFavorite(lieuId);
  }

  const directionsAvailable = Boolean(googleMaps) || (lat != null && lng != null);

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="glow-line" />
      <div className="flex items-center bg-background/80 backdrop-blur-xl border-t border-border/50">
        {/* Directions */}
        <button
          onClick={handleDirections}
          disabled={!directionsAvailable}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none"
          aria-label={t("directions")}
        >
          <Navigation2 className="h-5 w-5" />
          <span className="text-[11px] font-medium">{t("directions")}</span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t("share")}
        >
          {copied ? (
            <>
              <Check className="h-5 w-5 text-green-500" />
              <span className="text-[11px] font-medium text-green-500">
                {t("link_copied")}
              </span>
            </>
          ) : (
            <>
              <Share2 className="h-5 w-5" />
              <span className="text-[11px] font-medium">{t("share")}</span>
            </>
          )}
        </button>

        {/* Favorite */}
        <button
          onClick={handleFavorite}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors"
          aria-label={favorited ? t("remove_favorite") : t("add_favorite")}
        >
          <Heart
            className={`h-5 w-5 transition-colors ${
              favorited ? "text-red-500 fill-current" : "text-muted-foreground"
            }`}
          />
          <span
            className={`text-[11px] font-medium ${
              favorited ? "text-red-500" : "text-muted-foreground"
            }`}
          >
            {t("favorite")}
          </span>
        </button>
      </div>
    </div>
  );
}
