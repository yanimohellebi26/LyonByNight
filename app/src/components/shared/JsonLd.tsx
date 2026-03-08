import type { Lieu, Evenement } from "@/types";

interface JsonLdProps {
  readonly type: "website" | "lieu" | "event";
  readonly lieu?: Lieu;
  readonly event?: Evenement & { lieu_nom?: string };
}

export function JsonLd({ type, lieu, event }: JsonLdProps) {
  let data: Record<string, unknown>;

  if (type === "website") {
    data = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Lyon Night Guide",
      description: "Le guide ultime de la vie nocturne lyonnaise — bars, clubs et événements.",
      url: "https://lyon-night-guide.vercel.app",
    };
  } else if (type === "lieu" && lieu) {
    data = {
      "@context": "https://schema.org",
      "@type": lieu.type === "club" ? "NightClub" : "BarOrPub",
      name: lieu.nom,
      description: lieu.description || undefined,
      address: {
        "@type": "PostalAddress",
        streetAddress: lieu.adresse,
        addressLocality: "Lyon",
        addressRegion: "Auvergne-Rhône-Alpes",
        addressCountry: "FR",
      },
      ...(lieu.coordonnees && {
        geo: {
          "@type": "GeoCoordinates",
          latitude: lieu.coordonnees.lat,
          longitude: lieu.coordonnees.lng,
        },
      }),
      ...(lieu.note != null && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: lieu.note,
          bestRating: 5,
        },
      }),
      ...(lieu.site_web && { url: lieu.site_web }),
      ...(lieu.telephone && { telephone: lieu.telephone }),
      priceRange: lieu.prix.fourchette,
    };
  } else if (type === "event" && event) {
    data = {
      "@context": "https://schema.org",
      "@type": "Event",
      name: event.titre,
      description: event.description || undefined,
      startDate: `${event.date}T${event.heure_debut}:00`,
      ...(event.heure_fin && {
        endDate: `${event.date}T${event.heure_fin}:00`,
      }),
      location: {
        "@type": "Place",
        name: event.lieu_nom ?? "Lyon",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Lyon",
          addressCountry: "FR",
        },
      },
      ...(event.artiste && {
        performer: {
          "@type": "MusicGroup",
          name: event.artiste,
        },
      }),
      ...(event.prix_entree && {
        offers: {
          "@type": "Offer",
          price: event.prix_entree === "Gratuit" ? "0" : event.prix_entree.replace("€", ""),
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
        },
      }),
    };
  } else {
    return null;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
