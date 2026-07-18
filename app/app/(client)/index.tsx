import { useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/state/AuthContext";
import { useCurrentLocation } from "@/hooks/useLocation";
import { MapPicker } from "@/components/MapPicker";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { supabase } from "@/lib/supabase";
import { estimatePrice, formatEuros } from "@/lib/pricing";
import type { Coordinates } from "@/types";

export default function RequestNowScreen() {
  const { profile } = useAuth();
  const { location, errorMsg } = useCurrentLocation();
  const [pickup, setPickup] = useState<Coordinates | null>(null);
  const [address, setAddress] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const effectivePickup = pickup ?? location;
  const priceEstimate = effectivePickup ? estimatePrice(effectivePickup, null) : null;

  async function handleRequest() {
    if (!profile || !effectivePickup) return;
    if (!address.trim() || !vehicleInfo.trim()) {
      Alert.alert("Faltan datos", "Ingresá la dirección y los datos del vehículo.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          client_id: profile.id,
          status: "pending",
          pickup_address: address.trim(),
          pickup_lat: effectivePickup.lat,
          pickup_lng: effectivePickup.lng,
          vehicle_info: vehicleInfo.trim(),
          price_estimate: priceEstimate,
          scheduled_at: null,
        })
        .select("id")
        .single();

      if (error) throw error;
      router.push(`/(client)/trip/${data.id}`);
    } catch (err) {
      Alert.alert("No se pudo crear el pedido", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (errorMsg) {
    return (
      <View style={styles.center}>
        <Text>{errorMsg}</Text>
      </View>
    );
  }

  if (!effectivePickup) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Obteniendo tu ubicación…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Pedí tu chofer de reemplazo</Text>
      <Text style={styles.subtitle}>
        Un chofer va hasta tu ubicación y maneja tu propio auto de vuelta a casa.
      </Text>

      <AddressAutocomplete
        value={address}
        onChangeText={setAddress}
        onSelectPlace={({ coords }) => setPickup(coords)}
        placeholder="Dirección (ej: Av. Providencia 1234, depto 5)"
      />

      <MapPicker
        label="Ubicación de encuentro"
        initialLocation={effectivePickup}
        onChange={setPickup}
      />

      <TextInput
        style={styles.input}
        placeholder="Datos del vehículo (marca, modelo, patente)"
        value={vehicleInfo}
        onChangeText={setVehicleInfo}
      />

      {priceEstimate ? (
        <Text style={styles.price}>Tarifa estimada: {formatEuros(priceEstimate)}</Text>
      ) : null}

      <Pressable style={styles.button} onPress={handleRequest} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Pedir chofer ahora</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6B7280", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  price: { fontSize: 16, fontWeight: "700", color: "#111827" },
  button: { backgroundColor: "#111827", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "700", fontSize: 15 },
});
