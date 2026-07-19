import { Pressable, StyleSheet, Text, View } from "react-native";
import type { InspectionGeneralStatus } from "@/types";

interface InspectionConfirmProps {
  generalStatus: InspectionGeneralStatus | null;
  onChangeGeneralStatus: (status: InspectionGeneralStatus) => void;
}

/** Estado general del vehículo, elegido por el chofer. La conformidad del
 * cliente se pide después, desde su propio teléfono (ver StartInspectionReview). */
export function InspectionConfirm({ generalStatus, onChangeGeneralStatus }: InspectionConfirmProps) {
  return (
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
          style={[styles.statusButtonText, generalStatus === "bad_condition" && styles.statusButtonTextActive]}
        >
          Mal estado general
        </Text>
      </Pressable>
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
});
