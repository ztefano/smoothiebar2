import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Alert, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/state/AuthContext";
import { supabase } from "@/lib/supabase";
import { uniqueChannelName } from "@/lib/realtime";
import { BookingCard } from "@/components/BookingCard";
import { Checkbox, PencilToggle, TrashFab } from "@/components/SelectionUI";
import type { Booking } from "@/types";

interface DriverInfo {
  full_name: string;
  last_name: string | null;
  avatar_url: string | null;
  dni: string | null;
  document_type: string | null;
}

const ACTIVE_STATUSES: Booking["status"][] = ["pending", "accepted", "in_progress"];

const ACTIVE_STATUS_LABEL: Record<string, string> = {
  pending: "Buscando un chofer disponible…",
  accepted: "¡Tu viaje fue confirmado!",
  in_progress: "Tu chofer está manejando tu vehículo.",
};

export default function ClientHistoryScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("client_id", profile.id)
      .order("created_at", { ascending: false });
    setBookings((data ?? []) as Booking[]);
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel(uniqueChannelName(`client-history-${profile.id}`))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `client_id=eq.${profile.id}` },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, load]);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const activeBooking = bookings.find((b) => ACTIVE_STATUSES.includes(b.status)) ?? null;
  const pastBookings = bookings.filter((b) => b.id !== activeBooking?.id);

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelection() {
    setSelectionMode(false);
    setSelected(new Set());
  }

  function handleDeleteSelected() {
    const ids = [...selected];
    Alert.alert("Eliminar del historial", `¿Borrar ${ids.length} viaje(s)? Esta acción no se puede deshacer.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("bookings").delete().in("id", ids);
          if (error) {
            Alert.alert("No se pudo eliminar", `${error.message}. ¿Corriste la migración 0020 en Supabase?`);
          } else {
            exitSelection();
            await load();
          }
        },
      },
    ]);
  }

  useEffect(() => {
    if (!activeBooking?.driver_id) {
      setDriver(null);
      return;
    }
    supabase
      .from("profiles")
      .select("full_name, last_name, avatar_url, dni, document_type")
      .eq("id", activeBooking.driver_id)
      .single()
      .then(({ data }) => setDriver((data as DriverInfo) ?? null));
  }, [activeBooking?.driver_id]);

  return (
    <View style={{ flex: 1 }}>
    <FlatList
      contentContainerStyle={styles.list}
      data={pastBookings}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
      ListHeaderComponent={
        activeBooking ? (
          <View style={styles.headerSection}>
            <View style={styles.activeCard}>
              <Text style={styles.activeTitle}>{ACTIVE_STATUS_LABEL[activeBooking.status]}</Text>

              {activeBooking.driver_id && driver ? (
                <View style={styles.driverRow}>
                  {driver.avatar_url ? (
                    <Image source={{ uri: driver.avatar_url }} style={styles.driverPhoto} />
                  ) : (
                    <View style={styles.driverPhotoPlaceholder}>
                      <Text style={styles.driverPhotoInitial}>{driver.full_name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.driverName}>
                      {driver.full_name} {driver.last_name}
                    </Text>
                    {driver.dni ? (
                      <Text style={styles.driverMeta}>
                        {driver.document_type ?? "Doc."}: {driver.dni}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {activeBooking.status === "accepted" ? (
                <Text style={styles.hint}>Te avisaremos cuando el chofer haya llegado.</Text>
              ) : null}

              <BookingCard
                booking={activeBooking}
                actionLabel="Ver viaje"
                onPress={() => router.push(`/(client)/trip/${activeBooking.id}`)}
              />
            </View>

            {pastBookings.length > 0 ? (
              <View style={styles.pastHeader}>
                <Text style={styles.sectionTitle}>Viajes anteriores</Text>
                <PencilToggle
                  active={selectionMode}
                  onPress={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
                />
              </View>
            ) : null}
          </View>
        ) : pastBookings.length > 0 ? (
          <View style={styles.pastHeaderTop}>
            <Text style={styles.sectionTitle}>Historial</Text>
            <PencilToggle
              active={selectionMode}
              onPress={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
            />
          </View>
        ) : null
      }
      ListEmptyComponent={
        !activeBooking ? (
          <View style={styles.empty}>
            <Text>Todavía no pediste ningún chofer.</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) =>
        selectionMode ? (
          <Pressable style={styles.selectRow} onPress={() => toggleSelected(item.id)}>
            <Checkbox checked={selected.has(item.id)} />
            <View style={{ flex: 1 }}>
              <BookingCard booking={item} />
            </View>
          </Pressable>
        ) : (
          <BookingCard
            booking={item}
            actionLabel="Ver viaje"
            onPress={() => router.push(`/(client)/trip/${item.id}`)}
          />
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
    <TrashFab count={selected.size} onPress={handleDeleteSelected} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, flexGrow: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  headerSection: { gap: 10, marginBottom: 6 },
  activeCard: {
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#111827",
    padding: 16,
    gap: 12,
  },
  activeTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  driverPhoto: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#F3F4F6" },
  driverPhotoPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  driverPhotoInitial: { color: "white", fontSize: 20, fontWeight: "800" },
  driverName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  driverMeta: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  hint: { fontSize: 13, color: "#2563EB", fontWeight: "600" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#6B7280", marginTop: 4 },
  pastHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  pastHeaderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  selectRow: { flexDirection: "row", alignItems: "center", gap: 12 },
});
