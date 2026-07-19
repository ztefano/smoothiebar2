import type { Coordinates } from "@/types";

export interface DrivingRoute {
  distanceKm: number;
  durationMinutes: number;
  polyline: Coordinates[];
}

/** Decodifica el "encoded polyline" que devuelve Google Directions. */
function decodePolyline(encoded: string): Coordinates[] {
  const points: Coordinates[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
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

    const route = data.routes[0];
    const leg = route.legs[0];
    return {
      distanceKm: leg.distance.value / 1000,
      durationMinutes: Math.round(leg.duration.value / 60),
      polyline: route.overview_polyline?.points ? decodePolyline(route.overview_polyline.points) : [],
    };
  } catch {
    return null;
  }
}
