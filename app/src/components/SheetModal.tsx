import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

interface SheetModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Acción opcional en el encabezado (ej: menú de tres puntos). */
  headerRight?: ReactNode;
  scroll?: boolean;
}

/** Ventana flotante genérica que sube desde abajo (bottom sheet), para
 * formularios y detalles sin cambiar de pantalla. */
export function SheetModal({ visible, title, onClose, children, headerRight, scroll = true }: SheetModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.headerActions}>
              {headerRight}
              <Pressable onPress={onClose} hitSlop={10}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>
          </View>
          {scroll ? (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
              {children}
            </ScrollView>
          ) : (
            <View style={styles.body}>{children}</View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  title: { fontSize: 18, fontWeight: "800", color: "#111827", flex: 1 },
  close: { fontSize: 20, color: "#6B7280", fontWeight: "700" },
  body: { padding: 20, gap: 12 },
});
