import { useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@/state/AuthContext";
import { useCurrentLocation } from "@/hooks/useLocation";
import { MapPicker } from "@/components/MapPicker";
import { AddressField } from "@/components/AddressField";
import { VehicleQuickSelect } from "@/components/VehicleQuickSelect";
import { supabase } from "@/lib/supabase";
import { estimatePrice, formatEuros } from "@/lib/pricing";
import type { Coordinates } from "@/types";

export default function RequestNowScreen() {
  const { profile } = useAuth();
  const { location, errorMsg } = useCurrentLocation();
  const [pickup, setPickup] = useState<Coordinates | null>(null);
  const [address, setAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoff, setDropoff] = useState<Coordinates | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const effectivePickup = pickup ?? location;
  const priceEstimate = effectivePickup ? estimatePrice(effectivePickup, dropoff) : null;

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
          dropoff_address: dropoffAddress.trim() || null,
          dropoff_lat: dropoff?.lat ?? null,
          dropoff_lng: dropoff?.lng ?? null,
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
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Pedí tu chofer de reemplazo</Text>
      <Text style={styles.subtitle}>
        Un chofer va hasta tu ubicación y maneja tu propio auto de vuelta a casa.
      </Text>

      <AddressField
        clientId={profile?.id ?? null}
        label="Punto de encuentro"
        value={address}
        onChangeText={setAddress}
        onSelectPlace={({ coords }) => setPickup(coords)}
        placeholder="Dirección (ej: Av. Providencia 1234, depto 5)"
      />

      <MapPicker
        label="Ajustar ubicación en el mapa"
        initialLocation={effectivePickup}
        onChange={setPickup}
      />

      <AddressField
        clientId={profile?.id ?? null}
        label="Destino (opcional)"
        value={dropoffAddress}
        onChangeText={setDropoffAddress}
        onSelectPlace={({ coords }) => setDropoff(coords)}
        placeholder="¿A dónde vas? (ej: Casa)"
      />

      <VehicleQuickSelect
        clientId={profile?.id ?? null}
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
  price: { fontSize: 16, fontWeight: "700", color: "#111827" },
  button: { backgroundColor: "#111827", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "700", fontSize: 15 },
});
