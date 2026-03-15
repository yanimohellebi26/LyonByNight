"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Users, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface Profile {
  display_name: string;
  avatar_url: string | null;
}

export default function ProfilPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [eventCount, setEventCount] = useState(0);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/profil");
    }
  }, [authLoading, user, router]);

  // Fetch profile
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

    // Count user events
    supabase
      .from("user_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => {
        setEventCount(count ?? 0);
      });
  }, [user]);

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

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">{t("profile")}</h1>

      {/* Profile form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
            {displayName.charAt(0).toUpperCase() || "?"}
          </div>
          <div>
            <p className="font-medium">{displayName || user.email}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
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

      {/* Quick links (placeholders for future phases) */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t("my_activity")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/evenements" className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent transition-colors">
            <Calendar className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">{t("my_events")}</p>
              <p className="text-xs text-muted-foreground">
                {eventCount > 0 ? `${eventCount} événement${eventCount > 1 ? "s" : ""}` : t("coming_soon")}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/groupes" className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent transition-colors">
            <Users className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">{t("my_groups")}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
  );
}
