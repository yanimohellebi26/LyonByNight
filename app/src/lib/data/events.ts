import { readFileSync } from "fs";
import { getDataFilePath } from "@/lib/utils/data-path";
import { getDbClient } from "@/lib/supabase/db";
import type { Evenement, EventType } from "@/types";

const USE_SUPABASE = process.env.DATA_SOURCE === "supabase";

// ── JSON fallback ──────────────────────────────────────────────

let eventsCache: Evenement[] | null = null;
let lieuxMapCache: Map<string, string> | null = null;

function loadEventsFromJson(): Evenement[] {
  if (eventsCache) return eventsCache;
  eventsCache = JSON.parse(
    readFileSync(getDataFilePath("events.json"), "utf-8")
  ) as Evenement[];
  return eventsCache;
}

function loadLieuxMap(): Map<string, string> {
  if (lieuxMapCache) return lieuxMapCache;
  const raw = readFileSync(
    getDataFilePath("merged-geocoded.json"),
    "utf-8"
  );
  const lieux = JSON.parse(raw) as { id: string; nom: string }[];
  lieuxMapCache = new Map(lieux.map((l) => [l.id, l.nom]));
  return lieuxMapCache;
}

// ── Supabase row → Evenement transformer ──────────────────────

function rowToEvenement(
  row: Record<string, unknown>,
  lieuData?: { nom: string; old_id: string } | null
): Evenement {
  return {
    id: (row.old_id as string) || (row.id as string),
    _supabase_id: row.id as string,
    lieu_id: lieuData?.old_id || (row.lieu_id as string) || "",
    titre: (row.titre as string) || "",
    description: (row.description as string) || "",
    date: (row.date as string) || "",
    heure_debut: (row.heure_debut as string) || "",
    heure_fin: (row.heure_fin as string) || undefined,
    type: (row.type as EventType) || "autre",
    prix_entree: (row.prix_entree as string) || undefined,
    artiste: (row.artiste as string) || undefined,
    image: (row.image as string) || undefined,
    source: (row.source as string) || undefined,
    url: (row.url as string) || undefined,
    lieu_nom:
      (row.lieu_nom as string) ||
      lieuData?.nom ||
      undefined,
  };
}

// ── Supabase query ────────────────────────────────────────────

async function fetchEventsFromSupabase(): Promise<Evenement[]> {
  const db = getDbClient();
  const { data, error } = await db
    .from("evenements")
    .select("*, lieux(nom, old_id)")
    .order("date", { ascending: true })
    .order("heure_debut", { ascending: true });

  if (error) throw new Error(`[events] Supabase error: ${error.message}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((row) => {
    const lieu = row.lieux as { nom: string; old_id: string } | null;
    return rowToEvenement(row as Record<string, unknown>, lieu);
  });
}

// ── Fetch user-created events (Supabase only) ────────────

async function fetchUserEventsFromSupabase(): Promise<Evenement[]> {
  const db = getDbClient();
  const { data, error } = await db
    .from("user_events")
    .select("*, lieux(nom, slug, old_id)")
    .eq("status", "published")
    .order("date", { ascending: true })
    .order("heure_debut", { ascending: true });

  if (error) {
    console.warn("[events] user_events fetch failed:", error.message);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((row) => {
    const lieu = row.lieux as { nom: string; slug: string; old_id: string } | null;
    return {
      id: row.id as string,
      _supabase_id: row.id as string,
      lieu_id: lieu?.old_id || "",
      titre: (row.titre as string) || "",
      description: (row.description as string) || "",
      date: (row.date as string) || "",
      heure_debut: (row.heure_debut as string) || "",
      heure_fin: (row.heure_fin as string) || undefined,
      type: (row.type as EventType) || "autre",
      prix_entree: (row.prix_entree as string) || undefined,
      image: (row.image as string) || undefined,
      source: "user" as const,
      lieu_nom:
        (row.lieu_custom_nom as string) ||
        lieu?.nom ||
        undefined,
    } satisfies Evenement;
  });
}

// ── Public API ────────────────────────────────────────────────

export interface EventFilters {
  readonly date?: string;
  readonly type?: string;
  readonly lieu_id?: string;
  readonly period?: "tonight" | "week" | "month";
}

export async function getEvents(
  filters: EventFilters = {}
): Promise<Evenement[]> {
  let events: Evenement[];

  if (USE_SUPABASE) {
    // Fetch scraped + user events in parallel, then merge
    const [scraped, userCreated] = await Promise.all([
      fetchEventsFromSupabase(),
      fetchUserEventsFromSupabase(),
    ]);
    events = [...scraped, ...userCreated];
  } else {
    events = loadEventsFromJson();
  }

  const today = new Date().toISOString().split("T")[0];

  // Period filter
  if (filters.period === "tonight") {
    events = events.filter((e) => e.date === today);
  } else if (filters.period === "week") {
    const end = new Date();
    end.setDate(end.getDate() + 7);
    const endStr = end.toISOString().split("T")[0];
    events = events.filter((e) => e.date >= today && e.date <= endStr);
  } else if (filters.period === "month") {
    const end = new Date();
    end.setDate(end.getDate() + 30);
    const endStr = end.toISOString().split("T")[0];
    events = events.filter((e) => e.date >= today && e.date <= endStr);
  }

  // Direct filters
  if (filters.date) {
    events = events.filter((e) => e.date === filters.date);
  }
  if (filters.type) {
    events = events.filter((e) => e.type === filters.type);
  }
  if (filters.lieu_id) {
    events = events.filter((e) => e.lieu_id === filters.lieu_id);
  }

  // Sort by date then time (spread to avoid mutating)
  events = [...events].sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) return dateComp;
    return a.heure_debut.localeCompare(b.heure_debut);
  });

  // Enrich JSON events with venue names
  if (!USE_SUPABASE) {
    const lieuxMap = loadLieuxMap();
    events = events.map((e) => ({
      ...e,
      lieu_nom: e.lieu_id
        ? (lieuxMap.get(e.lieu_id) ?? e.lieu_nom ?? "Lieu inconnu")
        : (e.lieu_nom ?? "Lyon"),
    }));
  }

  return events;
}
