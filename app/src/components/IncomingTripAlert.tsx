import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useActiveDriverBooking } from "@/hooks/useActiveDriverBooking";
import { useBooking } from "@/hooks/useBooking";

interface IncomingTripAlertProps {
  driverId: string | null;
}

// Reservas cuya burbuja ya se mostró y descartó en esta sesión, para no
// repetirla una y otra vez. Se resetea al reabrir la app (a propósito: así
// vuelve a avisar cuando el chofer abre la app con un viaje pendiente).
const acknowledged = new Set<string>();

/** Ventana flotante a pantalla completa (como en Uber) que aparece cuando el
 * chofer tiene un viaje asignado sin iniciar — al asignárselo en vivo o al
 * abrir la app —, sin depender de que abra la notificación push. */
export function IncomingTripAlert({ driverId }: IncomingTripAlertProps) {
  const bookingId = useActiveDriverBooking(driverId);
  const { booking } = useBooking(bookingId ?? null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    // Cuando aparece una reserva asignada (accepted) que todavía no se
    // reconoció en esta sesión, se muestra la burbuja.
    if (booking && booking.status === "accepted" && !acknowledged.has(booking.id)) {
      setDismissed(null);
    }
  }, [booking?.id, booking?.status]);

  const visible =
    !!booking &&
    booking.status === "accepted" &&
    !acknowledged.has(booking.id) &&
    dismissed !== booking.id;

  function close() {
    if (booking) {
      acknowledged.add(booking.id);
      setDismissed(booking.id);
    }
  }

  if (!visible || !booking) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🚘</Text>
          <Text style={styles.title}>¡Recibiste un viaje!</Text>
          <Text style={styles.address}>{booking.pickup_address}</Text>
          <Text style={styles.meta}>Vehículo: {booking.vehicle_info}</Text>
          <Pressable
            style={styles.button}
            onPress={() => {
              const id = booking.id;
              close();
              router.push(`/(driver)/trip/${id}`);
            }}
          >
            <Text style={styles.buttonText}>Ver viaje</Text>
          </Pressable>
          <Pressable style={styles.laterButton} onPress={close}>
            <Text style={styles.laterText}>Más tarde</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  card: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 8,
  },
  emoji: { fontSize: 48 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827" },
  address: { fontSize: 15, color: "#374151", textAlign: "center" },
  meta: { fontSize: 13, color: "#6B7280", marginBottom: 8 },
  button: {
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginTop: 8,
  },
  buttonText: { color: "white", fontWeight: "800", fontSize: 16 },
  laterButton: { paddingVertical: 10 },
  laterText: { color: "#6B7280", fontWeight: "600", fontSize: 14 },
});
