import { Linking } from "react-native";
import type { Coordinates } from "@/types";

/** Abre Google Maps con navegación turn-by-turn hasta el destino. */
export function openGoogleMapsNavigation(destination: Coordinates) {
  Linking.openURL(
    `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=driving`
  );
}

/** Abre Waze con navegación hasta el destino (si no está instalado, abre waze.com). */
export function openWazeNavigation(destination: Coordinates) {
  Linking.openURL(`https://waze.com/ul?ll=${destination.lat},${destination.lng}&navigate=yes`);
}
