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
import { useVehicles, formatVehicle } from "@/hooks/useVehicles";

export default function VehiclesScreen() {
  const { profile } = useAuth();
  const { vehicles, loading, addVehicle, removeVehicle } = useVehicles(profile?.id ?? null);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    if (!brand.trim() && !model.trim() && !plate.trim()) {
      Alert.alert("Faltan datos", "Completá al menos la marca o la patente.");
      return;
    }
    setSubmitting(true);
    try {
      await addVehicle({ brand, model, plate });
      setBrand("");
      setModel("");
      setPlate("");
    } catch (err) {
      Alert.alert("No se pudo guardar", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleRemove(id: string) {
    Alert.alert("Eliminar vehículo", "¿Seguro que querés eliminarlo?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => removeVehicle(id).catch((err) => Alert.alert("Error", err.message)),
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
      data={vehicles}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.form}>
          <Text style={styles.title}>Mis vehículos</Text>
          <TextInput style={styles.input} placeholder="Marca" value={brand} onChangeText={setBrand} />
          <TextInput style={styles.input} placeholder="Modelo" value={model} onChangeText={setModel} />
          <TextInput style={styles.input} placeholder="Patente" value={plate} onChangeText={setPlate} />
          <Pressable style={styles.addButton} onPress={handleAdd} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.addButtonText}>Agregar vehículo</Text>
            )}
          </Pressable>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>Todavía no guardaste ningún vehículo.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.meta}>{formatVehicle(item) || "Sin datos"}</Text>
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
