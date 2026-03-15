"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Users,
  Copy,
  Check,
  Loader2,
  ThumbsUp,
  Minus,
  ThumbsDown,
  Trash2,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { FadeIn, StaggerList, StaggerItem } from "@/components/shared/MotionWrapper";
import { AddEventToGroup } from "@/components/groups/AddEventToGroup";
import type { VoteValue } from "@/types";

interface Member {
  readonly id: string;
  readonly user_id: string;
  readonly role: string;
  readonly display_name: string;
  readonly avatar_url: string | null;
}

interface GroupEventData {
  readonly id: string;
  readonly added_by: string;
  readonly note: string;
  readonly event: {
    readonly titre: string;
    readonly date: string;
    readonly heure_debut: string;
    readonly type: string;
    readonly lieu_nom?: string;
    readonly image?: string;
  } | null;
  readonly vote_summary: {
    readonly interested: number;
    readonly maybe: number;
    readonly not_interested: number;
    readonly total: number;
  };
  readonly my_vote: VoteValue | null;
}

interface GroupDetail {
  readonly id: string;
  readonly nom: string;
  readonly description: string;
  readonly emoji: string;
  readonly privacy: string;
  readonly invite_code: string;
  readonly owner_id: string;
  readonly is_owner: boolean;
  readonly my_role: string | null;
  readonly members: readonly Member[];
  readonly events: readonly GroupEventData[];
}

export default function GroupDetailPage() {
  const t = useTranslations("groups");
  const tAuth = useTranslations("auth");
  const tEvents = useTranslations("events");
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"events" | "members">("events");

  const loadGroup = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      const json = await res.json();
      if (json.success) setGroup(json.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=/groupes/${groupId}`);
      return;
    }
    if (user) void loadGroup();
  }, [authLoading, user, router, groupId, loadGroup]);

  async function handleCopyCode() {
    if (!group) return;
    await navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleVote(groupEventId: string, vote: VoteValue) {
    if (!group) return;

    const ge = group.events.find((e) => e.id === groupEventId);
    if (!ge) return;

    const isToggleOff = ge.my_vote === vote;
    const previousVote = ge.my_vote;

    // Optimistic update
    setGroup({
      ...group,
      events: group.events.map((e) => {
        if (e.id !== groupEventId) return e;

        const summary = { ...e.vote_summary };
        // Remove previous vote from count
        if (previousVote) {
          summary[previousVote] = Math.max(0, summary[previousVote] - 1);
          summary.total = Math.max(0, summary.total - 1);
        }
        // Add new vote if not toggling off
        if (!isToggleOff) {
          summary[vote] = summary[vote] + 1;
          summary.total = summary.total + 1;
        }

        return { ...e, my_vote: isToggleOff ? null : vote, vote_summary: summary };
      }),
    });

    try {
      if (isToggleOff) {
        await fetch(`/api/groups/${groupId}/events/${groupEventId}/vote`, {
          method: "DELETE",
        });
      } else {
        await fetch(`/api/groups/${groupId}/events/${groupEventId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vote }),
        });
      }
    } catch {
      // Revert on failure
      void loadGroup();
    }
  }

  async function handleLeave() {
    if (!confirm(t("leave_confirm"))) return;

    await fetch(`/api/groups/${groupId}/members`, { method: "DELETE" });
    router.push("/groupes");
  }

  async function handleDelete() {
    if (!confirm(t("delete_confirm"))) return;

    await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
    router.push("/groupes");
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{tAuth("loading")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <p className="text-muted-foreground">Group not found</p>
        <Link href="/groupes">
          <Button variant="outline">{t("title")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <FadeIn>
        {/* Back */}
        <Link href="/groupes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {t("title")}
        </Link>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{group.emoji}</span>
            <div>
              <h1 className="text-2xl font-bold">{group.nom}</h1>
              {group.description && (
                <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {t("member_count", { count: group.members.length })}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {group.is_owner ? (
              <Button variant="outline" size="sm" onClick={handleDelete}>
                <Trash2 className="mr-1 h-4 w-4" />
                {t("delete")}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleLeave}>
                <LogOut className="mr-1 h-4 w-4" />
                {t("leave")}
              </Button>
            )}
          </div>
        </div>

        {/* Invite code */}
        <div className="mb-6 flex items-center gap-3 rounded-lg border bg-card p-3">
          <span className="text-sm font-medium text-muted-foreground">{t("invite_code")}:</span>
          <code className="text-lg font-bold tracking-widest">{group.invite_code}</code>
          <button
            onClick={handleCopyCode}
            className="ml-auto rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
          {copied && <span className="text-xs text-green-500">{t("invite_copied")}</span>}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg border bg-card p-1">
          <button
            onClick={() => setTab("events")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "events"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("events")} ({group.events.length})
          </button>
          <button
            onClick={() => setTab("members")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "members"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("members")} ({group.members.length})
          </button>
        </div>

        {/* Events tab */}
        {tab === "events" && (
          <div className="space-y-4">
            <AddEventToGroup groupId={groupId} onAdded={loadGroup} />

            {group.events.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <p className="text-muted-foreground">{t("no_events")}</p>
              </div>
            ) : (
              <StaggerList className="space-y-4">
                {group.events.map((ge) => (
                  <StaggerItem key={ge.id}>
                    <div className="rounded-lg border bg-card p-4 space-y-3">
                      {/* Event info */}
                      {ge.event && (
                        <div className="flex gap-3">
                          {ge.event.image && (
                            <img
                              src={ge.event.image}
                              alt=""
                              className="h-16 w-16 rounded-md object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{ge.event.titre}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(ge.event.date + "T00:00:00").toLocaleDateString("fr-FR", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })}
                              {ge.event.heure_debut && ` - ${ge.event.heure_debut}`}
                            </p>
                            {ge.event.lieu_nom && (
                              <p className="text-xs text-muted-foreground">{ge.event.lieu_nom}</p>
                            )}
                            <span className="inline-block mt-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                              {tEvents(`type_${ge.event.type}_single` as Parameters<typeof tEvents>[0])}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Note */}
                      {ge.note && (
                        <p className="text-sm italic text-muted-foreground">&ldquo;{ge.note}&rdquo;</p>
                      )}

                      {/* Vote buttons */}
                      <div className="flex gap-2">
                        <VoteButton
                          icon={<ThumbsUp className="h-4 w-4" />}
                          label={t("vote_interested")}
                          count={ge.vote_summary.interested}
                          active={ge.my_vote === "interested"}
                          variant="interested"
                          onClick={() => handleVote(ge.id, "interested")}
                        />
                        <VoteButton
                          icon={<Minus className="h-4 w-4" />}
                          label={t("vote_maybe")}
                          count={ge.vote_summary.maybe}
                          active={ge.my_vote === "maybe"}
                          variant="maybe"
                          onClick={() => handleVote(ge.id, "maybe")}
                        />
                        <VoteButton
                          icon={<ThumbsDown className="h-4 w-4" />}
                          label={t("vote_not_interested")}
                          count={ge.vote_summary.not_interested}
                          active={ge.my_vote === "not_interested"}
                          variant="not_interested"
                          onClick={() => handleVote(ge.id, "not_interested")}
                        />
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerList>
            )}
          </div>
        )}

        {/* Members tab */}
        {tab === "members" && (
          <StaggerList className="space-y-2">
            {group.members.map((member) => (
              <StaggerItem key={member.id}>
                <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {member.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{member.display_name}</p>
                    {member.role === "admin" && (
                      <span className="text-xs text-primary">
                        {member.user_id === group.owner_id ? t("owner") : t("admin")}
                      </span>
                    )}
                  </div>
                  {group.is_owner && member.user_id !== user.id && (
                    <button
                      onClick={async () => {
                        if (!confirm(t("remove_member") + "?")) return;
                        await fetch(`/api/groups/${groupId}/members?user_id=${member.user_id}`, {
                          method: "DELETE",
                        });
                        void loadGroup();
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title={t("remove_member")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </FadeIn>
    </div>
  );
}

// ── Vote button component ──────────────────────────────────

function VoteButton({
  icon,
  label,
  count,
  active,
  variant,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  variant: "interested" | "maybe" | "not_interested";
  onClick: () => void;
}) {
  const colorMap = {
    interested: active ? "bg-green-500/20 text-green-600 border-green-500/50" : "hover:bg-green-500/10",
    maybe: active ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/50" : "hover:bg-yellow-500/10",
    not_interested: active ? "bg-red-500/20 text-red-600 border-red-500/50" : "hover:bg-red-500/10",
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${colorMap[variant]}`}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {count > 0 && <span className="ml-0.5 font-bold">{count}</span>}
    </button>
  );
}
