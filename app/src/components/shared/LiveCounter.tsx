"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function LiveCounter() {
  const t = useTranslations("home");
  const [count, setCount] = useState<number | null>(null);
  const [isNight, setIsNight] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    setIsNight(hour >= 17);
    setCount(Math.floor(Math.random() * (250 - 80 + 1)) + 80);
  }, []);

  if (!isNight || count === null) return null;

  return (
    <p className="text-sm text-muted-foreground flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      {t("live_counter", { count })}
    </p>
  );
}
