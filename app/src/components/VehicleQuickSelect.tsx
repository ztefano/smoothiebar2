import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useVehicles, formatVehicle } from "@/hooks/useVehicles";

export interface VehicleParts {
  brand: string;
  model: string;
  plate: string;
}

interface VehicleQuickSelectProps {
  clientId: string | null;
  value: VehicleParts;
  onChange: (value: VehicleParts) => void;
}

/** Marca/modelo/patente en 3 campos, más chips con los vehículos guardados del cliente. */
export function VehicleQuickSelect({ clientId, value, onChange }: VehicleQuickSelectProps) {
  const { vehicles } = useVehicles(clientId);

  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>Vehículo</Text>

      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.inputThird]}
          placeholder="Marca"
          value={value.brand}
          onChangeText={(brand) => onChange({ ...value, brand })}
        />
        <TextInput
          style={[styles.input, styles.inputThird]}
          placeholder="Modelo"
          value={value.model}
          onChangeText={(model) => onChange({ ...value, model })}
        />
        <TextInput
          style={[styles.input, styles.inputThird]}
          placeholder="Patente"
          value={value.plate}
          onChangeText={(plate) => onChange({ ...value, plate })}
        />
      </View>

      {vehicles.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {vehicles.map((vehicle) => {
            const active =
              value.brand === (vehicle.brand ?? "") &&
              value.model === (vehicle.model ?? "") &&
              value.plate === (vehicle.plate ?? "");
            return (
              <Pressable
                key={vehicle.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() =>
                  onChange({
                    brand: vehicle.brand ?? "",
                    model: vehicle.model ?? "",
                    plate: vehicle.plate ?? "",
                  })
                }
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {vehicle.label} — {formatVehicle(vehicle) || "sin datos"}
                </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", color: "#111827" },
  row: { flexDirection: "row", gap: 8 },
  inputThird: { flex: 1 },
  chipRow: { gap: 8 },
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
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 14,
  },
});
