import { notFound } from "next/navigation";
import { readFileSync } from "fs";
import Image from "next/image";
import { getDataFilePath } from "@/lib/utils/data-path";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  MapPin,
  Clock,
  Globe,
  Instagram,
  ExternalLink,
  ArrowLeft,
  Share2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LieuMapSection } from "@/components/map/LieuMapSection";
import { LieuEvents } from "@/components/cards/LieuEvents";
import { JsonLd } from "@/components/shared/JsonLd";
import { getPlaceholderImage } from "@/lib/placeholder-images";
import { translateLieu } from "@/lib/utils/translations";
import type { Lieu } from "@/types";
import type { Metadata } from "next";

interface LieuPageProps {
  params: Promise<{ slug: string; locale: string }>;
}

function loadLieux(): Lieu[] {
  try {
    return JSON.parse(readFileSync(getDataFilePath("merged-geocoded.json"), "utf-8"));
  } catch {
    return JSON.parse(readFileSync(getDataFilePath("merged.json"), "utf-8"));
  }
}

function formatHoraires(horaires: Lieu["horaires"], dayLabels: Record<string, string>): string[] {
  if (!horaires) return [];
  if (horaires.texte) return [horaires.texte];
  const days: (keyof Omit<NonNullable<Lieu["horaires"]>, "texte">)[] = [
    "lundi",
    "mardi",
    "mercredi",
    "jeudi",
    "vendredi",
    "samedi",
    "dimanche",
  ];
  const labels: Record<string, string> = {
    lundi: dayLabels.day_mon,
    mardi: dayLabels.day_tue,
    mercredi: dayLabels.day_wed,
    jeudi: dayLabels.day_thu,
    vendredi: dayLabels.day_fri,
    samedi: dayLabels.day_sat,
    dimanche: dayLabels.day_sun,
  };
  return days
    .filter((d) => horaires[d])
    .map((d) => `${labels[d]} : ${horaires[d]}`);
}

export async function generateMetadata({ params }: LieuPageProps): Promise<Metadata> {
  const { slug } = await params;
  const lieux = loadLieux();
  const lieu = lieux.find((l) => l.slug === slug);
  const t = await getTranslations("lieu");

  if (!lieu) return { title: t("not_found") };

  const description = lieu.description
    ? lieu.description.slice(0, 160)
    : `${lieu.nom} — ${lieu.type === "club" ? t("type_club") : t("type_bar")} à Lyon${lieu.arrondissement ? ` ${lieu.arrondissement}` : ""}`;

  return {
    title: `${lieu.nom} — Lyon Night Guide`,
    description,
    openGraph: {
      title: lieu.nom,
      description,
      type: "website",
    },
  };
}

export default async function LieuPage({ params }: LieuPageProps) {
  const { slug } = await params;
  const lieux = loadLieux();
  const rawLieu = lieux.find((l) => l.slug === slug);

  if (!rawLieu) notFound();

  const t = await getTranslations("lieu");
  const tNav = await getTranslations("nav");
  const locale = await getLocale();

  const lieu = translateLieu(rawLieu, locale);

  const coverSrc = lieu.photo_cover ?? getPlaceholderImage(lieu.id, lieu.categorie, lieu.type);
  const dayLabels = {
    day_mon: t("day_mon"), day_tue: t("day_tue"), day_wed: t("day_wed"),
    day_thu: t("day_thu"), day_fri: t("day_fri"), day_sat: t("day_sat"), day_sun: t("day_sun"),
  };
  const horairesLines = formatHoraires(lieu.horaires, dayLabels);

  /* Find similar venues (same type or musique overlap, limit 3) */
  const similar = lieux
    .filter(
      (l) =>
        l.id !== lieu.id &&
        (l.type === lieu.type ||
          l.musique.some((m) => rawLieu.musique.includes(m)))
    )
    .slice(0, 3)
    .map((l) => translateLieu(l, locale));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <JsonLd type="lieu" lieu={lieu} />
      {/* Back + share */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/explorer"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {tNav("explore")}
        </Link>
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Share2 className="h-4 w-4" />
          {t("share")}
        </button>
      </div>

      {/* Hero banner */}
      <div className="relative mb-8 flex h-56 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-muted to-muted/50 md:h-72">
        <Image
          src={coverSrc}
          alt={lieu.nom}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 896px"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute left-4 top-4">
          <Badge variant="secondary" className="text-xs">
            {lieu.type === "club" ? t("type_club") : t("type_bar")}
          </Badge>
        </div>
      </div>

      {/* Photo gallery */}
      {lieu.photos.length > 1 && (
        <div className="mb-8 flex gap-3 overflow-x-auto pb-2">
          {lieu.photos.map((photo, idx) => (
            <div
              key={idx}
              className="relative h-24 w-36 shrink-0 overflow-hidden rounded-xl"
            >
              <Image
                src={photo}
                alt={`${lieu.nom} photo ${idx + 1}`}
                fill
                className="object-cover"
                sizes="144px"
                unoptimized
              />
            </div>
          ))}
        </div>
      )}

      {/* Title + meta row */}
      <div className="mb-6">
        {lieu.musique.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {lieu.musique.map((m) => (
              <span
                key={m}
                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                ♫ {m}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">
            {lieu.nom}
          </h1>
          {lieu.note != null && (
            <div className="flex shrink-0 items-center gap-1 rounded-xl bg-primary/10 px-3 py-1.5">
              <span className="text-lg text-amber-400">★</span>
              <span className="text-lg font-bold">{lieu.note}</span>
              <span className="text-xs text-muted-foreground">/5</span>
            </div>
          )}
        </div>

        {/* Quick info row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {lieu.quartier
              ? `${lieu.quartier} — Lyon ${lieu.arrondissement}`
              : lieu.adresse}
          </span>
          {lieu.prix.fourchette && (
            <span className="font-mono font-medium text-foreground">
              {lieu.prix.fourchette}
              {lieu.prix.pinte_moy &&
                ` · ${t("pinte", { price: lieu.prix.pinte_moy })}`}
              {lieu.prix.cocktail_moy &&
                ` · ${t("cocktail", { price: lieu.prix.cocktail_moy })}`}
            </span>
          )}
        </div>

        {/* Links */}
        <div className="mt-3 flex flex-wrap gap-3">
          {lieu.site_web && (
            <a
              href={lieu.site_web}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Globe className="h-4 w-4" />
              {t("website")}
            </a>
          )}
          {lieu.instagram && (
            <a
              href={
                lieu.instagram.startsWith("http")
                  ? lieu.instagram
                  : `https://instagram.com/${lieu.instagram.replace("@", "")}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Instagram className="h-4 w-4" />
              Instagram
            </a>
          )}
          {lieu.google_maps && (
            <a
              href={lieu.google_maps}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Google Maps
            </a>
          )}
        </div>
      </div>

      <Separator className="mb-8" />

      {/* Description */}
      {lieu.description && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">{t("description")}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {lieu.description}
          </p>
        </section>
      )}

      {/* Résumé des avis */}
      {lieu.resume_avis && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">{t("reviews_summary")}</h2>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {lieu.resume_avis}
            </p>
          </div>
        </section>
      )}

      {/* Spécificités */}
      {lieu.specificites.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">{t("features")}</h2>
          <div className="flex flex-wrap gap-2">
            {lieu.specificites.map((spec) => (
              <Badge key={spec} variant="secondary" className="text-xs">
                {spec}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Événements à venir */}
      <LieuEvents lieuId={lieu.id} />

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        {/* Horaires */}
        {horairesLines.length > 0 && (
          <section className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Clock className="h-4 w-4" /> {t("hours")}
            </h2>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {horairesLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Infos pratiques */}
        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 font-semibold">{t("practical_info")}</h2>
          <dl className="space-y-2 text-sm">
            {lieu.clientele && (
              <div>
                <dt className="text-muted-foreground">{t("clientele")}</dt>
                <dd className="font-medium">{lieu.clientele}</dd>
              </div>
            )}
            {lieu.capacite && (
              <div>
                <dt className="text-muted-foreground">{t("capacity")}</dt>
                <dd className="font-medium">{t("places", { count: lieu.capacite })}</dd>
              </div>
            )}
            {lieu.categorie && (
              <div>
                <dt className="text-muted-foreground">{t("category")}</dt>
                <dd className="font-medium">{lieu.categorie}</dd>
              </div>
            )}
            {lieu.sous_categories.length > 0 && (
              <div>
                <dt className="text-muted-foreground">{t("subcategories")}</dt>
                <dd className="font-medium">
                  {lieu.sous_categories.join(", ")}
                </dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      {/* Mini-carte */}
      {lieu.coordonnees && (
        <LieuMapSection
          lat={lieu.coordonnees.lat}
          lng={lieu.coordonnees.lng}
          name={lieu.nom}
          adresse={lieu.adresse}
          googleMaps={lieu.google_maps}
        />
      )}

      {/* Similar venues */}
      {similar.length > 0 && (
        <section className="mb-8">
          <Separator className="mb-6" />
          <h2 className="mb-4 text-lg font-semibold">{t("similar")}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {similar.map((s) => (
              <a
                key={s.id}
                href={`/lieu/${s.slug}`}
                className="group rounded-xl border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-lg"
              >
                <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                  {s.nom}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {s.note && (
                    <span className="text-amber-400">★ {s.note}</span>
                  )}
                  <span>{s.prix.fourchette}</span>
                  {s.arrondissement && <span>Lyon {s.arrondissement}</span>}
                </div>
                {s.musique.length > 0 && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    ♫ {s.musique.slice(0, 2).join(", ")}
                  </p>
                )}
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
