import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from "react-native";
import * as Updates from "expo-updates";
import { triggerGlobalRefresh } from "@/lib/refreshBus";

/** Botón flotante para forzar tanto la descarga de una actualización OTA
 * como el refresco de los datos en pantalla (viajes, agendamientos, etc.),
 * sin tener que cerrar y volver a abrir la app. */
export function UpdateFab() {
  const [checking, setChecking] = useState(false);

  async function handlePress() {
    setChecking(true);
    try {
      if (Updates.isEnabled) {
        // Con timeout: si el servidor de updates no responde, no dejamos el
        // botón colgado para siempre — refrescamos los datos y seguimos.
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 12000)
        );
        const result = await Promise.race([Updates.checkForUpdateAsync(), timeout]);
        if (result.isAvailable) {
          await Promise.race([Updates.fetchUpdateAsync(), timeout]);
          await Updates.reloadAsync();
          return;
        }
      }
      triggerGlobalRefresh();
      Alert.alert("Actualizado", "Se refrescaron los datos de la app (viajes, agendamientos, etc).");
    } catch (err) {
      // Aunque falle la parte OTA, al menos refrescamos los datos.
      triggerGlobalRefresh();
      const msg = (err as Error).message === "timeout"
        ? "No se pudo contactar el servidor de actualizaciones (se refrescaron los datos igual)."
        : (err as Error).message;
      Alert.alert("Aviso", msg);
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
