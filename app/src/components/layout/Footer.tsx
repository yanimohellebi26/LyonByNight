"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="font-display text-lg font-bold tracking-tight">
            Lyon<span className="text-primary">Night</span>
          </p>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            {t("disclaimer")}
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()}</span>
            <span className="h-3 w-px bg-border" />
            <Link
              href="/mentions-legales"
              className="hover:text-foreground transition-colors"
            >
              {t("legal")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
