"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Compass, Map, GitCompareArrows, Calendar } from "lucide-react";

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const items = [
    { href: "/explorer" as const, label: t("explore"), icon: Compass },
    { href: "/carte" as const, label: t("map"), icon: Map },
    { href: "/comparer" as const, label: t("compare"), icon: GitCompareArrows },
    { href: "/evenements" as const, label: t("events"), icon: Calendar },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md md:hidden">
      <div className="flex h-16 items-center justify-around">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href + label}
            href={href}
            className={`flex flex-col items-center gap-1 px-2 py-1 text-xs ${
              pathname === href
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
