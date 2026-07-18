import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, type LatLng, type Region } from "react-native-maps";
import type { Coordinates } from "@/types";

interface MapPickerProps {
  initialLocation: Coordinates;
  onChange: (coords: Coordinates) => void;
  label?: string;
}

/** Mapa donde el usuario arrastra un pin para elegir origen o destino. */
export function MapPicker({ initialLocation, onChange, label }: MapPickerProps) {
  const [marker, setMarker] = useState<LatLng>({
    latitude: initialLocation.lat,
    longitude: initialLocation.lng,
  });

  const region: Region = {
    ...marker,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <MapView
        style={styles.map}
        initialRegion={region}
        onPress={(e) => {
          const coords = e.nativeEvent.coordinate;
          setMarker(coords);
          onChange({ lat: coords.latitude, lng: coords.longitude });
        }}
      >
        <Marker
          coordinate={marker}
          draggable
          onDragEnd={(e) => {
            const coords = e.nativeEvent.coordinate;
            setMarker(coords);
            onChange({ lat: coords.latitude, lng: coords.longitude });
          }}
        />
      </MapView>
      <Text style={styles.hint}>Tocá el mapa o arrastrá el pin para ajustar la ubicación</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontWeight: "600", fontSize: 14, color: "#111827" },
  map: { width: "100%", height: 220, borderRadius: 12 },
  hint: { fontSize: 12, color: "#6B7280" },
});
