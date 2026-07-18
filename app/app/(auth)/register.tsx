import { useState } from "react";
import { Link, router } from "expo-router";
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
import type { UserRole } from "@/types";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("client");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!fullName || !email || !password) {
      Alert.alert("Faltan datos", "Completá nombre, correo y contraseña.");
      return;
    }
    setLoading(true);
    try {
      await signUp({ email: email.trim(), password, fullName, phone, role });
      router.replace("/");
    } catch (err) {
      Alert.alert("No se pudo crear la cuenta", (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Creá tu cuenta</Text>

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

      <TextInput style={styles.input} placeholder="Nombre completo" value={fullName} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="Teléfono" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput style={styles.input} placeholder="Contraseña" secureTextEntry value={password} onChangeText={setPassword} />

      <Pressable style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Crear cuenta</Text>}
      </Pressable>

      <Link href="/(auth)/login" style={styles.link}>
        ¿Ya tenés cuenta? Iniciá sesión
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12, backgroundColor: "white" },
  title: { fontSize: 24, fontWeight: "800", color: "#111827", textAlign: "center", marginBottom: 8 },
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
  link: { textAlign: "center", color: "#2563EB", marginTop: 16, fontWeight: "600" },
});
