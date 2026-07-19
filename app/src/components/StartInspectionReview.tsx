import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { DamageSummaryList } from "@/components/DamageSummaryList";
import { useCurrentLocation } from "@/hooks/useLocation";
import type { VehicleInspection } from "@/types";

interface StartInspectionReviewProps {
  inspection: VehicleInspection;
  defaultName: string;
  onConfirm: (params: { name: string; lat: number | null; lng: number | null }) => Promise<void>;
}

const GENERAL_STATUS_LABEL: Record<string, string> = {
  ok: "El chofer indicó que el vehículo no tiene desperfectos.",
  bad_condition: "El chofer indicó que el vehículo está en mal estado general.",
  detail: "El chofer marcó los siguientes desperfectos:",
};

/** Pantalla que ve el cliente en su propio teléfono para revisar y
 * confirmar el estado del vehículo antes de que el chofer arranque. */
export function StartInspectionReview({ inspection, defaultName, onConfirm }: StartInspectionReviewProps) {
  const { location } = useCurrentLocation();
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState(defaultName);
  const [submitting, setSubmitting] = useState(false);
  const [showReport, setShowReport] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm({ name: name.trim(), lat: location?.lat ?? null, lng: location?.lng ?? null });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Confirmá el inicio del viaje</Text>
      <Text style={styles.intro}>
        Antes de que el chofer arranque, declarás estar conforme con el informe inicial del estado del vehículo.
      </Text>

      <Pressable style={styles.checkRow} onPress={() => setAgreed(!agreed)}>
        <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
          {agreed ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <Text style={styles.checkText}>Declaro estar conforme con el informe inicial del vehículo.</Text>
      </Pressable>

      <TextInput
        style={styles.nameInput}
        placeholder="Tu nombre y apellido"
        value={name}
        onChangeText={setName}
      />

      <Pressable style={styles.reportToggle} onPress={() => setShowReport(!showReport)}>
        <Text style={styles.reportToggleText}>{showReport ? "Ocultar el informe" : "Ver el informe"}</Text>
      </Pressable>

      {showReport ? (
        <View style={styles.reportBox}>
          <Text style={styles.statusLine}>{GENERAL_STATUS_LABEL[inspection.general_status]}</Text>
          {inspection.general_status === "detail" ? <DamageSummaryList damages={inspection.damages} /> : null}
        </View>
      ) : null}

      <Pressable
        style={[styles.button, (!agreed || !name.trim()) && styles.buttonDisabled]}
        onPress={handleConfirm}
        disabled={!agreed || !name.trim() || submitting}
      >
        {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Confirmar</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    gap: 12,
    margin: 16,
  },
  title: { fontSize: 16, fontWeight: "800", color: "#111827" },
  intro: { fontSize: 13, color: "#6B7280" },
  statusLine: { fontSize: 14, color: "#374151" },
  reportToggle: { alignSelf: "flex-start" },
  reportToggleText: { fontSize: 13, fontWeight: "700", color: "#2563EB" },
  reportBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    gap: 10,
  },
  checkRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: "#111827" },
  checkmark: { color: "white", fontWeight: "800", fontSize: 14 },
  checkText: { flex: 1, fontSize: 13, color: "#374151" },
  nameInput: {
    borderWidth: 1,
    borderColor: "#111827",
    borderStyle: "dashed",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 16,
    fontSize: 17,
    fontStyle: "italic",
  },
  button: { backgroundColor: "#111827", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  buttonDisabled: { backgroundColor: "#D1D5DB" },
  buttonText: { color: "white", fontWeight: "700", fontSize: 15 },
});
