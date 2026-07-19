import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, type LatLng, type Region } from "react-native-maps";
import type { Coordinates } from "@/types";

interface MapPickerProps {
  initialLocation: Coordinates;
  onChange: (coords: Coordinates) => void;
  label?: string;
  /** true cuando el origen es el GPS: se muestra el punto azul de
   * ubicación real, sin pin para arrastrar (no tiene sentido "corregir"
   * dónde estás parado de verdad). */
  showLiveLocation?: boolean;
}

/** Mapa donde el usuario arrastra un pin para elegir origen o destino, o
 * muestra el punto azul de ubicación real cuando el origen es el GPS. */
export function MapPicker({ initialLocation, onChange, label, showLiveLocation }: MapPickerProps) {
  const mapRef = useRef<MapView>(null);
  const [marker, setMarker] = useState<LatLng>({
    latitude: initialLocation.lat,
    longitude: initialLocation.lng,
  });

  // Si initialLocation cambia desde afuera (ej: se tocó "Mi ubicación
  // actual" o se eligió una dirección guardada), el mapa tiene que seguirlo
  // — si no, el pin se queda pegado en la posición con la que se montó.
  useEffect(() => {
    const next = { latitude: initialLocation.lat, longitude: initialLocation.lng };
    setMarker(next);
    mapRef.current?.animateToRegion({ ...next, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocation.lat, initialLocation.lng]);

  const region: Region = {
    ...marker,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={showLiveLocation}
        onPress={
          showLiveLocation
            ? undefined
            : (e) => {
                const coords = e.nativeEvent.coordinate;
                setMarker(coords);
                onChange({ lat: coords.latitude, lng: coords.longitude });
              }
        }
      >
        {showLiveLocation ? null : (
          <Marker
            coordinate={marker}
            draggable
            onDragEnd={(e) => {
              const coords = e.nativeEvent.coordinate;
              setMarker(coords);
              onChange({ lat: coords.latitude, lng: coords.longitude });
            }}
          />
        )}
      </MapView>
      <Text style={styles.hint}>
        {showLiveLocation
          ? "Se está usando tu ubicación real (GPS). Elegí una dirección para poder ajustarla a mano."
          : "Tocá el mapa o arrastrá el pin para ajustar la ubicación"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontWeight: "600", fontSize: 14, color: "#111827" },
  map: { width: "100%", height: 220, borderRadius: 12 },
  hint: { fontSize: 12, color: "#6B7280" },
});
