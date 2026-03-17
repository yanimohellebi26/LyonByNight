"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { useTranslations } from "next-intl";

interface ShareButtonProps {
  readonly title: string;
  readonly text?: string;
}

export function ShareButton({ title, text }: ShareButtonProps) {
  const t = useTranslations("lieu");
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;

    // Try Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title, text: text ?? title, url });
        return;
      } catch {
        // User cancelled or API failed, fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      aria-label={t("share")}
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-green-500">{t("link_copied")}</span>
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          {t("share")}
        </>
      )}
    </button>
  );
}
