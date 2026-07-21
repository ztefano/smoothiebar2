import { useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/state/AuthContext";
import { useAllBookings, useDriverBookings } from "@/hooks/useBooking";
import { useDrivers } from "@/hooks/useDrivers";
import { BookingCard } from "@/components/BookingCard";
import { BookingDetail } from "@/components/BookingDetail";
import { DriverAssignModal } from "@/components/DriverAssignModal";
import { SheetModal } from "@/components/SheetModal";
import { supabase } from "@/lib/supabase";
import { DateTimeField } from "@/components/DateTimeField";
import { useBookedTimes } from "@/hooks/useBookedTimes";
import { useBusinessHours } from "@/hooks/useBusinessHours";
import { useActiveDriverCount } from "@/hooks/useActiveDriverCount";
import { useAdminBlockedSlots } from "@/hooks/useAdminBlockedSlots";
import { sendPushToUsers } from "@/lib/pushSend";
import type { Booking, BookingStatus, Profile } from "@/types";

type TabKey = "sin_asignar" | "asignadas" | "canceladas" | "finalizadas";

const TABS: { key: TabKey; label: string; statuses: BookingStatus[] }[] = [
  { key: "sin_asignar", label: "Sin asignar", statuses: ["pending"] },
  { key: "asignadas", label: "Asignadas", statuses: ["accepted", "in_progress"] },
  { key: "canceladas", label: "Canceladas", statuses: ["cancelled"] },
  { key: "finalizadas", label: "Finalizadas", statuses: ["completed"] },
];

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

  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.blockSubtitle}>
        Si tenés poco personal, bloqueá un horario para que no se siga agendando ahí (cuenta como una
        reserva más para la disponibilidad).
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
              <Text style={styles.blockRowText}>{new Date(slot.blocked_at).toLocaleString("es-ES")}</Text>
              <Pressable onPress={() => removeBlock(slot.id).catch((e) => Alert.alert("Error", e.message))}>
                <Text style={styles.blockRemove}>Quitar</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Vista del admin: todas las reservas separadas por estado en pestañas. */
function AdminRequests() {
  const { bookings } = useAllBookings();
  const { drivers } = useDrivers();
  const [tab, setTab] = useState<TabKey>("sin_asignar");
  const [assigningBookingId, setAssigningBookingId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [detail, setDetail] = useState<Booking | null>(null);
  const [showBlock, setShowBlock] = useState(false);

  const activeTab = TABS.find((t) => t.key === tab)!;
  const filtered = bookings.filter((b) => activeTab.statuses.includes(b.status));

  function countFor(key: TabKey) {
    const t = TABS.find((x) => x.key === key)!;
    return bookings.filter((b) => t.statuses.includes(b.status)).length;
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
          sendPushToUsers([booking.client_id], "Tu reserva fue cancelada", "Contactanos si tenés dudas.", {
            bookingId: booking.id,
          });
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
        .in("status", ["pending", "accepted"]) // se puede asignar o reasignar, no tocar canceladas/finalizadas
        .select("client_id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Esa reserva ya no se puede (re)asignar, o falta correr la migración 0016 en Supabase.");
      if (data.client_id) {
        sendPushToUsers([data.client_id as string], "Se te ha asignado un chofer", `${driver.full_name} ya está en camino.`, {
          bookingId: assigningBookingId,
        });
      }
      sendPushToUsers([driver.id], "¡Recibiste un viaje!", "Tenés un viaje nuevo asignado. Revisalo en Servicio.", {
        bookingId: assigningBookingId,
      });
      setAssigningBookingId(null);
    } catch (err) {
      Alert.alert("No se pudo asignar", (err as Error).message);
    } finally {
      setAssigning(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
        style={styles.tabsWrap}
      >
        {TABS.map((t) => (
          <Pressable key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label} ({countFor(t.key)})
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        contentContainerStyle={styles.list}
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          tab === "sin_asignar" ? (
            <Pressable style={styles.blockAccess} onPress={() => setShowBlock(true)}>
              <Text style={styles.blockAccessText}>⛔ Bloquear un horario por imprevistos</Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={<Text style={styles.empty}>No hay reservas en esta pestaña.</Text>}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <BookingCard booking={item} />
            <View style={styles.actionsRow}>
              {item.status === "pending" ? (
                <>
                  <Pressable
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => setAssigningBookingId(item.id)}
                  >
                    <Text style={styles.actionButtonText}>Aceptar</Text>
                  </Pressable>
                  <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={() => handleCancel(item)}>
                    <Text style={styles.actionButtonText}>Cancelar</Text>
                  </Pressable>
                </>
              ) : null}
              {item.status === "accepted" ? (
                <Pressable
                  style={[styles.actionButton, styles.changeButton]}
                  onPress={() => setAssigningBookingId(item.id)}
                >
                  <Text style={styles.actionButtonText}>Cambiar chofer</Text>
                </Pressable>
              ) : null}
              <Pressable style={[styles.actionButton, styles.detailButton]} onPress={() => setDetail(item)}>
                <Text style={styles.detailButtonText}>Ver detalle</Text>
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

      <SheetModal visible={!!detail} title="Detalle del servicio" onClose={() => setDetail(null)}>
        {detail ? <BookingDetail booking={detail} /> : null}
      </SheetModal>

      <SheetModal visible={showBlock} title="Bloquear horario" onClose={() => setShowBlock(false)}>
        <AdminBlockPanel />
      </SheetModal>
    </View>
  );
}

/** Vista del chofer no-admin: sus servicios asignados. */
function DriverRequests() {
  const { profile } = useAuth();
  const { bookings } = useDriverBookings(profile?.id ?? null);
  const [detail, setDetail] = useState<Booking | null>(null);

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.list}
        data={bookings}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<Text style={styles.title}>Mis servicios</Text>}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Todavía no tenés servicios asignados</Text>
            <Text style={styles.emptySubtitle}>Cuando el administrador te asigne un viaje, va a aparecer acá.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <BookingCard booking={item} />
            <View style={styles.actionsRow}>
              {item.status === "accepted" || item.status === "in_progress" ? (
                <Pressable
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => router.push(`/(driver)/trip/${item.id}`)}
                >
                  <Text style={styles.actionButtonText}>Ir al servicio</Text>
                </Pressable>
              ) : null}
              <Pressable style={[styles.actionButton, styles.detailButton]} onPress={() => setDetail(item)}>
                <Text style={styles.detailButtonText}>Ver detalle</Text>
              </Pressable>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
      <SheetModal visible={!!detail} title="Detalle del servicio" onClose={() => setDetail(null)}>
        {detail ? <BookingDetail booking={detail} /> : null}
      </SheetModal>
    </View>
  );
}

export default function DriverRequestsScreen() {
  const { profile, refreshProfile } = useAuth();

  async function toggleOnline(value: boolean) {
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({ is_online: value }).eq("id", profile.id);
    if (error) {
      Alert.alert("No se pudo actualizar", error.message);
      return;
    }
    await refreshProfile();
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.onlineRow}>
        <Text style={styles.onlineLabel}>{profile?.is_online ? "Estás disponible" : "Estás desconectado"}</Text>
        <Switch value={profile?.is_online ?? false} onValueChange={toggleOnline} />
      </View>
      {profile?.is_admin ? <AdminRequests /> : <DriverRequests />}
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
  tabsWrap: { maxHeight: 52, backgroundColor: "white", borderBottomWidth: 1, borderColor: "#E5E7EB" },
  tabsRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: "center" },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#F3F4F6" },
  tabActive: { backgroundColor: "#111827" },
  tabText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  tabTextActive: { color: "white" },
  list: { padding: 16, flexGrow: 1 },
  title: { fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 12 },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 40 },
  emptyBox: { alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 8, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#111827", textAlign: "center" },
  emptySubtitle: { fontSize: 13, color: "#6B7280", textAlign: "center" },
  cardWrapper: { gap: 8 },
  actionsRow: { flexDirection: "row", gap: 8 },
  actionButton: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  acceptButton: { backgroundColor: "#16A34A" },
  cancelButton: { backgroundColor: "#DC2626" },
  changeButton: { backgroundColor: "#D97706" },
  detailButton: { borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "white" },
  actionButtonText: { color: "white", fontWeight: "700", fontSize: 14 },
  detailButtonText: { color: "#2563EB", fontWeight: "700", fontSize: 14 },
  blockAccess: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  blockAccessText: { color: "#DC2626", fontWeight: "700", fontSize: 13 },
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
