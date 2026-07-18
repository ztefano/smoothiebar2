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
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types";

export default function LoginScreen() {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginAs, setLoginAs] = useState<UserRole>("client");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      await signIn(email.trim(), password);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No se pudo obtener la sesión.");

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (userProfile && userProfile.role !== loginAs) {
        await supabase.auth.signOut();
        Alert.alert(
          "Cuenta incorrecta",
          `Esta cuenta es de ${userProfile.role === "client" ? "cliente" : "chofer"}. Elegí "${
            userProfile.role === "client" ? "Soy cliente" : "Soy chofer"
          }" arriba e intentá de nuevo.`
        );
        return;
      }

      router.replace("/");
    } catch (err) {
      Alert.alert("No se pudo iniciar sesión", (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.replace("/");
    } catch (err) {
      Alert.alert("No se pudo iniciar sesión con Google", (err as Error).message);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chofer de Reemplazo</Text>
      <Text style={styles.subtitle}>Iniciá sesión para continuar</Text>

      <View style={styles.roleSwitch}>
        <Pressable
          style={[styles.roleButton, loginAs === "client" && styles.roleButtonActive]}
          onPress={() => setLoginAs("client")}
        >
          <Text style={[styles.roleText, loginAs === "client" && styles.roleTextActive]}>
            Soy cliente
          </Text>
        </Pressable>
        <Pressable
          style={[styles.roleButton, loginAs === "driver" && styles.roleButtonActive]}
          onPress={() => setLoginAs("driver")}
        >
          <Text style={[styles.roleText, loginAs === "driver" && styles.roleTextActive]}>
            Soy chofer
          </Text>
        </Pressable>
      </View>

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
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Entrar</Text>}
      </Pressable>

      {loginAs === "client" ? (
        <>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable style={styles.googleButton} onPress={handleGoogleLogin} disabled={googleLoading}>
            {googleLoading ? (
              <ActivityIndicator color="#111827" />
            ) : (
              <Text style={styles.googleButtonText}>Continuar con Google</Text>
            )}
          </Pressable>

          <Link href="/(auth)/register" style={styles.link}>
            ¿No tenés cuenta? Registrate
          </Link>
        </>
      ) : (
        <Text style={styles.driverHint}>
          Las cuentas de chofer las crea tu administrador. Si todavía no tenés una, pedísela.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12, backgroundColor: "white" },
  title: { fontSize: 26, fontWeight: "800", color: "#111827", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 4 },
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
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  dividerText: { fontSize: 12, color: "#9CA3AF" },
  googleButton: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  googleButtonText: { color: "#111827", fontWeight: "700", fontSize: 15 },
  link: { textAlign: "center", color: "#2563EB", marginTop: 16, fontWeight: "600" },
  driverHint: { textAlign: "center", color: "#6B7280", fontSize: 13, marginTop: 12 },
});
