import type { Coordinates } from "@/types";

export interface DrivingRoute {
  distanceKm: number;
  durationMinutes: number;
}

/**
 * Ruta real por calles entre dos puntos usando Google Directions API.
 * Devuelve null si falla la llamada (sin API key, sin cuota, sin red, etc.)
 * para que quien la use pueda hacer fallback a una estimación más simple.
 */
export async function fetchDrivingRoute(
  origin: Coordinates,
  destination: Coordinates
): Promise<DrivingRoute | null> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    mode: "driving",
    key: apiKey,
  });

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`
    );
    const data = await response.json();

    if (data.status !== "OK" || !data.routes?.[0]?.legs?.[0]) return null;

    const leg = data.routes[0].legs[0];
    return {
      distanceKm: leg.distance.value / 1000,
      durationMinutes: Math.round(leg.duration.value / 60),
    };
  } catch {
    return null;
  }
}
