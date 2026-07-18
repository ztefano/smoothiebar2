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

export default function RegisterScreen() {
  const { signUp, signInWithGoogle } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignUp() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.replace("/");
    } catch (err) {
      Alert.alert("No se pudo continuar con Google", (err as Error).message);
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleRegister() {
    if (!fullName || !email || !password) {
      Alert.alert("Faltan datos", "Completá nombre, correo y contraseña.");
      return;
    }
    setLoading(true);
    try {
      const { needsEmailConfirmation } = await signUp({
        email: email.trim(),
        password,
        fullName,
        phone,
        role: "client",
      });
      if (needsEmailConfirmation) {
        Alert.alert(
          "Confirmá tu correo",
          "Te enviamos un correo de confirmación. Abrí el link y después volvé a iniciar sesión con tu contraseña.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
        );
      } else {
        router.replace("/");
      }
    } catch (err) {
      Alert.alert("No se pudo crear la cuenta", (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Creá tu cuenta</Text>
      <Text style={styles.subtitle}>
        Este registro es para clientes. Si sos chofer, pedile a tu administrador que te cree la
        cuenta e iniciá sesión desde "Soy chofer" en la pantalla de login.
      </Text>

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

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>o</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable style={styles.googleButton} onPress={handleGoogleSignUp} disabled={googleLoading}>
        {googleLoading ? (
          <ActivityIndicator color="#111827" />
        ) : (
          <Text style={styles.googleButtonText}>Continuar con Google</Text>
        )}
      </Pressable>

      <Link href="/(auth)/login" style={styles.link}>
        ¿Ya tenés cuenta? Iniciá sesión
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12, backgroundColor: "white" },
  title: { fontSize: 24, fontWeight: "800", color: "#111827", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#6B7280", textAlign: "center", marginBottom: 8 },
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
});
