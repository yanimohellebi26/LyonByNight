"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const COOKIE_KEY = "lng-cookie-consent";

export function CookieBanner() {
  const t = useTranslations("cookies");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
  }, []);

  function accept() {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(COOKIE_KEY, "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t("consent")}
      className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl border bg-card p-4 shadow-2xl shadow-black/40 md:bottom-6 md:left-auto md:right-6 md:max-w-sm"
    >
      <button
        onClick={decline}
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={t("close")}
      >
        <X className="h-4 w-4" />
      </button>

      <div className="mb-4 pr-6">
        <p className="text-sm font-semibold">{t("title")}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t("description")}{" "}
          <Link
            href="/mentions-legales"
            className="text-primary hover:underline"
          >
            {t("learn_more")}
          </Link>
        </p>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={accept} className="flex-1">
          {t("accept")}
        </Button>
        <Button size="sm" variant="outline" onClick={decline} className="flex-1">
          {t("decline")}
        </Button>
      </div>
    </div>
  );
}
