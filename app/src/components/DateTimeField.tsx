import { useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { TimeSlotGrid } from "@/components/TimeSlotGrid";
import type { BusinessHours } from "@/types";

interface DateTimeFieldProps {
  label: string;
  value: Date;
  minimumDate: Date;
  bookedTimes: Date[];
  activeDriverCount: number;
  businessHours: BusinessHours[];
  onChange: (date: Date) => void;
}

/**
 * Selector de fecha y hora. Primero se elige la fecha con el picker nativo
 * del sistema; la hora se elige después con una grilla (TimeSlotGrid) en
 * vez del reloj nativo, para que se vean rápido los horarios ya ocupados.
 */
export function DateTimeField({
  label,
  value,
  minimumDate,
  bookedTimes,
  activeDriverCount,
  businessHours,
  onChange,
}: DateTimeFieldProps) {
  const [step, setStep] = useState<"none" | "date" | "time">("none");
  const pendingDateRef = useRef<Date | null>(null);

  function handleDateChange(_event: unknown, date?: Date) {
    setStep("none");
    if (!date) return;
    pendingDateRef.current = date;
    setStep("time");
  }

  function handleTimeSelect(time: Date) {
    const base = pendingDateRef.current ?? value;
    const combined = new Date(base);
    combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
    onChange(combined);
    pendingDateRef.current = null;
  }

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.button} onPress={() => setStep("date")}>
        <Text style={styles.buttonText}>{value.toLocaleString("es-ES")}</Text>
      </Pressable>

      {step === "date" ? (
        <DateTimePicker
          value={value}
          mode="date"
          minimumDate={minimumDate}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
        />
      ) : null}

      <TimeSlotGrid
        visible={step === "time"}
        date={pendingDateRef.current ?? value}
        minimumDateTime={minimumDate}
        bookedTimes={bookedTimes}
        activeDriverCount={activeDriverCount}
        businessHours={businessHours}
        selected={value}
        onSelect={handleTimeSelect}
        onClose={() => setStep("none")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 6 },
  button: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  buttonText: { fontSize: 15, color: "#111827" },
});
