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
  Music,
  Users,
  Euro,
  Tag,
  Star,
  Info,
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

let cachedLieux: Lieu[] | null = null;

function loadLieux(): Lieu[] {
  if (cachedLieux) return cachedLieux;

  try {
    const parsed = JSON.parse(
      readFileSync(getDataFilePath("merged-geocoded.json"), "utf-8")
    ) as Lieu[];
    cachedLieux = parsed;
    return parsed;
  } catch (primaryErr) {
    console.error("[loadLieux] primary file failed:", primaryErr);
    try {
      const parsed = JSON.parse(
        readFileSync(getDataFilePath("merged.json"), "utf-8")
      ) as Lieu[];
      cachedLieux = parsed;
      return parsed;
    } catch (fallbackErr) {
      console.error("[loadLieux] fallback file also failed:", fallbackErr);
      throw new Error("Failed to load venue data");
    }
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

  /* Deduplicate: don't show specificites that are identical to description */
  const uniqueSpecificites = lieu.specificites.filter(
    (spec) => spec.toLowerCase().trim() !== lieu.description.toLowerCase().trim()
  );

  /* Price label */
  const priceLabel =
    lieu.prix.fourchette === "€"
      ? t("price_budget")
      : lieu.prix.fourchette === "€€"
        ? t("price_mid")
        : t("price_upscale");

  /* Find similar venues — same category OR same type with musique overlap, up to 6 */
  const similar = lieux
    .filter(
      (l) =>
        l.id !== lieu.id &&
        (l.categorie === rawLieu.categorie ||
          (l.type === rawLieu.type &&
          l.musique.some((m) => rawLieu.musique.includes(m))))
    )
    .sort((a, b) => (b.note ?? 0) - (a.note ?? 0))
    .slice(0, 6)
    .map((l) => translateLieu(l, locale));

  /* Check if the venue has sparse data */
  const isSparse = !lieu.note && !lieu.resume_avis && lieu.photos.length === 0 && !lieu.horaires;

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
        <button
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t("share")}
        >
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {/* Overlay content on hero */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <Badge variant="secondary" className="mb-2 text-xs">
                {lieu.type === "club" ? t("type_club") : t("type_bar")}
              </Badge>
              <h1 className="text-2xl font-bold text-white drop-shadow-lg md:text-3xl">
                {lieu.nom}
              </h1>
              <p className="mt-1 text-sm text-white/80">
                <MapPin className="mr-1 inline h-3.5 w-3.5" />
                {lieu.quartier
                  ? `${lieu.quartier} — Lyon ${lieu.arrondissement}`
                  : lieu.adresse}
              </p>
            </div>
            {lieu.note != null && (
              <div className="flex shrink-0 items-center gap-1 rounded-xl bg-black/40 px-3 py-1.5 backdrop-blur">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-lg font-bold text-white">{lieu.note}</span>
                <span className="text-xs text-white/70">/5</span>
              </div>
            )}
          </div>
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

      {/* ===== Quick Facts Grid ===== */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">{t("quick_facts")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {/* Price */}
          <div className="flex items-start gap-3 rounded-xl border bg-card p-3">
            <Euro className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">{t("price_level")}</p>
              <p className="text-sm font-semibold">{lieu.prix.fourchette} · {priceLabel}</p>
              {lieu.prix.pinte_moy && (
                <p className="text-xs text-muted-foreground">
                  {t("avg_pint")}: {lieu.prix.pinte_moy}€
                </p>
              )}
              {lieu.prix.cocktail_moy && (
                <p className="text-xs text-muted-foreground">
                  {t("avg_cocktail")}: {lieu.prix.cocktail_moy}€
                </p>
              )}
            </div>
          </div>

          {/* Music */}
          {lieu.musique.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border bg-card p-3">
              <Music className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">{t("music_style")}</p>
                <p className="text-sm font-semibold">{lieu.musique.slice(0, 3).join(", ")}</p>
                {lieu.musique.length > 3 && (
                  <p className="text-xs text-muted-foreground">+{lieu.musique.length - 3}</p>
                )}
              </div>
            </div>
          )}

          {/* Category */}
          <div className="flex items-start gap-3 rounded-xl border bg-card p-3">
            <Tag className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">{t("category")}</p>
              <p className="text-sm font-semibold">{lieu.categorie}</p>
              {lieu.sous_categories.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {lieu.sous_categories.join(", ")}
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="flex items-start gap-3 rounded-xl border bg-card p-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">{t("neighborhood")}</p>
              <p className="text-sm font-semibold">
                {lieu.quartier ?? `Lyon ${lieu.arrondissement}`}
              </p>
              {lieu.quartier && lieu.arrondissement && (
                <p className="text-xs text-muted-foreground">Lyon {lieu.arrondissement}</p>
              )}
            </div>
          </div>

          {/* Clientele */}
          {lieu.clientele && (
            <div className="flex items-start gap-3 rounded-xl border bg-card p-3">
              <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">{t("clientele")}</p>
                <p className="text-sm font-semibold">{lieu.clientele}</p>
              </div>
            </div>
          )}

          {/* Capacity */}
          {lieu.capacite && (
            <div className="flex items-start gap-3 rounded-xl border bg-card p-3">
              <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">{t("capacity")}</p>
                <p className="text-sm font-semibold">{t("places", { count: lieu.capacite })}</p>
              </div>
            </div>
          )}

          {/* Hours (compact) */}
          {horairesLines.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border bg-card p-3 col-span-2 sm:col-span-1">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">{t("hours")}</p>
                {horairesLines.map((line) => (
                  <p key={line} className="text-sm font-semibold">{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Links */}
      {(lieu.site_web || lieu.instagram || lieu.google_maps) && (
        <div className="mb-8 flex flex-wrap gap-3">
          {lieu.site_web && (
            <a
              href={lieu.site_web}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors"
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
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors"
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
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Google Maps
            </a>
          )}
        </div>
      )}

      <Separator className="mb-8" />

      {/* ===== About Section — combines description + unique specificites ===== */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">{t("about")}</h2>
        {lieu.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {lieu.description}
          </p>
        )}

        {/* Specificites as tags — only those not duplicated from description */}
        {uniqueSpecificites.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {uniqueSpecificites.map((spec) => (
              <Badge key={spec} variant="secondary" className="text-xs">
                {spec}
              </Badge>
            ))}
          </div>
        )}
      </section>

      {/* Résumé des avis */}
      {lieu.resume_avis && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">{t("reviews_summary")}</h2>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm leading-relaxed text-muted-foreground italic">
              &ldquo;{lieu.resume_avis}&rdquo;
            </p>
          </div>
        </section>
      )}

      {/* Sparse data notice */}
      {isSparse && (
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("no_info")}</p>
        </div>
      )}

      {/* Événements à venir */}
      <LieuEvents lieuId={lieu.id} />

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

      {/* ===== Similar venues — expanded to 6, with richer cards ===== */}
      {similar.length > 0 && (
        <section className="mb-8">
          <Separator className="mb-6" />
          <h2 className="mb-4 text-lg font-semibold">{t("explore_similar")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {similar.map((s) => (
              <Link
                key={s.id}
                href={`/lieu/${s.slug}`}
                className="group rounded-xl border bg-card overflow-hidden transition-all hover:border-primary/30 hover:shadow-lg"
              >
                {/* Mini cover */}
                <div className="relative h-28 bg-gradient-to-br from-muted to-muted/50">
                  <Image
                    src={s.photo_cover ?? getPlaceholderImage(s.id, s.categorie, s.type)}
                    alt={s.nom}
                    fill
                    className="object-cover"
                    sizes="280px"
                    unoptimized
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                    {s.nom}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {s.note && (
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {s.note}
                      </span>
                    )}
                    <span>{s.prix.fourchette}</span>
                    {s.arrondissement && <span>Lyon {s.arrondissement}</span>}
                  </div>
                  {s.musique.length > 0 && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      ♫ {s.musique.slice(0, 2).join(", ")}
                    </p>
                  )}
                  {s.categorie && (
                    <Badge variant="outline" className="mt-2 text-[10px]">
                      {s.categorie}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
