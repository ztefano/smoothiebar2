import type { Coordinates } from "@/types";

export interface PlacePrediction {
  placeId: string;
  description: string;
}

function randomSessionToken(): string {
  return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2)).join("-");
}

export function newSessionToken(): string {
  return randomSessionToken();
}

/** Sugerencias de direcciones a medida que el usuario escribe. */
export async function autocompleteAddress(
  query: string,
  sessionToken: string
): Promise<PlacePrediction[]> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || !query.trim()) return [];

  const params = new URLSearchParams({
    input: query,
    key: apiKey,
    sessiontoken: sessionToken,
    language: "es",
    components: "country:es",
  });

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`
    );
    const data = await response.json();
    if (data.status !== "OK") return [];

    return (data.predictions ?? []).map((p: { place_id: string; description: string }) => ({
      placeId: p.place_id,
      description: p.description,
    }));
  } catch {
    return [];
  }
}

/** Coordenadas de una sugerencia elegida. */
export async function getPlaceCoordinates(
  placeId: string,
  sessionToken: string
): Promise<Coordinates | null> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    place_id: placeId,
    key: apiKey,
    sessiontoken: sessionToken,
    fields: "geometry",
  });

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`
    );
    const data = await response.json();
    const location = data.result?.geometry?.location;
    if (data.status !== "OK" || !location) return null;

    return { lat: location.lat, lng: location.lng };
  } catch {
    return null;
  }
}
