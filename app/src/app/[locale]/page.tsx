import { readFileSync } from "fs";
import { getTranslations, getLocale } from "next-intl/server";
import { getDataFilePath } from "@/lib/utils/data-path";
import { Link } from "@/i18n/navigation";
import { ArrowRight, MapPin, Calendar, Sparkles, MessageCircle, Search, GitCompareArrows, PartyPopper } from "lucide-react";
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
import { CollectionGrid } from "@/components/shared/CollectionCard";
import { FeaturedVenueCard } from "@/components/shared/FeaturedVenueCard";
import { isOpenTonight } from "@/lib/utils/horaires";
import { translateLieu, translateEvent } from "@/lib/utils/translations";

let cachedTopLieux: Lieu[] | null = null;

function loadTopLieux(): Lieu[] {
  if (cachedTopLieux) return cachedTopLieux;
  const raw = readFileSync(getDataFilePath("merged-geocoded.json"), "utf-8");
  cachedTopLieux = JSON.parse(raw) as Lieu[];
  return cachedTopLieux;
}

type EnrichedEvent = Evenement & { lieu_nom: string };

function loadTodayEvents(): EnrichedEvent[] {
  try {
    const raw = readFileSync(getDataFilePath("events.json"), "utf-8");
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
    const raw = readFileSync(getDataFilePath("events.json"), "utf-8");
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
  const locale = await getLocale();

  const rawLieux = loadTopLieux();
  const allLieux = rawLieux.map((l) => translateLieu(l, locale));
  const rawEvents = loadTodayEvents();
  const todayEvents = rawEvents.map((e) => ({ ...translateEvent(e, locale), lieu_nom: e.lieu_nom }));
  const tonightIds = getTonightLieuIds();
  const serverToday = new Date().toISOString().split("T")[0];

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

  /* Featured venue (highest-rated) */
  const featuredVenue = trending[0] ?? null;

  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd type="website" />
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center gap-6 px-6 py-28 text-center overflow-hidden md:py-36">
        {/* Atmospheric background */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/8 via-background to-background" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 -z-10 h-[500px] w-[800px] rounded-full bg-primary/6 blur-[120px]" />
        <div className="absolute bottom-0 left-0 right-0 -z-10 h-px glow-line" />

        <FadeIn>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.3em] text-primary">
            Lyon Night Guide
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h1 className="max-w-3xl font-display text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
            {t("hero_title")}
          </h1>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="max-w-md text-base text-muted-foreground md:text-lg">
            {t("hero_subtitle")}
          </p>
        </FadeIn>
        <FadeIn delay={0.25}>
          <div className="mx-auto max-w-md">
            <ContextualBanner />
          </div>
        </FadeIn>
        <FadeIn delay={0.3}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/explorer"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:brightness-110"
            >
              {t("cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/carte"
              className="inline-flex items-center gap-2 rounded-full border border-border px-7 py-3 text-sm font-medium transition-colors hover:bg-secondary"
            >
              <MapPin className="h-4 w-4" />
              {nav("map")}
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-7 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <MessageCircle className="h-4 w-4" />
              {t("ask_ai")}
            </button>
          </div>
        </FadeIn>
      </section>

      {/* Quick stats */}
      <section className="mx-auto flex w-full max-w-3xl items-center justify-center gap-6 px-6 pb-16 md:gap-12">
        {[
          { value: allLieux.length, label: t("venues") },
          { value: allLieux.filter((l) => l.type === "bar").length, label: t("bars") },
          { value: allLieux.filter((l) => l.type === "club").length, label: t("clubs") },
          { value: new Set(allLieux.flatMap((l) => l.musique)).size, label: t("music_genres") },
        ].map((stat, i) => (
          <div key={stat.label} className="flex items-center gap-6 md:gap-12">
            {i > 0 && <div className="h-8 w-px bg-border" />}
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-primary md:text-3xl">{stat.value}</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-4xl px-6 pb-20">
        <FadeIn>
          <h2 className="mb-10 text-center font-display text-2xl font-bold">{t("how_it_works")}</h2>
        </FadeIn>
        <StaggerList className="grid gap-8 sm:grid-cols-3">
          <StaggerItem>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-card shadow-sm">
                <Search className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t("step_explore")}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("step_explore_desc")}</p>
              </div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-card shadow-sm">
                <GitCompareArrows className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t("step_compare")}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("step_compare_desc")}</p>
              </div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-card shadow-sm">
                <PartyPopper className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t("step_go_out")}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("step_go_out_desc")}</p>
              </div>
            </div>
          </StaggerItem>
        </StaggerList>
      </section>

      {/* Featured venue */}
      {featuredVenue && (
        <section className="mx-auto w-full max-w-6xl px-6 pb-16">
          <FadeIn>
            <div className="mb-8">
              <h2 className="font-display text-2xl font-bold">{t("featured")}</h2>
              <div className="mt-1 h-0.5 w-12 rounded-full bg-primary" />
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <FeaturedVenueCard lieu={featuredVenue} />
          </FadeIn>
        </section>
      )}

      {/* Collections */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16">
        <FadeIn>
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold">{t("collections")}</h2>
            <div className="mt-1 h-0.5 w-12 rounded-full bg-primary" />
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible">
            <CollectionGrid />
          </div>
        </FadeIn>
      </section>

      {/* Trending section */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">{t("trending")}</h2>
            <div className="mt-1 h-0.5 w-12 rounded-full bg-primary" />
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">{t("tonight")}</h2>
            <div className="mt-1 h-0.5 w-12 rounded-full bg-primary" />
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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">{t("events_tonight")}</h2>
              <div className="mt-1 h-0.5 w-12 rounded-full bg-primary" />
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
                <EventCard event={evt} serverToday={serverToday} />
              </StaggerItem>
            ))}
          </StaggerList>
        </section>
      )}

      {/* Budget-friendly section */}
      {budgetFriendly.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 pb-24">
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold">{t("near_you")}</h2>
            <div className="mt-1 h-0.5 w-12 rounded-full bg-primary" />
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
