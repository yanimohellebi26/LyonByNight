"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFavorites } from "@/hooks/useFavorites";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Users, Heart, ChevronRight, Settings, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageTransition } from "@/components/shared/PageTransition";
import type { Lieu } from "@/types";

interface Profile {
  display_name: string;
  avatar_url: string | null;
}

export default function ProfilPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { favoriteIds, isHydrated } = useFavorites();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);
  const [favoriteLieux, setFavoriteLieux] = useState<Lieu[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/profil");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          setDisplayName(data.display_name);
        }
      });

    supabase
      .from("user_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => setEventCount(count ?? 0));

    supabase
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => setGroupCount(count ?? 0));
  }, [user]);

  // Fetch favorite venues
  useEffect(() => {
    if (!isHydrated || favoriteIds.length === 0) {
      setFavoriteLieux([]);
      return;
    }

    async function fetchFavorites() {
      try {
        const res = await fetch("/api/lieux?limit=100");
        const json = await res.json();
        if (json.success) {
          const matched = (json.data as Lieu[]).filter((l) => favoriteIds.includes(l.id));
          setFavoriteLieux(matched.slice(0, 6));
        }
      } catch {
        /* ignore */
      }
    }

    void fetchFavorites();
  }, [isHydrated, favoriteIds]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setSaved(false);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
        month: "long",
        year: "numeric",
      })
    : "";

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
      <h1 className="font-display text-2xl font-bold">{t("profile")}</h1>

      {/* Profile header + form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-3xl font-bold text-primary-foreground ring-2 ring-primary/30">
            {displayName.charAt(0).toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-lg font-semibold">{displayName || user.email}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {memberSince && (
              <p className="text-xs text-muted-foreground">{t("member_since", { date: memberSince })}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="displayName" className="text-sm font-medium">
            {t("display_name")}
          </label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            minLength={2}
            maxLength={50}
            required
          />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? t("loading") : t("save")}
          </Button>
          {saved && (
            <span className="text-sm text-green-600">{t("saved")}</span>
          )}
        </div>
      </form>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <Heart className="mx-auto mb-2 h-5 w-5 text-red-500" />
          <p className="font-display text-2xl font-bold">{isHydrated ? favoriteIds.length : "—"}</p>
          <p className="text-xs text-muted-foreground">{t("stats_favorites")}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <Calendar className="mx-auto mb-2 h-5 w-5 text-primary" />
          <p className="font-display text-2xl font-bold">{eventCount}</p>
          <p className="text-xs text-muted-foreground">{t("stats_events")}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <Users className="mx-auto mb-2 h-5 w-5 text-accent" />
          <p className="font-display text-2xl font-bold">{groupCount}</p>
          <p className="text-xs text-muted-foreground">{t("stats_groups")}</p>
        </div>
      </div>

      {/* Favorite venues */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("favorite_venues")}</h2>
          {favoriteLieux.length > 0 && (
            <Link href="/explorer" className="text-sm text-primary hover:underline">
              {t("see_all_favorites")}
            </Link>
          )}
        </div>
        {isHydrated && favoriteLieux.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-muted-foreground/30 py-8 text-center text-muted-foreground">
            <Heart className="h-8 w-8" />
            <p className="text-sm">{t("no_favorites")}</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {favoriteLieux.map((lieu) => (
              <Link
                key={lieu.id}
                href={`/lieu/${lieu.slug}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={lieu.photo_cover ?? `https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=200&h=200&fit=crop`}
                    alt={lieu.nom}
                    fill
                    className="object-cover"
                    sizes="56px"
                    unoptimized
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{lieu.nom}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="uppercase">{lieu.type}</span>
                    {lieu.note && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {lieu.note}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t("my_activity")}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/evenements" className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm">
            <Calendar className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">{t("my_events")}</p>
              <p className="text-xs text-muted-foreground">
                {eventCount > 0 ? `${eventCount}` : t("coming_soon")}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/groupes" className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm">
            <Users className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">{t("my_groups")}</p>
              <p className="text-xs text-muted-foreground">
                {groupCount > 0 ? `${groupCount}` : t("coming_soon")}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/profil" className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">{t("settings")}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
    </PageTransition>
  );
}
