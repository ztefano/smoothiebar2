import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/state/AuthContext";
import { useSavedAddresses } from "@/hooks/useSavedAddresses";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import type { Coordinates } from "@/types";

const QUICK_LABELS = ["Casa", "Trabajo", "Otro"];

export default function AddressesScreen() {
  const { profile } = useAuth();
  const { addresses, loading, addAddress, removeAddress } = useSavedAddresses(
    profile?.id ?? null
  );
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    if (!label.trim() || !address.trim() || !coords) {
      Alert.alert("Faltan datos", "Elegí un nombre y una dirección de la lista de sugerencias.");
      return;
    }
    setSubmitting(true);
    try {
      await addAddress({ label, address, coords });
      setLabel("");
      setAddress("");
      setCoords(null);
    } catch (err) {
      Alert.alert("No se pudo guardar", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleRemove(id: string) {
    Alert.alert("Eliminar dirección", "¿Seguro que querés eliminarla?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => removeAddress(id).catch((err) => Alert.alert("Error", err.message)),
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={addresses}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.form}>
          <Text style={styles.title}>Mis direcciones</Text>

          <View style={styles.quickLabels}>
            {QUICK_LABELS.map((quick) => (
              <Pressable
                key={quick}
                style={[styles.quickChip, label === quick && styles.quickChipActive]}
                onPress={() => setLabel(quick)}
              >
                <Text style={[styles.quickChipText, label === quick && styles.quickChipTextActive]}>
                  {quick}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Nombre (ej: Casa, Trabajo, Casa de mis padres)"
            value={label}
            onChangeText={setLabel}
          />

          <AddressAutocomplete
            value={address}
            onChangeText={setAddress}
            onSelectPlace={({ coords: selected }) => setCoords(selected)}
          />

          <Pressable style={styles.addButton} onPress={handleAdd} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.addButtonText}>Guardar dirección</Text>
            )}
          </Pressable>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>Todavía no guardaste ninguna dirección.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.meta} numberOfLines={2}>
              {item.address}
            </Text>
          </View>
          <Pressable onPress={() => handleRemove(item.id)}>
            <Text style={styles.remove}>Eliminar</Text>
          </Pressable>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 20, gap: 10, flexGrow: 1 },
  form: { gap: 10, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 4 },
  quickLabels: { flexDirection: "row", gap: 8 },
  quickChip: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  quickChipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  quickChipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  quickChipTextActive: { color: "white" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  addButton: { backgroundColor: "#111827", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  addButtonText: { color: "white", fontWeight: "700", fontSize: 15 },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  label: { fontWeight: "700", fontSize: 15, color: "#111827" },
  meta: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  remove: { color: "#DC2626", fontWeight: "600" },
});
