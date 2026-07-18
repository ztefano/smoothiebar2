import { useLocalSearchParams, router } from "expo-router";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { useAuth } from "@/state/AuthContext";
import { useBooking } from "@/hooks/useBooking";
import { useWatchLocation } from "@/hooks/useLocation";
import { publishDriverLocation } from "@/hooks/useDriverLocation";
import { usePayment } from "@/hooks/usePayment";
import { LiveTrackingMap } from "@/components/LiveTrackingMap";
import { confirmCashPayment } from "@/lib/payments";
import { formatEuros } from "@/lib/pricing";
import type { Coordinates } from "@/types";

export default function DriverTripScreen() {
  const { profile } = useAuth();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { booking, loading, updateStatus } = useBooking(bookingId ?? null);
  const { payment } = usePayment(booking?.status === "completed" ? booking.id : null);
  const [myLocation, setMyLocation] = useState<Coordinates | null>(null);

  const isSharingLocation = booking?.status === "accepted" || booking?.status === "in_progress";

  useWatchLocation(!!isSharingLocation, (coords) => {
    setMyLocation(coords);
    if (booking && profile) {
      publishDriverLocation(booking.id, profile.id, coords).catch(() => {});
    }
  });

  if (loading || !booking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  async function handleStart() {
    try {
      await updateStatus("in_progress");
    } catch (err) {
      Alert.alert("Error", (err as Error).message);
    }
  }

  async function handleComplete() {
    try {
      await updateStatus("completed");
    } catch (err) {
      Alert.alert("Error", (err as Error).message);
    }
  }

  async function handleConfirmCash() {
    if (!payment) return;
    try {
      await confirmCashPayment(payment.id);
    } catch (err) {
      Alert.alert("No se pudo confirmar el cobro", (err as Error).message);
    }
  }

  function renderPaymentStatus() {
    if (booking!.status !== "completed") return null;

    if (!payment) {
      return <Text style={styles.pending}>Esperando que el cliente elija cómo pagar…</Text>;
    }

    if (payment.status === "approved") {
      return (
        <Text style={styles.doneText}>
          Pago confirmado ✓ ({payment.provider === "cash" ? "efectivo" : "tarjeta/Bizum"})
        </Text>
      );
    }

    if (payment.provider === "cash") {
      return (
        <Pressable style={[styles.button, styles.completeButton]} onPress={handleConfirmCash}>
          <Text style={styles.buttonText}>Confirmar efectivo recibido</Text>
        </Pressable>
      );
    }

    return <Text style={styles.pending}>El cliente está pagando con tarjeta/Bizum…</Text>;
  }

  return (
    <View style={styles.container}>
      <LiveTrackingMap
        pickup={{ lat: booking.pickup_lat, lng: booking.pickup_lng }}
        driverLocation={myLocation}
      />

      <View style={styles.footer}>
        <Text style={styles.address}>{booking.pickup_address}</Text>
        <Text style={styles.meta}>Vehículo: {booking.vehicle_info}</Text>
        <Text style={styles.price}>{formatEuros(booking.price_estimate)}</Text>

        {booking.status === "accepted" ? (
          <Pressable style={styles.button} onPress={handleStart}>
            <Text style={styles.buttonText}>Iniciar viaje</Text>
          </Pressable>
        ) : null}

        {booking.status === "in_progress" ? (
          <Pressable style={[styles.button, styles.completeButton]} onPress={handleComplete}>
            <Text style={styles.buttonText}>Finalizar viaje</Text>
          </Pressable>
        ) : null}

        {renderPaymentStatus()}

        {booking.status === "completed" && payment?.status === "approved" ? (
          <Pressable style={styles.secondaryButton} onPress={() => router.replace("/(driver)/requests")}>
            <Text style={styles.secondaryButtonText}>Volver a solicitudes</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  footer: { padding: 20, gap: 6, backgroundColor: "white" },
  address: { fontSize: 16, fontWeight: "700", color: "#111827" },
  meta: { fontSize: 13, color: "#6B7280" },
  price: { fontSize: 18, fontWeight: "800", color: "#111827", marginTop: 4 },
  button: { backgroundColor: "#111827", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 10 },
  completeButton: { backgroundColor: "#16A34A" },
  buttonText: { color: "white", fontWeight: "700", fontSize: 15 },
  doneText: { marginTop: 10, fontWeight: "700", color: "#16A34A" },
  pending: { marginTop: 10, fontWeight: "600", color: "#D97706" },
  secondaryButton: { marginTop: 10, alignItems: "center", paddingVertical: 10 },
  secondaryButtonText: { color: "#2563EB", fontWeight: "600" },
});
