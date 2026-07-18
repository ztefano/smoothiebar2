import { useCallback, useState } from "react";
import { Redirect, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/state/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";

/** Panel de admin: crea cuentas de chofer (sin autorregistro) y las lista. */
export default function AdminScreen() {
  const { profile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [drivers, setDrivers] = useState<Profile[]>([]);

  const loadDrivers = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "driver")
      .order("created_at", { ascending: false });
    setDrivers((data ?? []) as Profile[]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDrivers();
    }, [loadDrivers])
  );

  if (!profile?.is_admin) {
    return <Redirect href="/(driver)/requests" />;
  }

  async function handleCreate() {
    if (!fullName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Faltan datos", "Completá nombre, apellido, correo y contraseña.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("create-driver-account", {
        body: {
          fullName: fullName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          password,
        },
      });
      if (error) throw error;

      Alert.alert("Listo", `Se creó la cuenta de chofer para ${email.trim()}.`);
      setFullName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setPassword("");
      await loadDrivers();
    } catch (err) {
      Alert.alert("No se pudo crear el chofer", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={drivers}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.form}>
          <Text style={styles.title}>Nuevo chofer</Text>
          <Text style={styles.subtitle}>
            Cargá los datos y el chofer va a poder iniciar sesión directo con este email y
            contraseña (sin registrarse por su cuenta).
          </Text>

          <TextInput style={styles.input} placeholder="Nombre" value={fullName} onChangeText={setFullName} />
          <TextInput style={styles.input} placeholder="Apellido" value={lastName} onChangeText={setLastName} />
          <TextInput style={styles.input} placeholder="Teléfono" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña inicial"
            value={password}
            onChangeText={setPassword}
          />

          <Pressable style={styles.button} onPress={handleCreate} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Crear chofer</Text>
            )}
          </Pressable>

          <Text style={styles.sectionTitle}>Choferes ({drivers.length})</Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>Todavía no creaste ningún chofer.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.driverName}>
            {item.full_name} {item.last_name}
          </Text>
          <Text style={styles.driverMeta}>{item.phone ?? "Sin teléfono"}</Text>
          <Text style={[styles.status, item.is_online ? styles.online : styles.offline]}>
            {item.is_online ? "Disponible" : "Desconectado"}
          </Text>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, gap: 10, flexGrow: 1 },
  form: { gap: 10, marginBottom: 10 },
  title: { fontSize: 20, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6B7280" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  button: { backgroundColor: "#111827", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "700", fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 14 },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 8 },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 2,
  },
  driverName: { fontWeight: "700", fontSize: 15, color: "#111827" },
  driverMeta: { fontSize: 13, color: "#6B7280" },
  status: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  online: { color: "#16A34A" },
  offline: { color: "#9CA3AF" },
});
