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
import { VehicleQuickSelect, type VehicleParts } from "@/components/VehicleQuickSelect";
import { DateTimeField } from "@/components/DateTimeField";
import { supabase } from "@/lib/supabase";
import { estimatePrice, formatEuros } from "@/lib/pricing";
import { formatVehicleParts } from "@/hooks/useVehicles";
import { useBookedTimes } from "@/hooks/useBookedTimes";
import { useBusinessHours, hoursForDate } from "@/hooks/useBusinessHours";
import { useActiveDriverCount } from "@/hooks/useActiveDriverCount";
import type { Coordinates } from "@/types";

const MIN_LEAD_TIME_MS = 2 * 60 * 60 * 1000; // los choferes se piden con 2h de anticipación mínima

export default function RequestChoferScreen() {
  const { profile } = useAuth();
  const { location, errorMsg } = useCurrentLocation();
  const [pickup, setPickup] = useState<Coordinates | null>(null);
  const [address, setAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoff, setDropoff] = useState<Coordinates | null>(null);
  const [vehicle, setVehicle] = useState<VehicleParts>({ brand: "", model: "", plate: "" });
  const [scheduledAt, setScheduledAt] = useState(() => new Date(Date.now() + MIN_LEAD_TIME_MS));
  const [submitting, setSubmitting] = useState(false);

  const effectivePickup = pickup ?? location;
  const minimumDate = new Date(Date.now() + MIN_LEAD_TIME_MS);
  const priceEstimate = effectivePickup
    ? estimatePrice(effectivePickup, dropoff, scheduledAt)
    : null;
  const vehicleInfo = formatVehicleParts(vehicle.brand, vehicle.model, vehicle.plate);
  const bookedTimes = useBookedTimes(scheduledAt);
  const { hours: businessHours } = useBusinessHours();
  const activeDriverCount = useActiveDriverCount();

  async function handleRequest() {
    if (!profile || !effectivePickup) return;
    if (!address.trim() || !dropoffAddress.trim() || !dropoff || !vehicleInfo) {
      Alert.alert("Faltan datos", "Ingresá el punto de encuentro, el destino y los datos del vehículo.");
      return;
    }
    if (scheduledAt.getTime() < minimumDate.getTime()) {
      Alert.alert(
        "Fecha inválida",
        "Los choferes se piden con al menos 2 horas de anticipación. Elegí un horario más adelante."
      );
      return;
    }
    const dayHours = hoursForDate(businessHours, scheduledAt);
    if (!dayHours?.is_open) {
      Alert.alert("Horario no disponible", "Ese día no trabajamos. Elegí otra fecha.");
      return;
    }
    const bookedAtSlot = bookedTimes.filter(
      (t) => Math.abs(t.getTime() - scheduledAt.getTime()) < 30 * 60 * 1000
    ).length;
    if (activeDriverCount <= 0 || bookedAtSlot >= activeDriverCount) {
      Alert.alert(
        "Horario completo",
        "Ese horario ya no tiene choferes disponibles. Elegí otro horario."
      );
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
          vehicle_info: vehicleInfo,
          price_estimate: priceEstimate,
          scheduled_at: scheduledAt.toISOString(),
        })
        .select("id")
        .single();

      if (error) throw error;
      Alert.alert("Listo", "Tu pedido quedó registrado. Te avisaremos cuando un chofer lo acepte.");
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
        Un chofer va hasta tu ubicación y maneja tu propio auto de vuelta a casa. Se piden con al
        menos 2 horas de anticipación.
      </Text>

      <AddressField
        clientId={profile?.id ?? null}
        label="Punto de encuentro"
        value={address}
        onChangeText={setAddress}
        onSelectPlace={({ coords }) => setPickup(coords)}
        placeholder="Dirección (ej: Av. Providencia 1234, depto 5)"
        currentLocation={location}
      />

      <MapPicker
        label="Ajustar ubicación en el mapa"
        initialLocation={effectivePickup}
        onChange={setPickup}
      />

      <AddressField
        clientId={profile?.id ?? null}
        label="Destino"
        value={dropoffAddress}
        onChangeText={setDropoffAddress}
        onSelectPlace={({ coords }) => setDropoff(coords)}
        placeholder="¿A dónde vas? (ej: Casa)"
      />

      <VehicleQuickSelect clientId={profile?.id ?? null} value={vehicle} onChange={setVehicle} />

      <DateTimeField
        label="Fecha y hora del servicio"
        value={scheduledAt}
        minimumDate={minimumDate}
        bookedTimes={bookedTimes}
        activeDriverCount={activeDriverCount}
        businessHours={businessHours}
        onChange={setScheduledAt}
      />

      {priceEstimate ? (
        <Text style={styles.price}>Tarifa estimada: {formatEuros(priceEstimate)}</Text>
      ) : null}

      <Pressable style={styles.button} onPress={handleRequest} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Pedir chofer</Text>
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
