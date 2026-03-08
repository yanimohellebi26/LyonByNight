"use client";

import { useState, useEffect } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      const id = requestAnimationFrame(() => {
        setState({
          latitude: null,
          longitude: null,
          error: "Geolocation is not supported",
          loading: false,
        });
      });
      return () => cancelAnimationFrame(id);
    }

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!cancelled) {
          setState({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            error: null,
            loading: false,
          });
        }
      },
      (err) => {
        if (!cancelled) {
          setState({
            latitude: null,
            longitude: null,
            error: err.message,
            loading: false,
          });
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      },
    );

    return () => { cancelled = true; };
  }, []);

  return state;
}
