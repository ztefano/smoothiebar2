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
import { DateTimeField } from "@/components/DateTimeField";
import { supabase } from "@/lib/supabase";
import { estimatePrice, formatEuros } from "@/lib/pricing";
import type { Coordinates } from "@/types";

export default function ScheduleScreen() {
  const { profile } = useAuth();
  const { location, errorMsg } = useCurrentLocation();
  const [pickup, setPickup] = useState<Coordinates | null>(null);
  const [address, setAddress] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [submitting, setSubmitting] = useState(false);

  const effectivePickup = pickup ?? location;
  const priceEstimate = effectivePickup ? estimatePrice(effectivePickup, null, scheduledAt) : null;

  async function handleSchedule() {
    if (!profile || !effectivePickup) return;
    if (!address.trim() || !vehicleInfo.trim()) {
      Alert.alert("Faltan datos", "Ingresá la dirección y los datos del vehículo.");
      return;
    }
    if (scheduledAt.getTime() < Date.now()) {
      Alert.alert("Fecha inválida", "Elegí una fecha/hora futura.");
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
          scheduled_at: scheduledAt.toISOString(),
        })
        .select("id")
        .single();

      if (error) throw error;
      Alert.alert("Listo", "Tu viaje quedó agendado. Te avisaremos cuando un chofer lo acepte.");
      router.push(`/(client)/trip/${data.id}`);
    } catch (err) {
      Alert.alert("No se pudo agendar", (err as Error).message);
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
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Agendar para más tarde</Text>

      <AddressAutocomplete
        value={address}
        onChangeText={setAddress}
        onSelectPlace={({ coords }) => setPickup(coords)}
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

      <DateTimeField
        label="Fecha y hora del servicio"
        value={scheduledAt}
        minimumDate={new Date()}
        onChange={setScheduledAt}
      />

      {priceEstimate ? (
        <Text style={styles.price}>Tarifa estimada: {formatEuros(priceEstimate)}</Text>
      ) : null}

      <Pressable style={styles.button} onPress={handleSchedule} disabled={submitting}>
        {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Agendar viaje</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: "#111827" },
  label: { fontSize: 14, fontWeight: "600", color: "#111827" },
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
