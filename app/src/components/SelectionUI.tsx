import { Pressable, StyleSheet, Text, View } from "react-native";

/** Cuadradito de selección (checkbox) para el modo de selección múltiple. */
export function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked ? <Text style={styles.check}>✓</Text> : null}
    </View>
  );
}

/** Botón de lápiz que activa/desactiva el modo selección. */
export function PencilToggle({ active, onPress }: { active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.pencil, active && styles.pencilActive]} onPress={onPress} hitSlop={8}>
      <Text style={[styles.pencilIcon, active && styles.pencilIconActive]}>{active ? "✕" : "✏️"}</Text>
    </Pressable>
  );
}

/** Botón flotante de tacho de basura (aparece cuando hay elementos elegidos). */
export function TrashFab({ count, onPress }: { count: number; onPress: () => void }) {
  if (count === 0) return null;
  return (
    <Pressable style={styles.trashFab} onPress={onPress}>
      <Text style={styles.trashText}>🗑 Eliminar ({count})</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  checkboxChecked: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  check: { color: "white", fontWeight: "800", fontSize: 14 },
  pencil: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  pencilActive: { backgroundColor: "#111827" },
  pencilIcon: { fontSize: 18 },
  pencilIconActive: { color: "white", fontSize: 16, fontWeight: "800" },
  trashFab: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    backgroundColor: "#DC2626",
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 28,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  trashText: { color: "white", fontWeight: "800", fontSize: 15 },
});
