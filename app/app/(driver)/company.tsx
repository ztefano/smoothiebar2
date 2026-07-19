import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "@/state/AuthContext";
import { supabase } from "@/lib/supabase";
import { useBusinessHours, timeStringToDate } from "@/hooks/useBusinessHours";
import type { BusinessHours } from "@/types";

const DAY_LABELS: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  0: "Domingo",
};
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  return `${h}:${m}`;
}

/** Panel de admin: horarios de la empresa por día, usados para limitar los
 * horarios que puede elegir el cliente al agendar. */
export default function CompanyScreen() {
  const { profile } = useAuth();
  const { hours, loading, reload } = useBusinessHours();
  const [draft, setDraft] = useState<BusinessHours[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{ day: number; field: "open_time" | "close_time" } | null>(
    null
  );

  useEffect(() => {
    if (hours.length) setDraft(hours);
  }, [hours]);

  if (!profile?.is_admin) {
    return <Redirect href="/(driver)/requests" />;
  }

  function updateDay(day: number, patch: Partial<BusinessHours>) {
    setDraft((prev) => prev.map((h) => (h.day_of_week === day ? { ...h, ...patch } : h)));
  }

  async function handleSave() {
    setSaving(true);
    try {
      for (const day of draft) {
        const { error } = await supabase
          .from("business_hours")
          .update({
            is_open: day.is_open,
            open_time: day.open_time,
            close_time: day.close_time,
          })
          .eq("day_of_week", day.day_of_week);
        if (error) throw error;
      }
      Alert.alert("Listo", "Se guardaron los horarios de la empresa.");
      await reload();
    } catch (err) {
      Alert.alert("No se pudo guardar", (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !draft.length) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const editingDay = editing ? draft.find((h) => h.day_of_week === editing.day) : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Horarios de la empresa</Text>
      <Text style={styles.subtitle}>
        Definí los días y horas en que trabajás. El cliente solo va a poder agendar dentro de estos
        horarios.
      </Text>

      {DAY_ORDER.map((day) => {
        const dayHours = draft.find((h) => h.day_of_week === day);
        if (!dayHours) return null;
        return (
          <View key={day} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{DAY_LABELS[day]}</Text>
              <Switch
                value={dayHours.is_open}
                onValueChange={(value) => updateDay(day, { is_open: value })}
              />
            </View>
            {dayHours.is_open ? (
              <View style={styles.timeRow}>
                <Pressable
                  style={styles.timeButton}
                  onPress={() => setEditing({ day, field: "open_time" })}
                >
                  <Text style={styles.timeLabel}>Desde</Text>
                  <Text style={styles.timeValue}>{formatTime(dayHours.open_time)}</Text>
                </Pressable>
                <Pressable
                  style={styles.timeButton}
                  onPress={() => setEditing({ day, field: "close_time" })}
                >
                  <Text style={styles.timeLabel}>Hasta</Text>
                  <Text style={styles.timeValue}>{formatTime(dayHours.close_time)}</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.closedText}>Cerrado</Text>
            )}
          </View>
        );
      })}

      {editing && editingDay ? (
        <DateTimePicker
          value={timeStringToDate(new Date(), editingDay[editing.field])}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_event, date) => {
            setEditing(null);
            if (!date) return;
            const h = String(date.getHours()).padStart(2, "0");
            const m = String(date.getMinutes()).padStart(2, "0");
            updateDay(editing.day, { [editing.field]: `${h}:${m}:00` } as Partial<BusinessHours>);
          }}
        />
      ) : null}

      <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Guardar</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6B7280", marginBottom: 4 },
  dayCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 10,
  },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dayLabel: { fontSize: 15, fontWeight: "700", color: "#111827" },
  timeRow: { flexDirection: "row", gap: 10 },
  timeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  timeLabel: { fontSize: 11, color: "#6B7280" },
  timeValue: { fontSize: 15, fontWeight: "600", color: "#111827" },
  closedText: { fontSize: 13, color: "#9CA3AF" },
  saveButton: {
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: { color: "white", fontWeight: "700", fontSize: 15 },
});
