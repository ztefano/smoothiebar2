import { useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/state/AuthContext";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types";

/** Paso extra para cuentas creadas por login social, que no piden teléfono/rol. */
export default function CompleteProfileScreen() {
  const { session, refreshProfile } = useAuth();
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("client");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!session) return;
    if (!phone.trim()) {
      Alert.alert("Faltan datos", "Ingresá tu teléfono.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ phone: phone.trim(), role })
        .eq("id", session.user.id);
      if (error) throw error;

      await refreshProfile();
      router.replace("/");
    } catch (err) {
      Alert.alert("No se pudo guardar", (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Un último paso</Text>
      <Text style={styles.subtitle}>Completá estos datos para terminar tu cuenta.</Text>

      <View style={styles.roleSwitch}>
        <Pressable
          style={[styles.roleButton, role === "client" && styles.roleButtonActive]}
          onPress={() => setRole("client")}
        >
          <Text style={[styles.roleText, role === "client" && styles.roleTextActive]}>
            Soy cliente
          </Text>
        </Pressable>
        <Pressable
          style={[styles.roleButton, role === "driver" && styles.roleButtonActive]}
          onPress={() => setRole("driver")}
        >
          <Text style={[styles.roleText, role === "driver" && styles.roleTextActive]}>
            Soy chofer
          </Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Teléfono"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      <Pressable style={styles.button} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Continuar</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12, backgroundColor: "white" },
  title: { fontSize: 24, fontWeight: "800", color: "#111827", textAlign: "center" },
  subtitle: { fontSize: 13, color: "#6B7280", textAlign: "center", marginBottom: 12 },
  roleSwitch: { flexDirection: "row", gap: 8, marginBottom: 8 },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  roleButtonActive: { backgroundColor: "#111827", borderColor: "#111827" },
  roleText: { fontWeight: "600", color: "#374151" },
  roleTextActive: { color: "white" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  button: {
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "white", fontWeight: "700", fontSize: 15 },
});
