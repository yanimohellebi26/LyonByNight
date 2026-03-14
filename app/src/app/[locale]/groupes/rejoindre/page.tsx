"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound } from "lucide-react";
import { FadeIn } from "@/components/shared/MotionWrapper";

export default function JoinGroupPage() {
  const t = useTranslations("groups");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=/groupes/rejoindre${code ? `?code=${code}` : ""}`);
    }
  }, [authLoading, user, router, code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !code.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: code.trim() }),
      });

      const json = await res.json();
      if (json.success) {
        router.push(`/groupes/${json.data.id}`);
      } else {
        setError(t("invalid_code"));
      }
    } catch {
      setError(t("error_join"));
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
    <div className="mx-auto max-w-md px-4 py-8">
      <FadeIn>
        <div className="flex flex-col items-center gap-4 text-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{t("join_title")}</h1>
          <p className="text-muted-foreground">{t("join_subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium">
              {t("invite_code")}
            </label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("invite_code_placeholder")}
              className="text-center text-lg tracking-widest"
              maxLength={20}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={submitting || !code.trim()}>
            {submitting ? tAuth("loading") : t("join_button")}
          </Button>
        </form>
      </FadeIn>
    </div>
  );
}
