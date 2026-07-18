import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

interface SelectModalProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  /** Permite elegir un valor libre que no está en la lista (ej: "Otra marca"). */
  allowCustom?: boolean;
}

/** Selector con búsqueda, hecho con componentes base de RN (sin librerías nativas). */
export function SelectModal({
  label,
  value,
  options,
  onSelect,
  placeholder,
  allowCustom = true,
}: SelectModalProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  function handleClose() {
    setOpen(false);
    setQuery("");
  }

  return (
    <View style={{ flex: 1 }}>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={value ? styles.fieldValue : styles.fieldPlaceholder}>
          {value || placeholder || label}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={handleClose} transparent>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{label}</Text>
            <TextInput
              style={styles.search}
              placeholder="Buscar..."
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={styles.option}
                  onPress={() => {
                    onSelect(item);
                    handleClose();
                  }}
                >
                  <Text style={styles.optionText}>{item}</Text>
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.empty}>Sin resultados</Text>}
            />
            {allowCustom && query.trim() ? (
              <Pressable
                style={styles.customOption}
                onPress={() => {
                  onSelect(query.trim());
                  handleClose();
                }}
              >
                <Text style={styles.customOptionText}>Usar "{query.trim()}"</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  fieldValue: { fontSize: 14, color: "#111827" },
  fieldPlaceholder: { fontSize: 14, color: "#9CA3AF" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "75%",
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#111827" },
  search: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  option: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  optionText: { fontSize: 15, color: "#111827" },
  empty: { textAlign: "center", color: "#9CA3AF", paddingVertical: 20 },
  customOption: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  customOptionText: { fontSize: 15, color: "#2563EB", fontWeight: "600" },
  closeButton: { alignItems: "center", paddingVertical: 12 },
  closeButtonText: { fontSize: 15, color: "#6B7280", fontWeight: "600" },
});
