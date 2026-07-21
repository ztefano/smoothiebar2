import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import type { Coordinates } from "@/types";
import { useDirectionsEta } from "@/hooks/useDirectionsEta";

interface LiveTrackingMapProps {
  /** Punto al que se navega en esta etapa (punto de encuentro o destino final). */
  target: Coordinates;
  targetLabel: string;
  driverLocation: Coordinates | null;
  /** true en la pantalla del propio chofer: usa el punto azul nativo de GPS. */
  showsOwnLocation?: boolean;
}

/** Mapa con navegación: ruta real hacia el objetivo vigente (punto de
 * encuentro o destino final) y la posición del chofer en tiempo real. */
export function LiveTrackingMap({
  target,
  targetLabel,
  driverLocation,
  showsOwnLocation,
}: LiveTrackingMapProps) {
  const eta = useDirectionsEta(target, driverLocation);

  // El punto azul nativo (showsUserLocation) SOLO se puede activar cuando el
  // permiso de ubicación ya está concedido. Activarlo antes hace que Android
  // lance una excepción de seguridad y la app se cierre por completo. Por eso
  // esperamos a confirmar el permiso antes de habilitarlo.
  const [locationGranted, setLocationGranted] = useState(false);

  useEffect(() => {
    if (!showsOwnLocation) return;
    let cancelled = false;
    (async () => {
      const current = await Location.getForegroundPermissionsAsync();
      let granted = current.status === "granted";
      if (!granted && current.canAskAgain) {
        const asked = await Location.requestForegroundPermissionsAsync();
        granted = asked.status === "granted";
      }
      if (!cancelled) setLocationGranted(granted);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [showsOwnLocation]);

  const showBlueDot = !!showsOwnLocation && locationGranted;

  const initialRegion = {
    latitude: driverLocation?.lat ?? target.lat,
    longitude: driverLocation?.lng ?? target.lng,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={showBlueDot}
        followsUserLocation={showBlueDot}
        showsMyLocationButton={false}
      >
        <Marker
          coordinate={{ latitude: target.lat, longitude: target.lng }}
          title={targetLabel}
          pinColor="#2563EB"
        />

        {!showsOwnLocation && driverLocation ? (
          <Marker
            coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
            title="Tu chofer"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.driverDotOuter}>
              <View style={styles.driverDotInner} />
            </View>
          </Marker>
        ) : null}

        {eta && eta.polyline.length > 1 ? (
          <Polyline
            coordinates={eta.polyline.map((p) => ({ latitude: p.lat, longitude: p.lng }))}
            strokeColor="#2563EB"
            strokeWidth={4}
          />
        ) : null}
      </MapView>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {eta
            ? `${targetLabel}: ${eta.distanceKm.toFixed(1)} km · ETA ~${eta.etaMinutes} min`
            : "Esperando ubicación del chofer…"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  statusBar: {
    padding: 12,
    backgroundColor: "#111827",
  },
  statusText: { color: "white", textAlign: "center", fontWeight: "600" },
  driverDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(37,99,235,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  driverDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#2563EB",
    borderWidth: 2,
    borderColor: "white",
  },
});
