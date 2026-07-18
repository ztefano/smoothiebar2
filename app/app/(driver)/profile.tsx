import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/state/AuthContext";
import { EditableProfileHeader } from "@/components/EditableProfileHeader";

export default function DriverProfileScreen() {
  const { profile, session, signOut, refreshProfile } = useAuth();

  async function handleSignOut() {
    await signOut();
    router.replace("/(auth)/login");
  }

  return (
    <View style={styles.container}>
      {profile ? (
        <EditableProfileHeader
          profile={profile}
          email={session?.user.email}
          roleLabel={profile.is_admin ? "Chofer · Admin" : "Chofer"}
          onSaved={refreshProfile}
        />
      ) : null}

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
