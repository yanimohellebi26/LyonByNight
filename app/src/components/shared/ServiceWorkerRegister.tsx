"use client";

import { useEffect, useState } from "react";
import { UpdateNotification } from "@/components/pwa/UpdateNotification";

export function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] =
    useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Clear reload flag from previous update
    sessionStorage.removeItem("sw-reloaded");

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Check for waiting worker (update already downloaded)
        if (registration.waiting) {
          setUpdateAvailable(registration);
          return;
        }

        // Listen for new worker installing
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setUpdateAvailable(registration);
            }
          });
        });

        // Periodic update check (every 60 minutes)
        const interval = setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 60 * 1000);

        return () => clearInterval(interval);
      })
      .catch(() => {
        // Service worker registration failed — non-critical
      });
  }, []);

  if (updateAvailable) {
    return <UpdateNotification registration={updateAvailable} />;
  }

  return null;
}
