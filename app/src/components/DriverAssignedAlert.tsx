import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useActiveClientBooking } from "@/hooks/useActiveClientBooking";
import type { BookingStatus } from "@/types";

interface DriverAssignedAlertProps {
  clientId: string | null;
}

/** Ventana flotante a pantalla completa que aparece apenas el admin le
 * asigna un chofer al cliente, en cualquier pestaña, sin depender de que
 * abra la notificación push. */
export function DriverAssignedAlert({ clientId }: DriverAssignedAlertProps) {
  const booking = useActiveClientBooking(clientId);
  const [visible, setVisible] = useState(false);
  const hasLoadedOnce = useRef(false);
  const prevStatus = useRef<BookingStatus | null | undefined>(undefined);
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (booking === undefined) return;
    const prev = prevStatus.current;
    if (hasLoadedOnce.current && booking?.status === "accepted" && prev !== "accepted") {
      setBookingId(booking.id);
      setVisible(true);
    }
    hasLoadedOnce.current = true;
    prevStatus.current = booking?.status ?? null;
  }, [booking]);

  if (!visible || !bookingId) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => setVisible(false)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🚘</Text>
          <Text style={styles.title}>¡Se te asignó un chofer!</Text>
          <Text style={styles.subtitle}>Ya está en camino. Te vamos a avisar cuando llegue.</Text>
          <Pressable
            style={styles.button}
            onPress={() => {
              setVisible(false);
              router.push(`/(client)/trip/${bookingId}`);
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
  subtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 8 },
  button: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginTop: 8,
  },
  buttonText: { color: "white", fontWeight: "800", fontSize: 16 },
});
