import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useActiveClientBooking } from "@/hooks/useActiveClientBooking";

interface DriverAssignedAlertProps {
  clientId: string | null;
}

const acknowledged = new Set<string>();

/** Ventana flotante a pantalla completa que aparece cuando al cliente le
 * asignaron un chofer (viaje en estado accepted) — al asignárselo en vivo o
 * al abrir la app —, sin depender de la notificación push. */
export function DriverAssignedAlert({ clientId }: DriverAssignedAlertProps) {
  const booking = useActiveClientBooking(clientId);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
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
          <Text style={styles.title}>¡Se te asignó un chofer!</Text>
          <Text style={styles.subtitle}>Ya está en camino. Te vamos a avisar cuando llegue.</Text>
          <Pressable
            style={styles.button}
            onPress={() => {
              const id = booking.id;
              close();
              router.push(`/(client)/trip/${id}`);
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
  subtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 8 },
  button: {
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginTop: 8,
  },
  buttonText: { color: "white", fontWeight: "800", fontSize: 16 },
  laterButton: { paddingVertical: 10 },
  laterText: { color: "#6B7280", fontWeight: "600", fontSize: 14 },
});
