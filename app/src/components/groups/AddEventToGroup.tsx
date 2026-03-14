"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Search, Plus, Loader2, X, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Evenement } from "@/types";

interface AddEventToGroupProps {
  readonly groupId: string;
  readonly onAdded: () => void;
}

export function AddEventToGroup({ groupId, onAdded }: AddEventToGroupProps) {
  const t = useTranslations("groups");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Search events
  useEffect(() => {
    if (!open) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      // Show upcoming events by default
      setLoading(true);
      fetch("/api/events?period=month")
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setResults((json.data as Evenement[]).slice(0, 10));
        })
        .finally(() => setLoading(false));
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/events?period=month`);
        const json = await res.json();
        if (json.success) {
          const q = query.toLowerCase();
          const filtered = (json.data as Evenement[]).filter(
            (e) =>
              e.titre.toLowerCase().includes(q) ||
              (e.lieu_nom ?? "").toLowerCase().includes(q) ||
              (e.description ?? "").toLowerCase().includes(q)
          );
          setResults(filtered.slice(0, 10));
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  async function handleAdd(event: Evenement) {
    setAdding(event.id);

    const body: Record<string, string> = {};
    if (event.source === "user" && event._supabase_id) {
      body.user_event_id = event._supabase_id;
    } else if (event._supabase_id) {
      body.evenement_id = event._supabase_id;
    }

    try {
      const res = await fetch(`/api/groups/${groupId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onAdded();
        setOpen(false);
        setQuery("");
      }
    } finally {
      setAdding(null);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />
        {t("add_event")}
      </Button>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("add_event")}</h3>
        <button
          onClick={() => { setOpen(false); setQuery(""); }}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un événement…"
          className="pl-9"
          autoFocus
        />
      </div>

      <div className="max-h-64 overflow-y-auto space-y-1">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : results.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("no_events")}</p>
        ) : (
          results.map((event) => (
            <button
              key={event.id}
              onClick={() => handleAdd(event)}
              disabled={adding === event.id}
              className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-accent transition-colors disabled:opacity-50"
            >
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{event.titre}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(event.date + "T00:00:00").toLocaleDateString("fr-FR", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                  {event.heure_debut && ` - ${event.heure_debut}`}
                  {event.lieu_nom && ` · ${event.lieu_nom}`}
                </p>
              </div>
              {adding === event.id ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              ) : (
                <Plus className="h-4 w-4 shrink-0 text-primary" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
