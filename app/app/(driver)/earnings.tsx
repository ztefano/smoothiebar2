import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/state/AuthContext";
import { supabase } from "@/lib/supabase";
import { BookingCard } from "@/components/BookingCard";
import { formatEuros } from "@/lib/pricing";
import type { Booking } from "@/types";

export default function DriverEarningsScreen() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("driver_id", profile.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false });
    setBookings((data ?? []) as Booking[]);
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const total = bookings.reduce((sum, b) => sum + b.price_estimate, 0);

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Total ganado</Text>
        <Text style={styles.summaryValue}>{formatEuros(total)}</Text>
        <Text style={styles.summaryMeta}>{bookings.length} viajes completados</Text>
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={bookings}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text>Todavía no completaste viajes.</Text>
          </View>
        }
        renderItem={({ item }) => <BookingCard booking={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summary: { padding: 20, backgroundColor: "#111827" },
  summaryLabel: { color: "#D1D5DB", fontSize: 13 },
  summaryValue: { color: "white", fontSize: 28, fontWeight: "800", marginTop: 4 },
  summaryMeta: { color: "#D1D5DB", fontSize: 12, marginTop: 4 },
  list: { padding: 16, flexGrow: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
});
