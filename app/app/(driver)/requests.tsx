import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useAuth } from "@/state/AuthContext";
import { usePendingBookings } from "@/hooks/useBooking";
import { useDrivers } from "@/hooks/useDrivers";
import { BookingCard } from "@/components/BookingCard";
import { DriverAssignModal } from "@/components/DriverAssignModal";
import { supabase } from "@/lib/supabase";
import { DateTimeField } from "@/components/DateTimeField";
import { useBookedTimes } from "@/hooks/useBookedTimes";
import { useBusinessHours } from "@/hooks/useBusinessHours";
import { useActiveDriverCount } from "@/hooks/useActiveDriverCount";
import { useAdminBlockedSlots } from "@/hooks/useAdminBlockedSlots";
import { sendPushToUsers } from "@/lib/pushSend";
import type { Booking, Profile } from "@/types";

function AdminBlockPanel() {
  const [blockAt, setBlockAt] = useState(() => new Date(Date.now() + 15 * 60 * 1000));
  const [blocking, setBlocking] = useState(false);
  const { times: bookedTimes, loading: bookedTimesLoading } = useBookedTimes(blockAt);
  const { hours: businessHours } = useBusinessHours();
  const activeDriverCount = useActiveDriverCount();
  const { slots: blockedSlots, addBlock, removeBlock } = useAdminBlockedSlots();

  async function handleBlock() {
    setBlocking(true);
    try {
      await addBlock(blockAt, "");
      Alert.alert("Listo", "Se bloqueó ese horario.");
    } catch (err) {
      Alert.alert("No se pudo bloquear", (err as Error).message);
    } finally {
      setBlocking(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeBlock(id);
    } catch (err) {
      Alert.alert("No se pudo quitar el bloqueo", (err as Error).message);
    }
  }

  return (
    <View style={styles.blockPanel}>
      <Text style={styles.blockTitle}>Bloquear horario por imprevistos</Text>
      <Text style={styles.blockSubtitle}>
        Si tenés poco personal, bloqueá un horario para que no se siga agendando ahí (cuenta como si
        fuera una reserva más para el cálculo de disponibilidad).
      </Text>

      <DateTimeField
        label="Horario a bloquear"
        value={blockAt}
        minimumDate={new Date()}
        bookedTimes={bookedTimes}
        bookedTimesLoading={bookedTimesLoading}
        activeDriverCount={activeDriverCount}
        businessHours={businessHours}
        onChange={setBlockAt}
      />

      <Pressable style={styles.blockButton} onPress={handleBlock} disabled={blocking}>
        <Text style={styles.blockButtonText}>Bloquear este horario</Text>
      </Pressable>

      {blockedSlots.length > 0 ? (
        <View style={styles.blockList}>
          <Text style={styles.blockListTitle}>Bloqueados próximos</Text>
          {blockedSlots.map((slot) => (
            <View key={slot.id} style={styles.blockRow}>
              <Text style={styles.blockRowText}>
                {new Date(slot.blocked_at).toLocaleString("es-ES")}
              </Text>
              <Pressable onPress={() => handleRemove(slot.id)}>
                <Text style={styles.blockRemove}>Quitar</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function DriverRequestsScreen() {
  const { profile, refreshProfile } = useAuth();
  const isAdmin = !!profile?.is_admin;
  const { bookings, loading } = usePendingBookings();
  const { drivers } = useDrivers();
  const [assigningBookingId, setAssigningBookingId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  async function toggleOnline(value: boolean) {
    if (!profile) return;
    const { error } = await supabase
      .from("profiles")
      .update({ is_online: value })
      .eq("id", profile.id);
    if (error) {
      Alert.alert("No se pudo actualizar", error.message);
      return;
    }
    await refreshProfile();
  }

  function handleCancel(booking: Booking) {
    Alert.alert("Cancelar reserva", "¿Seguro que querés cancelar esta reserva?", [
      { text: "No", style: "cancel" },
      {
        text: "Sí, cancelar",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
          if (error) {
            Alert.alert("No se pudo cancelar", error.message);
            return;
          }
          sendPushToUsers(
            [booking.client_id],
            "Tu reserva fue cancelada",
            "Contactanos si tenés dudas sobre tu viaje.",
            { bookingId: booking.id }
          );
        },
      },
    ]);
  }

  async function handleAssign(driver: Profile) {
    if (!assigningBookingId) return;
    setAssigning(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .update({ status: "accepted", driver_id: driver.id })
        .eq("id", assigningBookingId)
        .eq("status", "pending") // evita asignar dos veces la misma reserva
        .select("client_id")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error(
          "No se modificó ninguna reserva. La reserva puede ya no estar pendiente, o falta correr la " +
            "migración 0016_admin_assigns_driver.sql en el SQL Editor de Supabase."
        );
      }

      if (data?.client_id) {
        sendPushToUsers(
          [data.client_id as string],
          "Se te ha asignado un chofer",
          `${driver.full_name} fue asignado a tu viaje y ya está en camino.`,
          { bookingId: assigningBookingId }
        );
      }
      sendPushToUsers(
        [driver.id],
        "¡Recibiste un viaje!",
        "Tenés un viaje nuevo asignado. Revisalo en Servicio.",
        { bookingId: assigningBookingId }
      );
      setAssigningBookingId(null);
    } catch (err) {
      Alert.alert("No se pudo asignar", (err as Error).message);
    } finally {
      setAssigning(false);
    }
  }

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.onlineRow}>
          <Text style={styles.onlineLabel}>
            {profile?.is_online ? "Estás disponible" : "Estás desconectado"}
          </Text>
          <Switch value={profile?.is_online ?? false} onValueChange={toggleOnline} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Los viajes los asigna el administrador</Text>
          <Text style={styles.emptySubtitle}>
            Cuando te asignen un servicio, te va a llegar una notificación y lo vas a ver en "Servicio".
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.onlineRow}>
        <Text style={styles.onlineLabel}>
          {profile?.is_online ? "Estás disponible" : "Estás desconectado"}
        </Text>
        <Switch value={profile?.is_online ?? false} onValueChange={toggleOnline} />
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={bookings}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        ListHeaderComponent={<AdminBlockPanel />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text>No hay solicitudes pendientes por ahora.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <BookingCard booking={item} />
            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => setAssigningBookingId(item.id)}
              >
                <Text style={styles.actionButtonText}>Aceptar reserva</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => handleCancel(item)}
              >
                <Text style={styles.actionButtonText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      <DriverAssignModal
        visible={!!assigningBookingId}
        drivers={drivers}
        assigning={assigning}
        onSelect={handleAssign}
        onClose={() => setAssigningBookingId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  onlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  onlineLabel: { fontSize: 15, fontWeight: "600", color: "#111827" },
  list: { padding: 16, flexGrow: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#111827", textAlign: "center" },
  emptySubtitle: { fontSize: 13, color: "#6B7280", textAlign: "center" },
  cardWrapper: { gap: 8 },
  actionsRow: { flexDirection: "row", gap: 8 },
  actionButton: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  acceptButton: { backgroundColor: "#16A34A" },
  cancelButton: { backgroundColor: "#DC2626" },
  actionButtonText: { color: "white", fontWeight: "700", fontSize: 14 },
  blockPanel: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  blockTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  blockSubtitle: { fontSize: 12, color: "#6B7280" },
  blockButton: { backgroundColor: "#DC2626", borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  blockButtonText: { color: "white", fontWeight: "700", fontSize: 14 },
  blockList: { marginTop: 6, gap: 6 },
  blockListTitle: { fontSize: 13, fontWeight: "700", color: "#111827" },
  blockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  blockRowText: { fontSize: 13, color: "#374151" },
  blockRemove: { fontSize: 13, color: "#DC2626", fontWeight: "600" },
});
