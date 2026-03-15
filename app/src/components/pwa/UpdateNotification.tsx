"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpdateNotificationProps {
  readonly registration: ServiceWorkerRegistration;
}

export function UpdateNotification({ registration }: UpdateNotificationProps) {
  const t = useTranslations("pwa");
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  function handleUpdate() {
    const waiting = registration.waiting;
    if (waiting) {
      waiting.postMessage("SKIP_WAITING");
      // Reload once the new SW takes control
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!sessionStorage.getItem("sw-reloaded")) {
          sessionStorage.setItem("sw-reloaded", "1");
          window.location.reload();
        }
      });
    }
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm">
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-lg">
        <RefreshCw className="h-5 w-5 text-primary shrink-0" />
        <p className="flex-1 text-sm">{t("update_available")}</p>
        <Button size="sm" onClick={handleUpdate}>
          {t("update_button")}
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
