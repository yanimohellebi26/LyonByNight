"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleSwitch = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-1 rounded-lg border p-1">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => handleSwitch(loc)}
          className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
            locale === loc
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
