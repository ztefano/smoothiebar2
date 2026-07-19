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
  polyline: Coordinates[];
}

/**
 * ETA y ruta entre el chofer y un destino (punto de encuentro o destino
 * final, según en qué etapa del viaje esté). Muestra al instante una
 * estimación en línea recta y la va reemplazando por la ruta real de
 * Google Directions, sin pedir una ruta nueva en cada actualización de
 * ubicación (el chofer publica su posición cada pocos segundos).
 */
export function useDirectionsEta(
  target: Coordinates,
  driverLocation: Coordinates | null
): EtaEstimate | null {
  const [estimate, setEstimate] = useState<EtaEstimate | null>(null);
  const lastFetchRef = useRef(0);
  const lastFetchedLocationRef = useRef<Coordinates | null>(null);
  const lastTargetRef = useRef<Coordinates>(target);

  useEffect(() => {
    if (!driverLocation) {
      setEstimate(null);
      return;
    }

    // Si cambió el objetivo (ej: de punto de encuentro a destino final al
    // iniciar el viaje), se descarta la ruta vieja y se fuerza pedir una nueva.
    const targetChanged =
      lastTargetRef.current.lat !== target.lat || lastTargetRef.current.lng !== target.lng;
    if (targetChanged) {
      lastTargetRef.current = target;
      lastFetchRef.current = 0;
      lastFetchedLocationRef.current = null;
    }

    const distanceKm = haversineDistanceKm(driverLocation, target);
    setEstimate((prev) => ({
      distanceKm,
      etaMinutes: estimateEtaMinutes(distanceKm),
      source: !targetChanged && prev?.source === "route" ? prev.source : "straight-line",
      polyline: !targetChanged ? (prev?.polyline ?? []) : [],
    }));

    const now = Date.now();
    const movedEnough =
      !lastFetchedLocationRef.current ||
      haversineDistanceKm(lastFetchedLocationRef.current, driverLocation) > 0.05;

    if (now - lastFetchRef.current < MIN_REFRESH_MS || !movedEnough) return;

    lastFetchRef.current = now;
    lastFetchedLocationRef.current = driverLocation;

    fetchDrivingRoute(driverLocation, target).then((route) => {
      if (!route) return;
      setEstimate({
        distanceKm: route.distanceKm,
        etaMinutes: route.durationMinutes,
        source: "route",
        polyline: route.polyline,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverLocation?.lat, driverLocation?.lng, target.lat, target.lng]);

  return estimate;
}
