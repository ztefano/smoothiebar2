import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { getPayment } from "@/lib/payments";
import type { PaymentStatus } from "@/types";

const STATUS_COPY: Record<PaymentStatus, { title: string; color: string }> = {
  approved: { title: "¡Pago aprobado!", color: "#16A34A" },
  pending: { title: "Pago pendiente de confirmación", color: "#D97706" },
  rejected: { title: "El pago fue rechazado", color: "#DC2626" },
};

export default function PaymentResultScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;
    // La notificación (webhook) de Redsys actualiza el estado en el
    // servidor; acá solo lo consultamos (puede tardar unos segundos).
    getPayment(bookingId)
      .then((data) => setStatus(data?.status ?? "pending"))
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const copy = STATUS_COPY[status ?? "pending"];

  return (
    <View style={styles.center}>
      <Text style={[styles.title, { color: copy.color }]}>{copy.title}</Text>
      <Pressable style={styles.button} onPress={() => router.replace(`/(client)/trip/${bookingId}`)}>
        <Text style={styles.buttonText}>Volver al viaje</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  title: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  button: { backgroundColor: "#111827", borderRadius: 10, paddingVertical: 14, paddingHorizontal: 24 },
  buttonText: { color: "white", fontWeight: "700" },
});
