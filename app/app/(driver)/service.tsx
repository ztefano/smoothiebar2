import { Redirect, router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/state/AuthContext";
import { useActiveDriverBooking } from "@/hooks/useActiveDriverBooking";

/** Punto de entrada del botón central "Servicio": manda directo al viaje
 * activo del chofer, o muestra un estado vacío si no tiene ninguno. */
export default function ServiceScreen() {
  const { profile } = useAuth();
  const bookingId = useActiveDriverBooking(profile?.id ?? null);

  if (bookingId === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (bookingId) {
    return <Redirect href={`/(driver)/trip/${bookingId}`} />;
  }

  return (
    <View style={styles.center}>
      <Text style={styles.title}>No tenés un servicio activo</Text>
      <Text style={styles.subtitle}>
        Cuando aceptés una solicitud desde "Solicitudes", vas a ver acá los datos del cliente y el
        estado del viaje.
      </Text>
      <Pressable style={styles.button} onPress={() => router.push("/(driver)/requests")}>
        <Text style={styles.buttonText}>Ver solicitudes</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  title: { fontSize: 18, fontWeight: "800", color: "#111827", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#6B7280", textAlign: "center" },
  button: { backgroundColor: "#111827", borderRadius: 10, paddingVertical: 14, paddingHorizontal: 24, marginTop: 8 },
  buttonText: { color: "white", fontWeight: "700", fontSize: 15 },
});
