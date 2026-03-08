import { readFileSync } from "fs";
import { join } from "path";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, TrendingUp, MapPin, Calendar, Sparkles } from "lucide-react";
import type { Lieu, Evenement } from "@/types";
import { LieuCard } from "@/components/cards/LieuCard";
import { EventCard } from "@/components/cards/EventCard";
import {
  FadeIn,
  StaggerList,
  StaggerItem,
} from "@/components/shared/MotionWrapper";
import { JsonLd } from "@/components/shared/JsonLd";
import { ContextualBanner } from "@/components/shared/ContextualBanner";
import { isOpenTonight } from "@/lib/utils/horaires";

function loadTopLieux(): Lieu[] {
  const raw = readFileSync(
    join(process.cwd(), "..", "data", "merged-geocoded.json"),
    "utf-8"
  );
  return JSON.parse(raw) as Lieu[];
}

type EnrichedEvent = Evenement & { lieu_nom: string };

function loadTodayEvents(): EnrichedEvent[] {
  try {
    const raw = readFileSync(
      join(process.cwd(), "..", "data", "events.json"),
      "utf-8"
    );
    const events = JSON.parse(raw) as Evenement[];
    const today = new Date().toISOString().split("T")[0];
    const lieux = loadTopLieux();
    const lieuxMap = new Map(lieux.map((l) => [l.id, l.nom]));

    return events
      .filter((e) => e.date === today)
      .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut))
      .map((e) => ({ ...e, lieu_nom: lieuxMap.get(e.lieu_id) ?? "Lieu inconnu" }));
  } catch {
    return [];
  }
}

function getTonightLieuIds(): Set<string> {
  try {
    const raw = readFileSync(
      join(process.cwd(), "..", "data", "events.json"),
      "utf-8"
    );
    const events = JSON.parse(raw) as Evenement[];
    const today = new Date().toISOString().split("T")[0];
    return new Set(events.filter((e) => e.date === today).map((e) => e.lieu_id));
  } catch {
    return new Set();
  }
}

export default async function HomePage() {
  const t = await getTranslations("home");
  const nav = await getTranslations("nav");

  const allLieux = loadTopLieux();
  const todayEvents = loadTodayEvents();
  const tonightIds = getTonightLieuIds();

  /* Top-rated lieux (trending) */
  const trending = [...allLieux]
    .filter((l) => l.note != null)
    .sort((a, b) => (b.note ?? 0) - (a.note ?? 0))
    .slice(0, 6);

  /* Lieux open tonight for "Ce soir" section */
  const tonight = [...allLieux]
    .filter((l) => isOpenTonight(l.horaires))
    .slice(0, 6);

  /* Bars with best price */
  const budgetFriendly = [...allLieux]
    .filter((l) => l.prix.fourchette === "€")
    .slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd type="website" />
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center gap-8 px-6 py-24 text-center">
        <FadeIn>
          <h1 className="max-w-2xl text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            {t("hero_title")}
          </h1>
        </FadeIn>
        <FadeIn delay={0.15}>
          <p className="max-w-lg text-lg text-muted-foreground">
            {t("hero_subtitle")}
          </p>
        </FadeIn>
        <FadeIn delay={0.25}>
          <div className="mx-auto max-w-md">
            <ContextualBanner />
          </div>
        </FadeIn>
        <FadeIn delay={0.3}>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/explorer"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/carte"
              className="inline-flex items-center gap-2 rounded-full border px-8 py-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              <MapPin className="h-4 w-4" />
              {nav("map")}
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* Quick stats */}
      <section className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-center gap-8 px-6 pb-12">
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">{allLieux.length}</p>
          <p className="text-sm text-muted-foreground">{t("venues")}</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">
            {allLieux.filter((l) => l.type === "bar").length}
          </p>
          <p className="text-sm text-muted-foreground">{t("bars")}</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">
            {allLieux.filter((l) => l.type === "club").length}
          </p>
          <p className="text-sm text-muted-foreground">{t("clubs")}</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">
            {new Set(allLieux.flatMap((l) => l.musique)).size}
          </p>
          <p className="text-sm text-muted-foreground">{t("music_genres")}</p>
        </div>
      </section>

      {/* Trending section */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">{t("trending")}</h2>
          </div>
          <Link
            href="/explorer?sort=note"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {t("see_all")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trending.map((lieu) => (
            <StaggerItem key={lieu.id}>
              <LieuCard lieu={lieu} hasEventTonight={tonightIds.has(lieu.id)} />
            </StaggerItem>
          ))}
        </StaggerList>
      </section>

      {/* Tonight / open now section */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">{t("tonight")}</h2>
          </div>
          <Link
            href="/explorer"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {nav("map")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tonight.map((lieu) => (
            <StaggerItem key={lieu.id}>
              <LieuCard lieu={lieu} hasEventTonight={tonightIds.has(lieu.id)} />
            </StaggerItem>
          ))}
        </StaggerList>
      </section>

      {/* Events tonight section */}
      {todayEvents.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 pb-16">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold">{t("events_tonight")}</h2>
            </div>
            <Link
              href="/evenements"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {nav("events")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <StaggerList className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {todayEvents.slice(0, 6).map((evt) => (
              <StaggerItem key={evt.id}>
                <EventCard event={evt} />
              </StaggerItem>
            ))}
          </StaggerList>
        </section>
      )}

      {/* Budget-friendly section */}
      {budgetFriendly.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 pb-24">
          <div className="mb-6 flex items-center gap-2">
            <span className="text-xl">💸</span>
            <h2 className="text-xl font-bold">{t("near_you")}</h2>
          </div>
          <StaggerList className="grid gap-4 sm:grid-cols-3">
            {budgetFriendly.map((lieu) => (
              <StaggerItem key={lieu.id}>
                <LieuCard lieu={lieu} hasEventTonight={tonightIds.has(lieu.id)} />
              </StaggerItem>
            ))}
          </StaggerList>
        </section>
      )}
    </div>
  );
}
