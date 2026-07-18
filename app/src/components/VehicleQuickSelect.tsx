import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useVehicles, formatVehicle } from "@/hooks/useVehicles";

interface VehicleQuickSelectProps {
  clientId: string | null;
  value: string;
  onChangeText: (text: string) => void;
}

/** Chips con los vehículos guardados del cliente, más un campo libre por si no eligió ninguno. */
export function VehicleQuickSelect({ clientId, value, onChangeText }: VehicleQuickSelectProps) {
  const { vehicles } = useVehicles(clientId);

  return (
    <View style={{ gap: 8 }}>
      {vehicles.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {vehicles.map((vehicle) => {
            const formatted = formatVehicle(vehicle);
            const active = value === formatted;
            return (
              <Pressable
                key={vehicle.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => onChangeText(formatted)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{vehicle.label}</Text>
              </Pressable>
            );
          })}
          <Pressable style={styles.manageChip} onPress={() => router.push("/(client)/vehicles")}>
            <Text style={styles.manageChipText}>+ Agregar</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <Pressable onPress={() => router.push("/(client)/vehicles")}>
          <Text style={styles.manageLink}>+ Guardar un vehículo para elegirlo rápido la próxima vez</Text>
        </Pressable>
      )}

      <TextInput
        style={styles.input}
        placeholder="Datos del vehículo (marca, modelo, patente)"
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  chipTextActive: { color: "white" },
  manageChip: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  manageChipText: { fontSize: 13, fontWeight: "600", color: "#2563EB" },
  manageLink: { fontSize: 13, color: "#2563EB", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
});
