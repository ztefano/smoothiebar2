import type { Coordinates } from "@/types";

const EARTH_RADIUS_KM = 6371;

/** Distancia en línea recta entre dos coordenadas, en kilómetros. */
export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * ETA aproximado asumiendo una velocidad promedio urbana.
 * No reemplaza a una API de rutas real (ver docs/SETUP.md para integrar
 * Google Directions y obtener tiempos/distancias por calle).
 */
export function estimateEtaMinutes(distanceKm: number, avgSpeedKmh = 28): number {
  if (distanceKm <= 0) return 0;
  return Math.round((distanceKm / avgSpeedKmh) * 60);
}
