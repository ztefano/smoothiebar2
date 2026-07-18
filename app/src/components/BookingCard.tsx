import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Booking } from "@/types";
import { formatEuros } from "@/lib/pricing";

const STATUS_LABEL: Record<Booking["status"], string> = {
  pending: "Pendiente",
  accepted: "Aceptado",
  in_progress: "En curso",
  completed: "Completado",
  cancelled: "Cancelado",
};

interface BookingCardProps {
  booking: Booking;
  onPress?: () => void;
  actionLabel?: string;
}

export function BookingCard({ booking, onPress, actionLabel }: BookingCardProps) {
  const when = booking.scheduled_at
    ? new Date(booking.scheduled_at).toLocaleString("es-ES")
    : "Lo antes posible";

  return (
    <Pressable style={styles.card} onPress={onPress} disabled={!onPress}>
      <View style={styles.header}>
        <Text style={styles.address} numberOfLines={1}>
          {booking.pickup_address}
        </Text>
        <Text style={styles.status}>{STATUS_LABEL[booking.status]}</Text>
      </View>
      <Text style={styles.meta}>Vehículo: {booking.vehicle_info}</Text>
      <Text style={styles.meta}>Cuándo: {when}</Text>
      <Text style={styles.price}>{formatEuros(booking.price_estimate)}</Text>
      {onPress && actionLabel ? (
        <Text style={styles.action}>{actionLabel} →</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  address: { fontWeight: "700", fontSize: 15, color: "#111827", flexShrink: 1 },
  status: { fontSize: 12, fontWeight: "600", color: "#2563EB" },
  meta: { fontSize: 13, color: "#4B5563" },
  price: { fontSize: 15, fontWeight: "700", color: "#111827", marginTop: 4 },
  action: { fontSize: 13, fontWeight: "600", color: "#2563EB", marginTop: 6 },
});
