import { useLocalSearchParams, router } from "expo-router";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useBooking } from "@/hooks/useBooking";
import { useDriverLocation } from "@/hooks/useDriverLocation";
import { usePayment } from "@/hooks/usePayment";
import { LiveTrackingMap } from "@/components/LiveTrackingMap";
import { requestCashPayment } from "@/lib/payments";
import { formatEuros } from "@/lib/pricing";

const STATUS_COPY: Record<string, string> = {
  pending: "Buscando un chofer disponible…",
  accepted: "Un chofer aceptó tu viaje y está en camino.",
  in_progress: "Tu chofer está manejando tu vehículo.",
  completed: "Viaje completado.",
  cancelled: "Este viaje fue cancelado.",
};

export default function ClientTripScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { booking, loading } = useBooking(bookingId ?? null);
  const { payment, loading: paymentLoading } = usePayment(booking ? booking.id : null);
  const driverLocation = useDriverLocation(
    booking && booking.status !== "pending" ? booking.id : null
  );

  if (loading || !booking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const showMap = booking.status === "accepted" || booking.status === "in_progress";
  const isPaid = payment?.status === "approved";

  function statusText() {
    if (booking!.status === "pending" && !paymentLoading) {
      return isPaid
        ? "Pago recibido. Estamos por confirmar tu chofer."
        : "Confirmá el pago para asegurar tu reserva.";
    }
    return STATUS_COPY[booking!.status];
  }

  async function handleCashPayment() {
    if (!booking) return;
    try {
      await requestCashPayment(booking.id, booking.price_estimate);
      Alert.alert("Listo", "Avisale al chofer que vas a pagar en efectivo. Él confirmará el cobro en la app.");
    } catch (err) {
      Alert.alert("No se pudo registrar el pago en efectivo", (err as Error).message);
    }
  }

  function renderPaymentSection() {
    if (booking!.status === "cancelled") return null;
    if (paymentLoading) return <ActivityIndicator style={{ marginTop: 8 }} />;

    if (!payment) {
      return (
        <View style={styles.paymentOptions}>
          <Pressable
            style={styles.payButton}
            onPress={() => router.push(`/payment/checkout?bookingId=${booking!.id}`)}
          >
            <Text style={styles.payButtonText}>Pagar con tarjeta o Bizum</Text>
          </Pressable>
          <Pressable style={[styles.payButton, styles.cashButton]} onPress={handleCashPayment}>
            <Text style={styles.payButtonText}>Pagar en efectivo</Text>
          </Pressable>
        </View>
      );
    }

    if (payment.status === "approved") {
      return <Text style={styles.paid}>Pago confirmado ✓ ({payment.provider === "cash" ? "efectivo" : "tarjeta/Bizum"})</Text>;
    }

    if (payment.provider === "cash" && payment.status === "pending") {
      return <Text style={styles.pending}>Esperando que el chofer confirme el cobro en efectivo…</Text>;
    }

    return <Text style={styles.pending}>Pago en proceso…</Text>;
  }

  return (
    <View style={styles.container}>
      {showMap ? (
        <LiveTrackingMap
          pickup={{ lat: booking.pickup_lat, lng: booking.pickup_lng }}
          driverLocation={driverLocation}
        />
      ) : (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.statusText}>{statusText()}</Text>
        <Text style={styles.meta}>{booking.pickup_address}</Text>
        <Text style={styles.meta}>Vehículo: {booking.vehicle_info}</Text>
        <Text style={styles.price}>{formatEuros(booking.price_estimate)}</Text>

        {renderPaymentSection()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  footer: { padding: 20, gap: 6, backgroundColor: "white" },
  statusText: { fontSize: 16, fontWeight: "700", color: "#111827" },
  meta: { fontSize: 13, color: "#6B7280" },
  price: { fontSize: 18, fontWeight: "800", color: "#111827", marginTop: 4 },
  paymentOptions: { gap: 8, marginTop: 8 },
  payButton: { backgroundColor: "#16A34A", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  cashButton: { backgroundColor: "#D97706" },
  payButtonText: { color: "white", fontWeight: "700", fontSize: 15 },
  paid: { marginTop: 10, fontWeight: "700", color: "#16A34A" },
  pending: { marginTop: 10, fontWeight: "600", color: "#D97706" },
});
