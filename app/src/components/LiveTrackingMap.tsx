import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import type { Coordinates } from "@/types";
import { estimateEtaMinutes, haversineDistanceKm } from "@/lib/distance";

interface LiveTrackingMapProps {
  pickup: Coordinates;
  driverLocation: Coordinates | null;
}

/** Mapa con el pin del cliente y el del chofer moviéndose en tiempo real. */
export function LiveTrackingMap({ pickup, driverLocation }: LiveTrackingMapProps) {
  const distanceKm = driverLocation
    ? haversineDistanceKm(driverLocation, pickup)
    : null;
  const etaMinutes = distanceKm !== null ? estimateEtaMinutes(distanceKm) : null;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: pickup.lat,
          longitude: pickup.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        <Marker
          coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
          title="Punto de encuentro"
          pinColor="#2563EB"
        />
        {driverLocation ? (
          <Marker
            coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
            title="Tu chofer"
            pinColor="#16A34A"
          />
        ) : null}
      </MapView>
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {driverLocation
            ? `Chofer a ${distanceKm!.toFixed(1)} km · ETA ~${etaMinutes} min`
            : "Esperando la ubicación del chofer…"}
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
});
