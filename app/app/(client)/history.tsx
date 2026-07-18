import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/state/AuthContext";
import { supabase } from "@/lib/supabase";
import { BookingCard } from "@/components/BookingCard";
import type { Booking } from "@/types";

export default function ClientHistoryScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
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

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={bookings}
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
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text>Todavía no pediste ningún chofer.</Text>
        </View>
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
});
