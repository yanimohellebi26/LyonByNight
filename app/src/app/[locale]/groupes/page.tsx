"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Users, Plus, KeyRound, Loader2 } from "lucide-react";
import { FadeIn, StaggerList, StaggerItem } from "@/components/shared/MotionWrapper";

interface GroupSummary {
  readonly id: string;
  readonly nom: string;
  readonly emoji: string;
  readonly privacy: string;
  readonly member_count: number;
  readonly updated_at: string;
}

export default function GroupesPage() {
  const t = useTranslations("groups");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/groupes");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/groups");
        const json = await res.json();
        if (json.success) setGroups(json.data);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{tAuth("loading")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <FadeIn>
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold">{t("title")}</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/groupes/rejoindre">
              <Button variant="outline" size="sm">
                <KeyRound className="mr-1 h-4 w-4" />
                {t("join")}
              </Button>
            </Link>
            <Link href="/groupes/creer">
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                {t("create")}
              </Button>
            </Link>
          </div>
        </div>
      </FadeIn>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : groups.length === 0 ? (
        <FadeIn>
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg text-muted-foreground">{t("no_groups")}</p>
            <p className="text-sm text-muted-foreground">{t("no_groups_desc")}</p>
          </div>
        </FadeIn>
      ) : (
        <StaggerList className="space-y-3">
          {groups.map((group) => (
            <StaggerItem key={group.id}>
              <Link href={`/groupes/${group.id}`}>
                <div className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent">
                  <span className="text-3xl">{group.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold truncate">{group.nom}</h2>
                    <p className="text-sm text-muted-foreground">
                      {t("member_count", { count: group.member_count })}
                    </p>
                  </div>
                  {group.privacy === "private" && (
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
      )}
    </div>
  );
}
