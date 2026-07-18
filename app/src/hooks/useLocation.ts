import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import type { Coordinates } from "@/types";

interface UseLocationResult {
  location: Coordinates | null;
  errorMsg: string | null;
  permissionGranted: boolean;
}

/** Ubicación actual del dispositivo, una sola vez (permiso "en uso"). */
export function useCurrentLocation(): UseLocationResult {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Se necesita permiso de ubicación para continuar.");
        return;
      }
      setPermissionGranted(true);
      const position = await Location.getCurrentPositionAsync({});
      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    })().catch((err) => setErrorMsg(err.message));
  }, []);

  return { location, errorMsg, permissionGranted };
}

/**
 * Rastreo continuo en primer plano, usado por el chofer para publicar su
 * posición mientras el viaje está activo. El rastreo en segundo plano
 * (app minimizada) requiere un development build con EAS; ver docs/SETUP.md.
 */
export function useWatchLocation(
  enabled: boolean,
  onUpdate: (coords: Coordinates) => void
) {
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!enabled) {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      return;
    }

    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;

      subscriptionRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 15 },
        (position) => {
          onUpdate({ lat: position.coords.latitude, lng: position.coords.longitude });
        }
      );
    })();

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
