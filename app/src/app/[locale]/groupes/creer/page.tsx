"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FadeIn } from "@/components/shared/MotionWrapper";

const EMOJI_OPTIONS = ["🎉", "🍻", "🎵", "🌙", "🔥", "💃", "🎸", "🍷", "🏠", "⚡"];

export default function CreateGroupPage() {
  const t = useTranslations("groups");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🎉");
  const [privacy, setPrivacy] = useState<"private" | "public">("private");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/groupes/creer");
    }
  }, [authLoading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, description, emoji, privacy }),
      });

      const json = await res.json();
      if (json.success) {
        router.push(`/groupes/${json.data.id}`);
      } else {
        setError(json.error || t("error_create"));
      }
    } catch {
      setError(t("error_create"));
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{tAuth("loading")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <FadeIn>
        <h1 className="mb-6 text-2xl font-bold">{t("create")}</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Group name */}
          <div className="space-y-2">
            <label htmlFor="nom" className="text-sm font-medium">
              {t("group_name")}
            </label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder={t("group_name_placeholder")}
              minLength={2}
              maxLength={100}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="desc" className="text-sm font-medium">
              {t("description")}
            </label>
            <textarea
              id="desc"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("description_placeholder")}
              maxLength={500}
            />
          </div>

          {/* Emoji */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("emoji")}</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`rounded-lg p-2 text-2xl transition-colors ${
                    emoji === e
                      ? "bg-primary/20 ring-2 ring-primary"
                      : "bg-card hover:bg-accent"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("privacy")}</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPrivacy("private")}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  privacy === "private"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("privacy_private")}
              </button>
              <button
                type="button"
                onClick={() => setPrivacy("public")}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  privacy === "public"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("privacy_public")}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? tAuth("loading") : t("create_button")}
          </Button>
        </form>
      </FadeIn>
    </div>
  );
}
