"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/auth/AuthProvider";
import { Users, Check, Loader2 } from "lucide-react";

interface GroupOption {
  readonly id: string;
  readonly nom: string;
  readonly emoji: string;
}

interface ShareToGroupButtonProps {
  /** UUID of the scraped event (from evenements table) */
  readonly evenementId?: string;
  /** UUID of a user-created event (from user_events table) */
  readonly userEventId?: string;
}

export function ShareToGroupButton({ evenementId, userEventId }: ShareToGroupButtonProps) {
  const t = useTranslations("groups");
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [shared, setShared] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Load groups when opened
  useEffect(() => {
    if (!open || groups.length > 0) return;

    setLoading(true);
    fetch("/api/groups")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setGroups(json.data);
      })
      .finally(() => setLoading(false));
  }, [open, groups.length]);

  async function handleShare(groupId: string) {
    const body: Record<string, string> = {};
    if (evenementId) body.evenement_id = evenementId;
    if (userEventId) body.user_event_id = userEventId;

    const res = await fetch(`/api/groups/${groupId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setShared(groupId);
      setTimeout(() => {
        setShared(null);
        setOpen(false);
      }, 1200);
    }
  }

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        title={t("share_event_to_group")}
      >
        <Users className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-1 z-50 w-52 rounded-lg border bg-background p-1 shadow-lg">
          <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
            {t("share_event_to_group")}
          </p>
          {loading ? (
            <div className="flex justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">{t("no_groups")}</p>
          ) : (
            groups.map((g) => (
              <button
                key={g.id}
                onClick={() => handleShare(g.id)}
                disabled={shared === g.id}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
              >
                <span>{g.emoji}</span>
                <span className="flex-1 truncate text-left">{g.nom}</span>
                {shared === g.id && <Check className="h-3.5 w-3.5 text-green-500" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
