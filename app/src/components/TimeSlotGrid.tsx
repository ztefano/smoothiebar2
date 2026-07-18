import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

interface TimeSlotGridProps {
  visible: boolean;
  date: Date;
  minimumDateTime: Date;
  bookedTimes: Date[];
  selected: Date;
  onSelect: (datetime: Date) => void;
  onClose: () => void;
}

const SLOT_MINUTES = 30;

function buildSlots(date: Date): Date[] {
  const slots: Date[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const slot = new Date(date);
      slot.setHours(h, m, 0, 0);
      slots.push(slot);
    }
  }
  return slots;
}

/** Grilla de horarios cada 30 min, marcando los ya ocupados y los que ya pasaron. */
export function TimeSlotGrid({
  visible,
  date,
  minimumDateTime,
  bookedTimes,
  selected,
  onSelect,
  onClose,
}: TimeSlotGridProps) {
  const slots = buildSlots(date);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Elegí el horario</Text>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendAvailable]} />
              <Text style={styles.legendText}>Disponible</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendBooked]} />
              <Text style={styles.legendText}>Ya pedido</Text>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.grid}>
            {slots.map((slot) => {
              const isPast = slot.getTime() < minimumDateTime.getTime();
              const isBooked = bookedTimes.some(
                (t) => Math.abs(t.getTime() - slot.getTime()) < SLOT_MINUTES * 60 * 1000
              );
              const isSelected =
                slot.getHours() === selected.getHours() && slot.getMinutes() === selected.getMinutes();
              const disabled = isPast;

              return (
                <Pressable
                  key={slot.toISOString()}
                  disabled={disabled}
                  onPress={() => {
                    onSelect(slot);
                    onClose();
                  }}
                  style={[
                    styles.slot,
                    isBooked && styles.slotBooked,
                    isSelected && styles.slotSelected,
                    disabled && styles.slotDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.slotText,
                      isBooked && styles.slotTextBooked,
                      isSelected && styles.slotTextSelected,
                      disabled && styles.slotTextDisabled,
                    ]}
                  >
                    {slot.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "75%",
  },
  title: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 8 },
  legendRow: { flexDirection: "row", gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendAvailable: { backgroundColor: "white", borderWidth: 1, borderColor: "#E5E7EB" },
  legendBooked: { backgroundColor: "#FDE68A" },
  legendText: { fontSize: 12, color: "#6B7280" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 12 },
  slot: {
    width: "22%",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  slotBooked: { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" },
  slotSelected: { backgroundColor: "#111827", borderColor: "#111827" },
  slotDisabled: { backgroundColor: "#F3F4F6", borderColor: "#F3F4F6" },
  slotText: { fontSize: 13, fontWeight: "600", color: "#111827" },
  slotTextBooked: { color: "#92400E" },
  slotTextSelected: { color: "white" },
  slotTextDisabled: { color: "#D1D5DB" },
  closeButton: { alignItems: "center", paddingTop: 12 },
  closeButtonText: { fontSize: 15, color: "#6B7280", fontWeight: "600" },
});
