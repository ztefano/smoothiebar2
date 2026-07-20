import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useActiveDriverBooking } from "@/hooks/useActiveDriverBooking";
import { useBooking } from "@/hooks/useBooking";

interface IncomingTripAlertProps {
  driverId: string | null;
}

/** Ventana flotante a pantalla completa (como en Uber) que aparece en
 * cualquier pestaña del chofer apenas el admin le asigna un viaje nuevo,
 * sin depender de que abra la notificación push. */
export function IncomingTripAlert({ driverId }: IncomingTripAlertProps) {
  const bookingId = useActiveDriverBooking(driverId);
  const { booking } = useBooking(bookingId ?? null);
  const [visible, setVisible] = useState(false);
  const hasLoadedOnce = useRef(false);
  const prevBookingId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (bookingId === undefined) return;
    const wasEmpty = !prevBookingId.current;
    if (hasLoadedOnce.current && wasEmpty && bookingId) {
      setVisible(true);
    }
    hasLoadedOnce.current = true;
    prevBookingId.current = bookingId;
  }, [bookingId]);

  if (!visible || !booking) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => setVisible(false)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🚘</Text>
          <Text style={styles.title}>¡Recibiste un viaje!</Text>
          <Text style={styles.address}>{booking.pickup_address}</Text>
          <Text style={styles.meta}>Vehículo: {booking.vehicle_info}</Text>
          <Pressable
            style={styles.button}
            onPress={() => {
              setVisible(false);
              router.push(`/(driver)/trip/${booking.id}`);
            }}
          >
            <Text style={styles.buttonText}>Ver viaje</Text>
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
});
