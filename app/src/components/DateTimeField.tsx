import { useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

interface DateTimeFieldProps {
  label: string;
  value: Date;
  minimumDate?: Date;
  onChange: (date: Date) => void;
}

/**
 * Selector de fecha y hora. En iOS usa el spinner combinado nativo, pero en
 * Android el modo "datetime" no existe (el picker del sistema solo soporta
 * "date" o "time" por separado) — usarlo ahí crashea la app. Por eso en
 * Android se pide primero la fecha y, al confirmarla, se abre el picker de
 * hora sobre esa misma fecha elegida.
 */
export function DateTimeField({ label, value, minimumDate, onChange }: DateTimeFieldProps) {
  const [step, setStep] = useState<"none" | "date" | "time">("none");
  const pendingDateRef = useRef<Date | null>(null);

  function handleAndroidDateChange(_event: unknown, date?: Date) {
    if (!date) {
      setStep("none");
      return;
    }
    pendingDateRef.current = date;
    setStep("time");
  }

  function handleAndroidTimeChange(_event: unknown, time?: Date) {
    setStep("none");
    if (!time || !pendingDateRef.current) return;
    const combined = new Date(pendingDateRef.current);
    combined.setHours(time.getHours(), time.getMinutes());
    onChange(combined);
    pendingDateRef.current = null;
  }

  function handleIosChange(_event: unknown, date?: Date) {
    setStep("none");
    if (date) onChange(date);
  }

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.button} onPress={() => setStep("date")}>
        <Text style={styles.buttonText}>{value.toLocaleString("es-ES")}</Text>
      </Pressable>

      {Platform.OS === "android" && step === "date" ? (
        <DateTimePicker
          value={value}
          mode="date"
          minimumDate={minimumDate}
          display="default"
          onChange={handleAndroidDateChange}
        />
      ) : null}

      {Platform.OS === "android" && step === "time" ? (
        <DateTimePicker
          value={value}
          mode="time"
          display="default"
          onChange={handleAndroidTimeChange}
        />
      ) : null}

      {Platform.OS === "ios" && step !== "none" ? (
        <DateTimePicker
          value={value}
          mode="datetime"
          minimumDate={minimumDate}
          display="spinner"
          onChange={handleIosChange}
        />
      ) : null}
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
