"use client";

import { useRef } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

interface MiniMapProps {
  readonly lat: number;
  readonly lng: number;
  readonly name: string;
  readonly color?: string;
  readonly className?: string;
}

export function MiniMap({
  lat,
  lng,
  color = "#FF6B35",
  className,
}: MiniMapProps) {
  const mapRef = useRef(null);

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border bg-card ${className ?? "h-48"}`}
      >
        <p className="text-xs text-muted-foreground">
          Carte non disponible
        </p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl ${className ?? "h-48"}`}>
      <Map
        ref={mapRef}
        initialViewState={{ latitude: lat, longitude: lng, zoom: 15 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        interactive={false}
        attributionControl={false}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <Marker latitude={lat} longitude={lng} anchor="bottom">
          <svg width="28" height="36" viewBox="0 0 28 36">
            <path
              d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z"
              fill={color}
            />
            <circle cx="14" cy="13" r="5" fill="white" />
          </svg>
        </Marker>
      </Map>
    </div>
  );
}
