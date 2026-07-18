import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSavedAddresses } from "@/hooks/useSavedAddresses";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import type { Coordinates } from "@/types";

interface AddressFieldProps {
  clientId: string | null;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onSelectPlace: (result: { address: string; coords: Coordinates }) => void;
  placeholder?: string;
}

/** Campo de dirección con chips de direcciones guardadas (casa/trabajo/etc.) más autocompletado. */
export function AddressField({
  clientId,
  label,
  value,
  onChangeText,
  onSelectPlace,
  placeholder,
}: AddressFieldProps) {
  const { addresses } = useSavedAddresses(clientId);

  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>

      {addresses.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {addresses.map((saved) => (
            <Pressable
              key={saved.id}
              style={styles.chip}
              onPress={() => {
                onChangeText(saved.address);
                onSelectPlace({ address: saved.address, coords: { lat: saved.lat, lng: saved.lng } });
              }}
            >
              <Text style={styles.chipText}>{saved.label}</Text>
            </Pressable>
          ))}
          <Pressable style={styles.manageChip} onPress={() => router.push("/(client)/addresses")}>
            <Text style={styles.manageChipText}>+ Agregar</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      <AddressAutocomplete
        value={value}
        onChangeText={onChangeText}
        onSelectPlace={onSelectPlace}
        placeholder={placeholder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", color: "#111827" },
  row: { gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  manageChip: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  manageChipText: { fontSize: 13, fontWeight: "600", color: "#2563EB" },
});
