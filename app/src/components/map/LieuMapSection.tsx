"use client";

import { Navigation, ExternalLink, Car, Bus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MiniMap } from "@/components/map/MiniMap";

interface LieuMapSectionProps {
  readonly lat: number;
  readonly lng: number;
  readonly name: string;
  readonly adresse: string;
  readonly googleMaps?: string | null;
}

export function LieuMapSection({
  lat,
  lng,
  name,
  adresse,
  googleMaps,
}: LieuMapSectionProps) {
  const t = useTranslations("lieu");
  const tTransport = useTranslations("transport");

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`;
  const uberUrl = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${encodeURIComponent(name)}`;
  const boltUrl = `https://bolt.eu/en/ride/?destination_lat=${lat}&destination_lng=${lng}&destination_name=${encodeURIComponent(name)}`;
  const tclUrl = `https://www.tcl.fr/itineraires?destination=${encodeURIComponent(adresse + ", Lyon")}`;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold">{t("location")}</h2>
      <MiniMap lat={lat} lng={lng} name={name} className="h-52 w-full" />

      {/* Directions */}
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Navigation className="h-3.5 w-3.5" />
            {t("directions")}
          </Button>
        </a>
        {googleMaps && (
          <a href={googleMaps} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              Google Maps
            </Button>
          </a>
        )}
      </div>

      {/* Transport — VTC & TCL */}
      <div className="mt-4">
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{tTransport("title")}</h3>
        <div className="flex flex-wrap gap-2">
          <a href={uberUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Car className="h-3.5 w-3.5" />
              {tTransport("uber")}
            </Button>
          </a>
          <a href={boltUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Car className="h-3.5 w-3.5" />
              {tTransport("bolt")}
            </Button>
          </a>
          <a href={tclUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Bus className="h-3.5 w-3.5" />
              {tTransport("tcl_short")}
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
