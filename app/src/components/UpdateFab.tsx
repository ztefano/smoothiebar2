import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from "react-native";
import * as Updates from "expo-updates";

/** Botón flotante para forzar la descarga y aplicación de una actualización
 * OTA sin tener que cerrar y volver a abrir la app. Solo visible para admin. */
export function UpdateFab() {
  const [checking, setChecking] = useState(false);

  async function handlePress() {
    if (!Updates.isEnabled) {
      Alert.alert("No disponible", "Las actualizaciones OTA no están activas en este build (modo desarrollo).");
      return;
    }
    setChecking(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        Alert.alert("Ya estás al día", "No hay ninguna actualización pendiente.");
        return;
      }
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (err) {
      Alert.alert("Error al actualizar", (err as Error).message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <Pressable style={styles.fab} onPress={handlePress} disabled={checking}>
      {checking ? <ActivityIndicator color="white" /> : <Text style={styles.icon}>⟳</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    top: 52,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 999,
    opacity: 0.85,
  },
  icon: { color: "white", fontSize: 18, fontWeight: "800" },
});
