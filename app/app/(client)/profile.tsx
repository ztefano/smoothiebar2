import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/state/AuthContext";
import { EditableProfileHeader } from "@/components/EditableProfileHeader";
import { supabase } from "@/lib/supabase";

export default function ClientProfileScreen() {
  const { profile, session, signOut, refreshProfile } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.replace("/(auth)/login");
  }

  function handleClearHistory() {
    if (!profile) return;
    Alert.alert(
      "Limpiar historial",
      "Se van a borrar tus viajes finalizados y cancelados. El viaje en curso (si tenés uno) no se toca. ¿Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpiar",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("bookings")
              .delete()
              .eq("client_id", profile.id)
              .in("status", ["completed", "cancelled"]);
            if (error) {
              Alert.alert("No se pudo limpiar", `${error.message}. ¿Corriste la migración 0020 en Supabase?`);
            } else {
              Alert.alert("Listo", "Se limpió tu historial.");
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      {profile ? (
        <EditableProfileHeader
          profile={profile}
          email={session?.user.email}
          roleLabel="Cliente"
          onSaved={refreshProfile}
        />
      ) : null}

      <Pressable style={styles.linkRow} onPress={() => router.push("/(client)/vehicles")}>
        <Text style={styles.linkText}>Mis vehículos</Text>
        <Text style={styles.linkArrow}>→</Text>
      </Pressable>
      <Pressable style={styles.linkRow} onPress={() => router.push("/(client)/addresses")}>
        <Text style={styles.linkText}>Mis direcciones</Text>
        <Text style={styles.linkArrow}>→</Text>
      </Pressable>
      <Pressable style={styles.linkRow} onPress={handleClearHistory}>
        <Text style={styles.linkText}>Limpiar historial</Text>
        <Text style={styles.linkArrow}>🗑</Text>
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
