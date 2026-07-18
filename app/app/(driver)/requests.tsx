import { Alert, FlatList, StyleSheet, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/state/AuthContext";
import { usePendingBookings } from "@/hooks/useBooking";
import { BookingCard } from "@/components/BookingCard";
import { supabase } from "@/lib/supabase";

export default function DriverRequestsScreen() {
  const { profile, refreshProfile } = useAuth();
  const { bookings, loading } = usePendingBookings();

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

  async function acceptBooking(bookingId: string) {
    if (!profile) return;
    const { error } = await supabase
      .from("bookings")
      .update({ status: "accepted", driver_id: profile.id })
      .eq("id", bookingId)
      .eq("status", "pending"); // evita que dos choferes tomen el mismo viaje

    if (error) {
      Alert.alert("No se pudo aceptar", error.message);
      return;
    }
    router.push(`/(driver)/trip/${bookingId}`);
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
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text>No hay solicitudes pendientes por ahora.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <BookingCard booking={item} actionLabel="Aceptar viaje" onPress={() => acceptBooking(item.id)} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
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
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
});
