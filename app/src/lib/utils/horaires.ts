import type { Horaires } from "@/types";

/** Days of the week in French, indexed 0=dimanche through 6=samedi */
const JOURS_SEMAINE = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
] as const;

/** Abbreviated day names used in horaires.texte */
const JOURS_ABREV: Record<string, readonly number[]> = {
  lun: [1],
  mar: [2],
  mer: [3],
  jeu: [4],
  ven: [5],
  sam: [6],
  dim: [0],
};

interface TimeRange {
  readonly open: number; // minutes since midnight
  readonly close: number; // minutes since midnight (can exceed 1440 for after-midnight)
}

/** Parse a time string like "18h", "18h30", "23h00" → minutes since midnight */
function parseTime(raw: string): number | null {
  const match = raw.trim().match(/^(\d{1,2})h(\d{2})?$/i);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  return hours * 60 + minutes;
}

/** Parse a day abbreviation like "Mar" → [2], "Lun" → [1] */
function parseDayAbbrev(raw: string): number | null {
  const key = raw.trim().toLowerCase().slice(0, 3);
  const days = JOURS_ABREV[key];
  return days ? days[0] : null;
}

/** Expand a day range like "Mar-Sam" → [2, 3, 4, 5, 6] */
function expandDayRange(rangeStr: string): number[] {
  const parts = rangeStr.split("-").map((s) => s.trim());
  if (parts.length === 1) {
    const d = parseDayAbbrev(parts[0]);
    return d !== null ? [d] : [];
  }
  if (parts.length === 2) {
    const start = parseDayAbbrev(parts[0]);
    const end = parseDayAbbrev(parts[1]);
    if (start === null || end === null) return [];
    const days: number[] = [];
    let current = start;
    while (true) {
      days.push(current);
      if (current === end) break;
      current = (current + 1) % 7;
      // Safety: prevent infinite loop
      if (days.length > 7) break;
    }
    return days;
  }
  return [];
}

/**
 * Parse "Tous les jours" pattern
 */
function isTousLesJours(text: string): boolean {
  return /tous\s+les\s+jours/i.test(text);
}

/**
 * Parse the freeform horaires.texte field into day → TimeRange map.
 * Examples:
 *  - "Mar-Jeu 18h-1h, Ven-Sam 18h-2h"
 *  - "Tous les jours 15h-23h30"
 *  - "Mar-Sam 18h-2h"
 */
function parseHorairesTexte(texte: string): Map<number, TimeRange> {
  const result = new Map<number, TimeRange>();

  // Split by comma or semicolon
  const segments = texte.split(/[,;]/).map((s) => s.trim());

  for (const segment of segments) {
    let days: number[];
    let timeStr: string;

    if (isTousLesJours(segment)) {
      days = [0, 1, 2, 3, 4, 5, 6];
      timeStr = segment.replace(/tous\s+les\s+jours/i, "").trim();
    } else {
      // Match "Xxx-Yyy HHh-HHh" or "Xxx HHh-HHh"
      const match = segment.match(
        /^([A-Za-zÀ-ÿ]{3}(?:\s*-\s*[A-Za-zÀ-ÿ]{3})?)\s+(.+)$/
      );
      if (!match) continue;
      days = expandDayRange(match[1]);
      timeStr = match[2].trim();
    }

    // Parse "18h-2h" or "18h00-02h30"
    const timeParts = timeStr.split("-").map((s) => s.trim());
    if (timeParts.length !== 2) continue;

    const openTime = parseTime(timeParts[0]);
    const closeTime = parseTime(timeParts[1]);
    if (openTime === null || closeTime === null) continue;

    // If close < open, it means closing is after midnight
    const adjustedClose = closeTime <= openTime ? closeTime + 1440 : closeTime;

    for (const day of days) {
      result.set(day, { open: openTime, close: adjustedClose });
    }
  }

  return result;
}

/**
 * Check if a venue is currently open based on its horaires.
 * Returns: "open" | "closing_soon" | "closed" | "unknown"
 *
 * "closing_soon" = closing within the next 60 minutes
 */
export function getOpenStatus(
  horaires: Horaires | null
): "open" | "closing_soon" | "closed" | "unknown" {
  if (!horaires) return "unknown";

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...6=Sat
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Try structured horaires first (lundi, mardi, etc.)
  const dayKey = JOURS_SEMAINE[dayOfWeek];
  const structuredHours = horaires[dayKey as keyof Horaires];

  if (structuredHours && structuredHours !== horaires.texte) {
    // Structured: parse "18h-2h" format
    const timeRange = parseTimeRangeFromString(structuredHours);
    if (timeRange) {
      return checkTimeRange(timeRange, currentMinutes);
    }
  }

  // Try freeform texte
  if (horaires.texte) {
    const parsed = parseHorairesTexte(horaires.texte);

    // Check current day
    const todayRange = parsed.get(dayOfWeek);
    if (todayRange) {
      return checkTimeRange(todayRange, currentMinutes);
    }

    // Check if we're in the after-midnight window of yesterday's hours
    const yesterday = (dayOfWeek + 6) % 7;
    const yesterdayRange = parsed.get(yesterday);
    if (yesterdayRange && yesterdayRange.close > 1440) {
      // Yesterday's venue is still open into today
      const adjustedClose = yesterdayRange.close - 1440;
      if (currentMinutes < adjustedClose) {
        const minutesLeft = adjustedClose - currentMinutes;
        return minutesLeft <= 60 ? "closing_soon" : "open";
      }
    }

    // If parsed has entries but today isn't one of them → closed today
    if (parsed.size > 0) {
      return "closed";
    }
  }

  return "unknown";
}

function parseTimeRangeFromString(timeStr: string): TimeRange | null {
  const parts = timeStr.split("-").map((s) => s.trim());
  if (parts.length !== 2) return null;
  const open = parseTime(parts[0]);
  const close = parseTime(parts[1]);
  if (open === null || close === null) return null;
  return { open, close: close <= open ? close + 1440 : close };
}

function checkTimeRange(
  range: TimeRange,
  currentMinutes: number
): "open" | "closing_soon" | "closed" {
  // Check if currently within range
  if (currentMinutes >= range.open && currentMinutes < range.close) {
    const minutesLeft = range.close - currentMinutes;
    return minutesLeft <= 60 ? "closing_soon" : "open";
  }

  // Check after-midnight case: currentMinutes is early morning, range extends past midnight
  if (range.close > 1440 && currentMinutes < range.close - 1440) {
    const minutesLeft = range.close - 1440 - currentMinutes;
    return minutesLeft <= 60 ? "closing_soon" : "open";
  }

  return "closed";
}

/**
 * Check if a venue will be open tonight (between 18h and 6h).
 * Useful for "Ce soir" mode.
 */
export function isOpenTonight(horaires: Horaires | null): boolean {
  if (!horaires) return false;

  const now = new Date();
  const dayOfWeek = now.getDay();

  if (horaires.texte) {
    const parsed = parseHorairesTexte(horaires.texte);
    const todayRange = parsed.get(dayOfWeek);
    if (todayRange) return true;

    // Check "Tous les jours" → always open tonight
    if (parsed.size === 7) return true;
  }

  // Check structured
  const dayKey = JOURS_SEMAINE[dayOfWeek];
  const structuredHours = horaires[dayKey as keyof Horaires];
  if (structuredHours && structuredHours !== horaires.texte) return true;

  return false;
}

/**
 * Get tonight's closing time as a human-readable string.
 * Returns null if unknown.
 */
export function getTonightClosingTime(horaires: Horaires | null): string | null {
  if (!horaires) return null;

  const now = new Date();
  const dayOfWeek = now.getDay();

  if (horaires.texte) {
    const parsed = parseHorairesTexte(horaires.texte);
    const todayRange = parsed.get(dayOfWeek);
    if (todayRange) {
      const closeMinutes = todayRange.close > 1440 ? todayRange.close - 1440 : todayRange.close;
      const hours = Math.floor(closeMinutes / 60);
      const mins = closeMinutes % 60;
      return `${hours}h${mins > 0 ? String(mins).padStart(2, "0") : ""}`;
    }
  }

  return null;
}

/**
 * Get a contextual suggestion message based on current time and day.
 * Returns a suggestion string for the chat/home page.
 */
export function getContextualSuggestion(locale: "fr" | "en" = "fr"): {
  readonly message: string;
  readonly type: "evening" | "late_night" | "afternoon" | "weekend" | "default";
} {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0=Sun, 6=Sat
  const isWeekend = day === 0 || day === 5 || day === 6;

  if (locale === "fr") {
    if (hour >= 22 || hour < 2) {
      return {
        message: isWeekend
          ? `Il est ${hour}h un ${getDayNameFr(day)} soir — les clubs s'animent !`
          : `Il est ${hour}h — voici les bars encore ouverts`,
        type: "late_night",
      };
    }
    if (hour >= 18 && hour < 22) {
      return {
        message: isWeekend
          ? `C'est ${getDayNameFr(day)} ${hour}h — l'heure de l'apéro ! Où sortir ce soir ?`
          : `Il est ${hour}h — envie d'un afterwork ?`,
        type: "evening",
      };
    }
    if (hour >= 14 && hour < 18) {
      return {
        message: "Les terrasses vous attendent pour un verre en fin d'après-midi",
        type: "afternoon",
      };
    }
    if (isWeekend) {
      return {
        message: `Bon ${getDayNameFr(day)} ! Préparez votre soirée lyonnaise`,
        type: "weekend",
      };
    }
    return {
      message: "Explorez les meilleurs bars et clubs de Lyon",
      type: "default",
    };
  }

  // English
  if (hour >= 22 || hour < 2) {
    return {
      message: isWeekend
        ? `It's ${hour > 12 ? hour : hour}${hour >= 12 ? "PM" : "AM"} on a ${getDayNameEn(day)} — clubs are heating up!`
        : `It's ${hour}PM — here are bars still open`,
      type: "late_night",
    };
  }
  if (hour >= 18 && hour < 22) {
    return {
      message: isWeekend
        ? `${getDayNameEn(day)} ${hour > 12 ? hour - 12 : hour}PM — time for drinks! Where to go tonight?`
        : `It's ${hour > 12 ? hour - 12 : hour}PM — afterwork drinks?`,
      type: "evening",
    };
  }
  if (hour >= 14 && hour < 18) {
    return {
      message: "Terraces are waiting for an afternoon drink",
      type: "afternoon",
    };
  }
  if (isWeekend) {
    return {
      message: `Happy ${getDayNameEn(day)}! Plan your Lyon night out`,
      type: "weekend",
    };
  }
  return {
    message: "Explore the best bars and clubs in Lyon",
    type: "default",
  };
}

function getDayNameFr(day: number): string {
  const names = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  return names[day];
}

function getDayNameEn(day: number): string {
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return names[day];
}
