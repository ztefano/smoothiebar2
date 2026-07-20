import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { FlatList, Image, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/state/AuthContext";
import { supabase } from "@/lib/supabase";
import { BookingCard } from "@/components/BookingCard";
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
      .channel(`client-history-${profile.id}`)
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

  const activeBooking = bookings.find((b) => ACTIVE_STATUSES.includes(b.status)) ?? null;
  const pastBookings = bookings.filter((b) => b.id !== activeBooking?.id);

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

            {pastBookings.length > 0 ? <Text style={styles.sectionTitle}>Viajes anteriores</Text> : null}
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
      renderItem={({ item }) => (
        <BookingCard
          booking={item}
          actionLabel="Ver viaje"
          onPress={() => router.push(`/(client)/trip/${item.id}`)}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
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
});
