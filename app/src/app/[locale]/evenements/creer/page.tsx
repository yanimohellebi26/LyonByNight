"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { LieuSelector } from "@/components/events/LieuSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EventType } from "@/types";

const EVENT_TYPES: EventType[] = [
  "concert", "dj_set", "soiree_theme", "quiz",
  "cultural", "student", "erasmus", "festival",
  "expo", "workshop", "sport", "autre",
];

export default function CreateEventPage() {
  const t = useTranslations("create_event");
  const tEvents = useTranslations("events");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [type, setType] = useState<EventType>("autre");
  const [prixEntree, setPrixEntree] = useState("");
  const [lieuId, setLieuId] = useState<string | undefined>();
  const [lieuName, setLieuName] = useState("");
  const [customNom, setCustomNom] = useState("");
  const [customAdresse, setCustomAdresse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/evenements/creer");
    }
  }, [authLoading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      titre,
      description,
      date,
      heure_debut: heureDebut,
      type,
      status: "published",
    };

    if (heureFin) payload.heure_fin = heureFin;
    if (prixEntree) payload.prix_entree = prixEntree;

    if (lieuId) {
      payload.lieu_id = lieuId;
    } else if (customNom) {
      payload.lieu_custom_nom = customNom;
      if (customAdresse) payload.lieu_custom_adresse = customAdresse;
    }

    try {
      const res = await fetch("/api/user-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error || t("error"));
        setSubmitting(false);
        return;
      }

      router.push("/evenements");
    } catch {
      setError(t("error"));
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
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Titre */}
        <div className="space-y-2">
          <label htmlFor="titre" className="text-sm font-medium">
            {t("event_name")} *
          </label>
          <Input
            id="titre"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder={t("event_name_placeholder")}
            required
            minLength={2}
            maxLength={200}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="desc" className="text-sm font-medium">
            {t("description")}
          </label>
          <textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("description_placeholder")}
            maxLength={2000}
            rows={3}
            className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </div>

        {/* Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("type")} *</label>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map((t_type) => (
              <button
                key={t_type}
                type="button"
                onClick={() => setType(t_type)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  type === t_type
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {tEvents(`type_${t_type === "soiree_theme" ? "soiree" : t_type}_single` as any)}
              </button>
            ))}
          </div>
        </div>

        {/* Date + Times */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <label htmlFor="date" className="text-sm font-medium">
              {t("date")} *
            </label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="heure_debut" className="text-sm font-medium">
              {t("start_time")} *
            </label>
            <Input
              id="heure_debut"
              type="time"
              value={heureDebut}
              onChange={(e) => setHeureDebut(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="heure_fin" className="text-sm font-medium">
              {t("end_time")}
            </label>
            <Input
              id="heure_fin"
              type="time"
              value={heureFin}
              onChange={(e) => setHeureFin(e.target.value)}
            />
          </div>
        </div>

        {/* Prix */}
        <div className="space-y-2">
          <label htmlFor="prix" className="text-sm font-medium">
            {t("price")}
          </label>
          <Input
            id="prix"
            value={prixEntree}
            onChange={(e) => setPrixEntree(e.target.value)}
            placeholder={t("price_placeholder")}
            maxLength={50}
          />
        </div>

        {/* Lieu */}
        <LieuSelector
          selectedId={lieuId}
          selectedName={lieuName}
          onSelect={(lieu) => {
            if (lieu) {
              setLieuId(lieu.id);
              setLieuName(lieu.nom);
              setCustomNom("");
              setCustomAdresse("");
            } else {
              setLieuId(undefined);
              setLieuName("");
            }
          }}
          onCustom={({ nom, adresse }) => {
            setCustomNom(nom);
            setCustomAdresse(adresse);
          }}
        />

        {/* Error */}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Submit */}
        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
          {submitting ? tAuth("loading") : t("publish")}
        </Button>
      </form>
    </div>
  );
}
