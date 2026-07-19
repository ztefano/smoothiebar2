import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CarDamageDiagram } from "@/components/CarDamageDiagram";
import { useCurrentLocation } from "@/hooks/useLocation";
import type { DamageEntry, ReturnStatus } from "@/types";

interface ReturnInspectionReviewProps {
  bookingId: string;
  defaultName: string;
  onConfirm: (params: {
    status: ReturnStatus;
    note: string;
    damages: DamageEntry[];
    name: string;
    lat: number | null;
    lng: number | null;
  }) => Promise<void>;
}

/**
 * Pantalla que ve el cliente en su propio teléfono al terminar el viaje:
 * "conforme" (sin daños) o "no conforme" (con observaciones y fotos, para
 * poder contrastarlo después contra el reporte de salida).
 */
export function ReturnInspectionReview({ bookingId, defaultName, onConfirm }: ReturnInspectionReviewProps) {
  const { location } = useCurrentLocation();
  const [choice, setChoice] = useState<ReturnStatus | null>(null);
  const [note, setNote] = useState("");
  const [damages, setDamages] = useState<DamageEntry[]>([]);
  const [name, setName] = useState(defaultName);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!choice) return;
    setSubmitting(true);
    try {
      await onConfirm({
        status: choice,
        note,
        damages,
        name: name.trim(),
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>¿Cómo quedó tu vehículo?</Text>
      <Text style={styles.subtitle}>Compará contra el estado que se registró antes de salir.</Text>

      <View style={styles.choiceRow}>
        <Pressable
          style={[styles.choiceButton, choice === "conforme" && styles.choiceButtonOk]}
          onPress={() => setChoice("conforme")}
        >
          <Text style={[styles.choiceText, choice === "conforme" && styles.choiceTextActive]}>
            Conforme, sin daños
          </Text>
        </Pressable>
        <Pressable
          style={[styles.choiceButton, choice === "disputed" && styles.choiceButtonBad]}
          onPress={() => setChoice("disputed")}
        >
          <Text style={[styles.choiceText, choice === "disputed" && styles.choiceTextActive]}>
            No conforme
          </Text>
        </Pressable>
      </View>

      {choice === "disputed" ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.label}>Marcá dónde y sacá una foto</Text>
          <CarDamageDiagram bookingId={bookingId} damages={damages} onChangeDamages={setDamages} />
          <Text style={styles.label}>Contanos qué pasó</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Observaciones"
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>
      ) : null}

      {choice ? (
        <>
          <TextInput
            style={styles.nameInput}
            placeholder="Tu nombre y apellido"
            value={name}
            onChangeText={setName}
          />
          <Pressable
            style={[styles.button, !name.trim() && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={!name.trim() || submitting}
          >
            {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Confirmar</Text>}
          </Pressable>
        </>
      ) : null}
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
  subtitle: { fontSize: 12, color: "#6B7280" },
  choiceRow: { flexDirection: "row", gap: 10 },
  choiceButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  choiceButtonOk: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  choiceButtonBad: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
  choiceText: { fontWeight: "700", color: "#374151", fontSize: 13 },
  choiceTextActive: { color: "white" },
  label: { fontSize: 13, fontWeight: "700", color: "#111827" },
  noteInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
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
