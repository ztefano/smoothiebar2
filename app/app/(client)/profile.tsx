import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/state/AuthContext";

export default function ClientProfileScreen() {
  const { profile, session, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.replace("/(auth)/login");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>
        {profile?.full_name} {profile?.last_name}
      </Text>
      <Text style={styles.meta}>{session?.user.email}</Text>
      <Text style={styles.meta}>{profile?.phone}</Text>
      <Text style={styles.role}>Cliente</Text>

      <Pressable style={styles.linkRow} onPress={() => router.push("/(client)/vehicles")}>
        <Text style={styles.linkText}>Mis vehículos</Text>
        <Text style={styles.linkArrow}>→</Text>
      </Pressable>
      <Pressable style={styles.linkRow} onPress={() => router.push("/(client)/addresses")}>
        <Text style={styles.linkText}>Mis direcciones</Text>
        <Text style={styles.linkArrow}>→</Text>
      </Pressable>

      <Pressable
        style={styles.signOut}
        onPress={() => Alert.alert("Cerrar sesión", "¿Seguro que querés salir?", [
          { text: "Cancelar", style: "cancel" },
          { text: "Salir", style: "destructive", onPress: handleSignOut },
        ])}
      >
        <Text style={styles.signOutText}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 6 },
  name: { fontSize: 22, fontWeight: "800", color: "#111827" },
  meta: { fontSize: 14, color: "#6B7280" },
  role: { fontSize: 13, fontWeight: "600", color: "#2563EB", marginBottom: 24 },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  linkText: { fontSize: 15, fontWeight: "600", color: "#111827" },
  linkArrow: { fontSize: 15, color: "#9CA3AF" },
  signOut: {
    marginTop: "auto",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DC2626",
  },
  signOutText: { color: "#DC2626", fontWeight: "700" },
});
