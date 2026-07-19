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
import { estimatePrice, applyCashDiscount, formatEuros } from "@/lib/pricing";
import { formatVehicleParts } from "@/hooks/useVehicles";
import { useBookedTimes } from "@/hooks/useBookedTimes";
import { useBusinessHours, hoursForDate } from "@/hooks/useBusinessHours";
import { useActiveDriverCount } from "@/hooks/useActiveDriverCount";
import { usePricingConfig } from "@/hooks/usePricingConfig";
import { requestCashPayment } from "@/lib/payments";
import { sendPushToUsers } from "@/lib/pushSend";
import { MIN_SERVICE_MS } from "@/lib/scheduling";
import type { Coordinates } from "@/types";

const MIN_LEAD_TIME_MS = 2 * 60 * 60 * 1000; // los choferes se piden con 2h de anticipación mínima

export default function RequestChoferScreen() {
  const { profile } = useAuth();
  const { location, errorMsg } = useCurrentLocation();
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [pickup, setPickup] = useState<Coordinates | null>(null);
  const [pickupSource, setPickupSource] = useState<"current_location" | "manual">("current_location");
  const [address, setAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoff, setDropoff] = useState<Coordinates | null>(null);
  const [vehicle, setVehicle] = useState<VehicleParts>({ brand: "", model: "", plate: "" });
  const [scheduledAt, setScheduledAt] = useState(() => new Date(Date.now() + MIN_LEAD_TIME_MS));
  const [submitting, setSubmitting] = useState(false);

  const effectivePickup = pickup ?? location;
  const minimumDate = new Date(Date.now() + MIN_LEAD_TIME_MS);
  const { config: pricingConfig } = usePricingConfig();
  const priceEstimate =
    effectivePickup && pricingConfig ? estimatePrice(effectivePickup, dropoff, pricingConfig) : null;
  const cashPrice =
    priceEstimate !== null && pricingConfig ? applyCashDiscount(priceEstimate, pricingConfig) : null;
  const vehicleInfo = formatVehicleParts(vehicle.brand, vehicle.model, vehicle.plate);
  const { times: bookedTimes, loading: bookedTimesLoading } = useBookedTimes(scheduledAt);
  const { hours: businessHours } = useBusinessHours();
  const activeDriverCount = useActiveDriverCount();

  function validate(): boolean {
    if (!effectivePickup) return false;
    if (priceEstimate === null) {
      Alert.alert(
        "No se pudo calcular la tarifa",
        "Probá de nuevo en unos segundos. Si el problema sigue, avisale al administrador."
      );
      return false;
    }
    if (bookedTimesLoading) {
      Alert.alert("Un momento", "Todavía estamos cargando la disponibilidad de ese día. Probá de nuevo.");
      return false;
    }
    if (!address.trim() || !dropoffAddress.trim() || !dropoff || !vehicleInfo) {
      Alert.alert("Faltan datos", "Ingresá el punto de encuentro, el destino y los datos del vehículo.");
      return false;
    }
    if (scheduledAt.getTime() < minimumDate.getTime()) {
      Alert.alert(
        "Fecha inválida",
        "Los choferes se piden con al menos 2 horas de anticipación. Elegí un horario más adelante."
      );
      return false;
    }
    const dayHours = hoursForDate(businessHours, scheduledAt);
    if (!dayHours?.is_open) {
      Alert.alert("Horario no disponible", "Ese día no trabajamos. Elegí otra fecha.");
      return false;
    }
    const bookedAtSlot = bookedTimes.filter(
      (t) =>
        scheduledAt.getTime() >= t.getTime() && scheduledAt.getTime() < t.getTime() + MIN_SERVICE_MS
    ).length;
    if (activeDriverCount <= 0 || bookedAtSlot >= activeDriverCount) {
      Alert.alert("Horario completo", "Ese horario ya no tiene choferes disponibles. Elegí otro horario.");
      return false;
    }
    return true;
  }

  function handleReview() {
    if (validate()) setStep("confirm");
  }

  async function createBooking(finalPrice: number): Promise<string> {
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        client_id: profile!.id,
        status: "pending",
        pickup_address: address.trim(),
        pickup_lat: effectivePickup!.lat,
        pickup_lng: effectivePickup!.lng,
        dropoff_address: dropoffAddress.trim() || null,
        dropoff_lat: dropoff?.lat ?? null,
        dropoff_lng: dropoff?.lng ?? null,
        vehicle_info: vehicleInfo,
        price_estimate: finalPrice,
        scheduled_at: scheduledAt.toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;
    return data.id as string;
  }

  function notifyActiveDrivers() {
    supabase
      .from("profiles")
      .select("id")
      .eq("role", "driver")
      .eq("is_active", true)
      .then(({ data: drivers }) => {
        const ids = (drivers ?? []).map((d) => d.id as string);
        sendPushToUsers(
          ids,
          "Nueva solicitud",
          `${address.trim()} → ${dropoffAddress.trim()} · ${scheduledAt.toLocaleString("es-ES")}`
        );
      });
  }

  async function handleConfirmCard() {
    if (!profile || priceEstimate === null) return;
    setSubmitting(true);
    try {
      const bookingId = await createBooking(priceEstimate);
      notifyActiveDrivers();
      router.replace(`/payment/checkout?bookingId=${bookingId}`);
    } catch (err) {
      Alert.alert("No se pudo crear la reserva", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmCash() {
    if (!profile || cashPrice === null) return;
    setSubmitting(true);
    try {
      const bookingId = await createBooking(cashPrice);
      notifyActiveDrivers();
      await requestCashPayment(bookingId, cashPrice);
      Alert.alert(
        "Reserva confirmada",
        "Vas a pagar en efectivo al chofer. Te avisaremos apenas quede confirmado."
      );
      router.replace(`/(client)/trip/${bookingId}`);
    } catch (err) {
      Alert.alert("No se pudo crear la reserva", (err as Error).message);
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

  if (step === "confirm") {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Confirmá tu pedido</Text>
        <Text style={styles.subtitle}>Revisá los datos antes de pagar. Una vez que reservás, el horario queda bloqueado para vos.</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Punto de encuentro</Text>
          <Text style={styles.summaryValue}>{address}</Text>

          <Text style={styles.summaryLabel}>Destino</Text>
          <Text style={styles.summaryValue}>{dropoffAddress}</Text>

          <Text style={styles.summaryLabel}>Fecha y hora</Text>
          <Text style={styles.summaryValue}>{scheduledAt.toLocaleString("es-ES")}</Text>

          <Text style={styles.summaryLabel}>Vehículo</Text>
          <Text style={styles.summaryValue}>{vehicleInfo}</Text>
        </View>

        <Pressable style={styles.button} onPress={handleConfirmCard} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <View style={styles.payOptionInner}>
              <Text style={styles.buttonText}>Tarjeta o Bizum</Text>
              <Text style={styles.buttonPrice}>
                {priceEstimate !== null ? formatEuros(priceEstimate) : "—"}
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable style={[styles.button, styles.cashButton]} onPress={handleConfirmCash} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <View style={styles.payOptionInner}>
              <Text style={styles.buttonText}>
                Efectivo ({Math.round((pricingConfig?.cash_discount_rate ?? 0) * 100)}% dto.)
              </Text>
              <Text style={styles.buttonPrice}>{cashPrice !== null ? formatEuros(cashPrice) : "—"}</Text>
            </View>
          )}
        </Pressable>

        <Pressable style={styles.backButton} onPress={() => setStep("form")} disabled={submitting}>
          <Text style={styles.backButtonText}>Volver a editar</Text>
        </Pressable>
      </ScrollView>
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
        onSelectPlace={({ coords, source }) => {
          setPickup(coords);
          setPickupSource(source);
        }}
        placeholder="Dirección (ej: Av. Providencia 1234, depto 5)"
        currentLocation={location}
      />

      <MapPicker
        label="Ajustar ubicación en el mapa"
        initialLocation={effectivePickup}
        onChange={(coords) => {
          setPickup(coords);
          setPickupSource("manual");
        }}
        showLiveLocation={pickupSource === "current_location"}
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
        bookedTimesLoading={bookedTimesLoading}
        activeDriverCount={activeDriverCount}
        businessHours={businessHours}
        onChange={setScheduledAt}
      />

      {priceEstimate ? (
        <Text style={styles.price}>Tarifa estimada: {formatEuros(priceEstimate)}</Text>
      ) : null}

      <Pressable style={styles.button} onPress={handleReview}>
        <Text style={styles.buttonText}>Revisar y confirmar</Text>
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
  cashButton: { backgroundColor: "#D97706" },
  buttonText: { color: "white", fontWeight: "700", fontSize: 15 },
  payOptionInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  buttonPrice: { color: "white", fontWeight: "800", fontSize: 15 },
  backButton: { alignItems: "center", paddingVertical: 10 },
  backButtonText: { color: "#6B7280", fontWeight: "600", fontSize: 14 },
  summaryCard: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    gap: 4,
  },
  summaryLabel: { fontSize: 12, color: "#6B7280", marginTop: 8 },
  summaryValue: { fontSize: 15, fontWeight: "600", color: "#111827" },
});
