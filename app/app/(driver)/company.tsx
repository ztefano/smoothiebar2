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
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "@/state/AuthContext";
import { supabase } from "@/lib/supabase";
import { useBusinessHours, timeStringToDate } from "@/hooks/useBusinessHours";
import { usePricingConfig } from "@/hooks/usePricingConfig";
import { MapPicker } from "@/components/MapPicker";
import type { BusinessHours, PricingConfig } from "@/types";

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

/** Panel de admin: horarios de la empresa por día (limitan lo que puede
 * agendar el cliente) y tarifas (tarifa plana, km incluidos, extra por km,
 * y zona de servicio con recargo si la recogida cae fuera de ella). */
export default function CompanyScreen() {
  const { profile } = useAuth();
  const { hours, loading: loadingHours, reload: reloadHours } = useBusinessHours();
  const [draft, setDraft] = useState<BusinessHours[]>([]);
  const [savingHours, setSavingHours] = useState(false);
  const [editing, setEditing] = useState<{ day: number; field: "open_time" | "close_time" } | null>(
    null
  );

  const { config: pricing, loading: loadingPricing, reload: reloadPricing } = usePricingConfig();
  const [pricingDraft, setPricingDraft] = useState<Record<string, string>>({});
  const [savingPricing, setSavingPricing] = useState(false);

  useEffect(() => {
    if (hours.length) setDraft(hours);
  }, [hours]);

  useEffect(() => {
    if (pricing) {
      setPricingDraft({
        flat_fare: String(pricing.flat_fare),
        flat_km: String(pricing.flat_km),
        extra_km_price: String(pricing.extra_km_price),
        zone_radius_km: String(pricing.zone_radius_km),
        out_of_zone_km_price: String(pricing.out_of_zone_km_price),
        zone_center_lat: String(pricing.zone_center_lat),
        zone_center_lng: String(pricing.zone_center_lng),
      });
    }
  }, [pricing]);

  if (!profile?.is_admin) {
    return <Redirect href="/(driver)/requests" />;
  }

  function updateDay(day: number, patch: Partial<BusinessHours>) {
    setDraft((prev) => prev.map((h) => (h.day_of_week === day ? { ...h, ...patch } : h)));
  }

  async function handleSaveHours() {
    setSavingHours(true);
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
      await reloadHours();
    } catch (err) {
      Alert.alert("No se pudo guardar", (err as Error).message);
    } finally {
      setSavingHours(false);
    }
  }

  async function handleSavePricing() {
    const parsed = {
      flat_fare: Number(pricingDraft.flat_fare),
      flat_km: Number(pricingDraft.flat_km),
      extra_km_price: Number(pricingDraft.extra_km_price),
      zone_radius_km: Number(pricingDraft.zone_radius_km),
      out_of_zone_km_price: Number(pricingDraft.out_of_zone_km_price),
      zone_center_lat: Number(pricingDraft.zone_center_lat),
      zone_center_lng: Number(pricingDraft.zone_center_lng),
    };
    if (Object.values(parsed).some((n) => Number.isNaN(n))) {
      Alert.alert("Datos inválidos", "Revisá que todos los valores de tarifa sean números.");
      return;
    }
    setSavingPricing(true);
    try {
      const { error } = await supabase.from("pricing_config").update(parsed).eq("id", 1);
      if (error) throw error;
      Alert.alert("Listo", "Se guardó la configuración de tarifas.");
      await reloadPricing();
    } catch (err) {
      Alert.alert("No se pudo guardar", (err as Error).message);
    } finally {
      setSavingPricing(false);
    }
  }

  function setPricingField(field: keyof PricingConfig, value: string) {
    setPricingDraft((prev) => ({ ...prev, [field]: value }));
  }

  if ((loadingHours && !draft.length) || (loadingPricing && !pricing)) {
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

      <Pressable style={styles.saveButton} onPress={handleSaveHours} disabled={savingHours}>
        {savingHours ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.saveButtonText}>Guardar horarios</Text>
        )}
      </Pressable>

      <Text style={[styles.title, styles.sectionSpacing]}>Tarifas y zona</Text>
      <Text style={styles.subtitle}>
        Tarifa plana hasta los km incluidos, extra por km si el viaje es más largo, y recargo si el
        punto de recogida cae fuera del radio de la zona de servicio.
      </Text>

      <View style={styles.dayCard}>
        <Text style={styles.fieldLabel}>Tarifa plana (€)</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={pricingDraft.flat_fare ?? ""}
          onChangeText={(v) => setPricingField("flat_fare", v)}
        />

        <Text style={styles.fieldLabel}>Km incluidos en la tarifa plana</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={pricingDraft.flat_km ?? ""}
          onChangeText={(v) => setPricingField("flat_km", v)}
        />

        <Text style={styles.fieldLabel}>Precio por km extra (€/km)</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={pricingDraft.extra_km_price ?? ""}
          onChangeText={(v) => setPricingField("extra_km_price", v)}
        />

        <Text style={styles.fieldLabel}>Radio de la zona de servicio (km)</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={pricingDraft.zone_radius_km ?? ""}
          onChangeText={(v) => setPricingField("zone_radius_km", v)}
        />

        <Text style={styles.fieldLabel}>Recargo por km fuera de la zona (€/km)</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={pricingDraft.out_of_zone_km_price ?? ""}
          onChangeText={(v) => setPricingField("out_of_zone_km_price", v)}
        />
      </View>

      {pricingDraft.zone_center_lat && pricingDraft.zone_center_lng ? (
        <MapPicker
          label="Centro de la zona de servicio"
          initialLocation={{
            lat: Number(pricingDraft.zone_center_lat),
            lng: Number(pricingDraft.zone_center_lng),
          }}
          onChange={(coords) => {
            setPricingField("zone_center_lat", String(coords.lat));
            setPricingField("zone_center_lng", String(coords.lng));
          }}
        />
      ) : null}

      <Pressable style={styles.saveButton} onPress={handleSavePricing} disabled={savingPricing}>
        {savingPricing ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.saveButtonText}>Guardar tarifas</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800", color: "#111827" },
  sectionSpacing: { marginTop: 12 },
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
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#374151" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: { color: "white", fontWeight: "700", fontSize: 15 },
});
