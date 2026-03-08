"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import Map, {
  Marker,
  Popup,
  NavigationControl,
  GeolocateControl,
  Source,
  Layer,
} from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import Supercluster from "supercluster";
import type { Lieu } from "@/types";
import { LieuMiniCard } from "@/components/cards/LieuMiniCard";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/* Lyon center coordinates */
const LYON_CENTER = { latitude: 45.7578, longitude: 4.832, zoom: 13 };

const TYPE_COLOR: Record<string, string> = {
  bar: "#FF6B35",
  club: "#7C3AED",
};

/* Generate a GeoJSON circle polygon (64 points) */
function createCircleGeoJSON(
  lat: number,
  lng: number,
  radiusKm: number
): GeoJSON.Feature<GeoJSON.Polygon> {
  const points = 64;
  const coords: [number, number][] = [];
  const kmPerDegreeLat = 111.32;
  const kmPerDegreeLng = 111.32 * Math.cos((lat * Math.PI) / 180);

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    coords.push([
      lng + (radiusKm / kmPerDegreeLng) * Math.cos(angle),
      lat + (radiusKm / kmPerDegreeLat) * Math.sin(angle),
    ]);
  }

  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coords] },
  };
}

interface RadiusCircle {
  readonly lat: number;
  readonly lng: number;
  readonly radiusKm: number;
}

interface MapViewProps {
  readonly lieux: readonly Lieu[];
  readonly hoveredId?: string | null;
  readonly onHover?: (id: string | null) => void;
  readonly className?: string;
  readonly radiusCircle?: RadiusCircle | null;
}

type LieuPointProperties = {
  id: string;
  type: string;
  cluster: false;
};

type LieuPoint = GeoJSON.Feature<GeoJSON.Point, LieuPointProperties>;

export function MapView({
  lieux,
  hoveredId,
  onHover,
  className,
  radiusCircle,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const [selectedLieu, setSelectedLieu] = useState<Lieu | null>(null);
  const [viewport, setViewport] = useState({
    zoom: LYON_CENTER.zoom,
    bounds: undefined as [number, number, number, number] | undefined,
  });

  /* Filter to only lieux with coordinates */
  const geoLieux = useMemo(
    () =>
      lieux.filter(
        (l): l is Lieu & { coordonnees: NonNullable<Lieu["coordonnees"]> } =>
          l.coordonnees != null
      ),
    [lieux]
  );

  /* Build GeoJSON points for supercluster */
  const points: LieuPoint[] = useMemo(
    () =>
      geoLieux.map((l) => ({
        type: "Feature" as const,
        properties: { id: l.id, type: l.type, cluster: false as const },
        geometry: {
          type: "Point" as const,
          coordinates: [l.coordonnees.lng, l.coordonnees.lat],
        },
      })),
    [geoLieux]
  );

  /* Create supercluster index */
  const superclusterIndex = useMemo(() => {
    const index = new Supercluster<LieuPointProperties>({
      radius: 60,
      maxZoom: 16,
    });
    index.load(points);
    return index;
  }, [points]);

  /* Get clusters for current viewport */
  const clusters = useMemo(() => {
    if (!viewport.bounds) return [];
    return superclusterIndex.getClusters(
      viewport.bounds,
      Math.floor(viewport.zoom)
    );
  }, [superclusterIndex, viewport]);

  /* Update viewport bounds on move */
  const handleMoveEnd = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    if (!b) return;
    setViewport({
      zoom: map.getZoom(),
      bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
    });
  }, []);

  const handleMarkerClick = useCallback(
    (lieu: Lieu) => {
      setSelectedLieu(lieu);
      if (lieu.coordonnees && mapRef.current) {
        mapRef.current.flyTo({
          center: [lieu.coordonnees.lng, lieu.coordonnees.lat],
          zoom: 15,
          duration: 800,
        });
      }
    },
    []
  );

  /* Fly to hovered lieu */
  useEffect(() => {
    if (!hoveredId || !mapRef.current) return;
    const lieu = geoLieux.find((l) => l.id === hoveredId);
    if (lieu?.coordonnees) {
      mapRef.current.flyTo({
        center: [lieu.coordonnees.lng, lieu.coordonnees.lat],
        zoom: 15,
        duration: 600,
      });
    }
  }, [hoveredId, geoLieux]);

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border bg-card ${className ?? ""}`}
      >
        <p className="text-sm text-muted-foreground">
          Ajoutez NEXT_PUBLIC_MAPBOX_TOKEN dans .env.local
        </p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl ${className ?? ""}`}>
      <Map
        ref={mapRef}
        initialViewState={LYON_CENTER}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        onClick={() => setSelectedLieu(null)}
        onLoad={handleMoveEnd}
        onMoveEnd={handleMoveEnd}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />

        {clusters.map((feature) => {
          const [lng, lat] = feature.geometry.coordinates;
          const props = feature.properties;

          /* ─── Cluster marker ─── */
          if (props.cluster) {
            const count = props.point_count;
            const size = count < 10 ? 36 : count < 50 ? 44 : 52;

            return (
              <Marker
                key={`cluster-${feature.id}`}
                latitude={lat}
                longitude={lng}
                anchor="center"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  const zoom = superclusterIndex.getClusterExpansionZoom(
                    feature.id as number
                  );
                  mapRef.current?.flyTo({
                    center: [lng, lat],
                    zoom,
                    duration: 500,
                  });
                }}
              >
                <div
                  className="flex cursor-pointer items-center justify-center rounded-full bg-primary/90 text-xs font-bold text-primary-foreground shadow-lg ring-2 ring-primary/30 transition-transform hover:scale-110"
                  style={{ width: size, height: size }}
                >
                  {count}
                </div>
              </Marker>
            );
          }

          /* ─── Individual marker ─── */
          const lieu = geoLieux.find((l) => l.id === props.id);
          if (!lieu) return null;

          const isHovered = lieu.id === hoveredId;
          const color = TYPE_COLOR[lieu.type] ?? "#FF6B35";

          return (
            <Marker
              key={lieu.id}
              latitude={lat}
              longitude={lng}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                handleMarkerClick(lieu);
              }}
            >
              <div
                className="flex cursor-pointer items-center justify-center transition-transform"
                style={{
                  transform: isHovered ? "scale(1.4)" : "scale(1)",
                }}
                onMouseEnter={() => onHover?.(lieu.id)}
                onMouseLeave={() => onHover?.(null)}
              >
                <svg width="28" height="36" viewBox="0 0 28 36">
                  <path
                    d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z"
                    fill={color}
                    opacity={isHovered ? 1 : 0.85}
                  />
                  <circle cx="14" cy="13" r="5" fill="white" />
                </svg>
              </div>
            </Marker>
          );
        })}

        {selectedLieu?.coordonnees && (
          <Popup
            latitude={selectedLieu.coordonnees.lat}
            longitude={selectedLieu.coordonnees.lng}
            anchor="bottom"
            offset={40}
            closeOnClick={false}
            onClose={() => setSelectedLieu(null)}
            className="[&_.mapboxgl-popup-content]:rounded-xl [&_.mapboxgl-popup-content]:border [&_.mapboxgl-popup-content]:border-border [&_.mapboxgl-popup-content]:bg-card [&_.mapboxgl-popup-content]:p-0 [&_.mapboxgl-popup-content]:shadow-xl"
          >
            <div className="w-56">
              <LieuMiniCard lieu={selectedLieu} />
            </div>
          </Popup>
        )}

        {/* Radius circle overlay */}
        {radiusCircle && (
          <Source
            id="radius-circle"
            type="geojson"
            data={createCircleGeoJSON(
              radiusCircle.lat,
              radiusCircle.lng,
              radiusCircle.radiusKm
            )}
          >
            <Layer
              id="radius-fill"
              type="fill"
              paint={{
                "fill-color": "#FF6B35",
                "fill-opacity": 0.08,
              }}
            />
            <Layer
              id="radius-border"
              type="line"
              paint={{
                "line-color": "#FF6B35",
                "line-width": 2,
                "line-opacity": 0.5,
                "line-dasharray": [3, 2],
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}
