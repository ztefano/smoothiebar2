import { useEffect, useRef, useState } from "react";
import { fetchDrivingRoute } from "@/lib/directions";
import { estimateEtaMinutes, haversineDistanceKm } from "@/lib/distance";
import type { Coordinates } from "@/types";

const MIN_REFRESH_MS = 20_000; // no pedir una ruta nueva más seguido que esto

export interface EtaEstimate {
  distanceKm: number;
  etaMinutes: number;
  /** "route" = Directions API (real por calles), "straight-line" = fallback. */
  source: "route" | "straight-line";
}

/**
 * ETA entre el chofer y el punto de encuentro. Muestra al instante una
 * estimación en línea recta y la va reemplazando por la ruta real de
 * Google Directions, sin pedir una ruta nueva en cada actualización de
 * ubicación (el chofer publica su posición cada pocos segundos).
 */
export function useDirectionsEta(
  pickup: Coordinates,
  driverLocation: Coordinates | null
): EtaEstimate | null {
  const [estimate, setEstimate] = useState<EtaEstimate | null>(null);
  const lastFetchRef = useRef(0);
  const lastFetchedLocationRef = useRef<Coordinates | null>(null);

  useEffect(() => {
    if (!driverLocation) {
      setEstimate(null);
      return;
    }

    const distanceKm = haversineDistanceKm(driverLocation, pickup);
    setEstimate((prev) => ({
      distanceKm,
      etaMinutes: estimateEtaMinutes(distanceKm),
      source: prev?.source === "route" ? prev.source : "straight-line",
    }));

    const now = Date.now();
    const movedEnough =
      !lastFetchedLocationRef.current ||
      haversineDistanceKm(lastFetchedLocationRef.current, driverLocation) > 0.05;

    if (now - lastFetchRef.current < MIN_REFRESH_MS || !movedEnough) return;

    lastFetchRef.current = now;
    lastFetchedLocationRef.current = driverLocation;

    fetchDrivingRoute(driverLocation, pickup).then((route) => {
      if (!route) return;
      setEstimate({
        distanceKm: route.distanceKm,
        etaMinutes: route.durationMinutes,
        source: "route",
      });
    });
  }, [driverLocation, pickup]);

  return estimate;
}
