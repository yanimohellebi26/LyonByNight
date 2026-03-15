"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWA } from "@/hooks/usePWA";

export function InstallPrompt() {
  const t = useTranslations("pwa");
  const { canInstall, isInstalled, isIOS, promptInstall, dismiss } = usePWA();
  const [visible, setVisible] = useState(false);

  // Show after a short delay to avoid interrupting first-time visitors
  useEffect(() => {
    if (!canInstall && !isIOS) return;
    if (isInstalled) return;

    const timer = setTimeout(() => setVisible(true), 15000);
    return () => clearTimeout(timer);
  }, [canInstall, isIOS, isInstalled]);

  if (!visible || isInstalled) return null;

  // iOS: show manual instructions
  if (isIOS) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:max-w-sm">
        <div className="rounded-xl border bg-card p-4 shadow-lg space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Share className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm font-medium">{t("ios_title")}</p>
            </div>
            <button
              onClick={() => { setVisible(false); dismiss(); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{t("ios_instructions")}</p>
        </div>
      </div>
    );
  }

  if (!canInstall) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:max-w-sm">
      <div className="rounded-xl border bg-card p-4 shadow-lg space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-lg font-bold text-white">
              N
            </div>
            <div>
              <p className="text-sm font-semibold">{t("install_title")}</p>
              <p className="text-xs text-muted-foreground">{t("install_description")}</p>
            </div>
          </div>
          <button
            onClick={() => { setVisible(false); dismiss(); }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={promptInstall}>
            <Download className="mr-1.5 h-4 w-4" />
            {t("install_button")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setVisible(false); dismiss(); }}
          >
            {t("install_dismiss")}
          </Button>
        </div>
      </div>
    </div>
  );
}
