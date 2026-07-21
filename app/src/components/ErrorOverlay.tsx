import { Component, type ReactNode, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { clearErrors, pushError, subscribeErrors } from "@/lib/errorLog";

// Captura los errores globales de JS (async, handlers, etc.) una sola vez.
let installed = false;
function installGlobalHandler() {
  if (installed) return;
  installed = true;
  const g = (globalThis as unknown as { ErrorUtils?: any }).ErrorUtils;
  if (g?.getGlobalHandler && g?.setGlobalHandler) {
    const prev = g.getGlobalHandler();
    g.setGlobalHandler((error: any, isFatal: boolean) => {
      pushError(
        `${isFatal ? "FATAL " : ""}${error?.name ?? "Error"}: ${error?.message ?? String(error)}\n${
          error?.stack ?? ""
        }`
      );
      prev?.(error, isFatal);
    });
  }
}

/** Envuelve la app: si un error de render tira la pantalla, lo muestra en vez
 * de dejar la app en negro, y lo registra en la burbuja de diagnóstico. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    pushError(`RENDER ${error.name}: ${error.message}\n${error.stack ?? ""}`);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.fatal}>
          <Text style={styles.fatalTitle}>Ocurrió un error en esta pantalla</Text>
          <ScrollView style={styles.fatalScroll}>
            <Text style={styles.fatalText}>
              {this.state.error.name}: {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack}
            </Text>
          </ScrollView>
          <Pressable style={styles.fatalButton} onPress={() => this.setState({ error: null })}>
            <Text style={styles.fatalButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

/** Burbuja flotante que aparece solo cuando hubo algún error, para poder
 * verlo y sacarle captura sin necesidad de una computadora. */
export function ErrorBubble() {
  const [logs, setLogs] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    installGlobalHandler();
    return subscribeErrors(setLogs);
  }, []);

  if (logs.length === 0) return null;

  if (open) {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Errores ({logs.length})</Text>
        <ScrollView style={styles.panelScroll}>
          {logs.map((l, i) => (
            <Text key={i} style={styles.panelLine}>
              {l}
            </Text>
          ))}
        </ScrollView>
        <View style={styles.panelActions}>
          <Pressable style={styles.panelBtn} onPress={clearErrors}>
            <Text style={styles.panelBtnText}>Limpiar</Text>
          </Pressable>
          <Pressable style={styles.panelBtn} onPress={() => setOpen(false)}>
            <Text style={styles.panelBtnText}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable style={styles.bubble} onPress={() => setOpen(true)}>
      <Text style={styles.bubbleText}>⚠️ {logs.length}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    bottom: 90,
    right: 14,
    backgroundColor: "#DC2626",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    zIndex: 1000,
    elevation: 8,
  },
  bubbleText: { color: "white", fontWeight: "800", fontSize: 14 },
  panel: {
    position: "absolute",
    top: 60,
    left: 10,
    right: 10,
    bottom: 60,
    backgroundColor: "rgba(0,0,0,0.94)",
    borderRadius: 12,
    padding: 12,
    zIndex: 1000,
    elevation: 10,
  },
  panelTitle: { color: "#F87171", fontWeight: "800", fontSize: 15, marginBottom: 8 },
  panelScroll: { flex: 1 },
  panelLine: { color: "#E5E7EB", fontSize: 11, fontFamily: "monospace", marginBottom: 10 },
  panelActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  panelBtn: { flex: 1, backgroundColor: "#374151", borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  panelBtnText: { color: "white", fontWeight: "700" },
  fatal: { flex: 1, backgroundColor: "#111827", padding: 20, paddingTop: 60 },
  fatalTitle: { color: "#F87171", fontSize: 18, fontWeight: "800", marginBottom: 12 },
  fatalScroll: { flex: 1 },
  fatalText: { color: "#E5E7EB", fontSize: 12, fontFamily: "monospace" },
  fatalButton: { backgroundColor: "#2563EB", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  fatalButtonText: { color: "white", fontWeight: "700", fontSize: 15 },
});
