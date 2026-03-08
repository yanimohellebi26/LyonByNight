"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Home, Search } from "lucide-react";

export default function NotFoundPage() {
  const t = useTranslations("not_found_page");

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <p className="text-8xl font-bold text-primary">404</p>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description")}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Home className="h-4 w-4" />
          {t("home")}
        </Link>
        <Link
          href="/explorer"
          className="inline-flex items-center gap-2 rounded-full border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Search className="h-4 w-4" />
          {t("explore")}
        </Link>
      </div>
    </div>
  );
}
