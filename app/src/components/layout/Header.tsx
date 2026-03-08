"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export function Header() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const links = [
    { href: "/explorer" as const, label: t("explore") },
    { href: "/carte" as const, label: t("map") },
    { href: "/comparer" as const, label: t("compare") },
    { href: "/evenements" as const, label: t("events") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Lyon Night Guide
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent ${
                pathname === href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
