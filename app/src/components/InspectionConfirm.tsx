import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { InspectionGeneralStatus } from "@/types";

interface InspectionConfirmProps {
  generalStatus: InspectionGeneralStatus | null;
  onChangeGeneralStatus: (status: InspectionGeneralStatus) => void;
  clientName: string;
  onChangeClientName: (name: string) => void;
}

/**
 * Sin un desperfecto marcado, el estado general queda indefinido. La
 * "firma" es el nombre del cliente tecleado a modo de conformidad (una
 * firma a mano alzada real necesitaría react-native-svg + captura de
 * imagen, que son módulos nativos nuevos — queda para un próximo build).
 */
export function InspectionConfirm({
  generalStatus,
  onChangeGeneralStatus,
  clientName,
  onChangeClientName,
}: InspectionConfirmProps) {
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.statusRow}>
        <Pressable
          style={[styles.statusButton, generalStatus === "ok" && styles.statusButtonActive]}
          onPress={() => onChangeGeneralStatus("ok")}
        >
          <Text style={[styles.statusButtonText, generalStatus === "ok" && styles.statusButtonTextActive]}>
            Ningún desperfecto
          </Text>
        </Pressable>
        <Pressable
          style={[styles.statusButton, generalStatus === "bad_condition" && styles.statusButtonBad]}
          onPress={() => onChangeGeneralStatus("bad_condition")}
        >
          <Text
            style={[
              styles.statusButtonText,
              generalStatus === "bad_condition" && styles.statusButtonTextActive,
            ]}
          >
            Mal estado general
          </Text>
        </Pressable>
      </View>

      <View>
        <Text style={styles.label}>Conformidad del cliente</Text>
        <Text style={styles.hint}>
          Pedile al cliente que escriba su nombre para confirmar que está de acuerdo con el estado
          del vehículo indicado arriba.
        </Text>
        <TextInput
          style={styles.signatureInput}
          placeholder="Nombre y apellido del cliente"
          value={clientName}
          onChangeText={onChangeClientName}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: { flexDirection: "row", gap: 10 },
  statusButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  statusButtonActive: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  statusButtonBad: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
  statusButtonText: { fontWeight: "700", color: "#374151", fontSize: 13 },
  statusButtonTextActive: { color: "white" },
  label: { fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 2 },
  hint: { fontSize: 12, color: "#6B7280", marginBottom: 8 },
  signatureInput: {
    borderWidth: 1,
    borderColor: "#111827",
    borderStyle: "dashed",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 16,
    fontSize: 17,
    fontStyle: "italic",
  },
});
