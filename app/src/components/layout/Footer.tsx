"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t py-8">
      <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
        <p className="mb-2">
          © {new Date().getFullYear()} Lyon Night Guide — {t("disclaimer")}
        </p>
        <Link
          href="/mentions-legales"
          className="text-xs hover:text-foreground hover:underline transition-colors"
        >
          {t("legal")}
        </Link>
      </div>
    </footer>
  );
}
