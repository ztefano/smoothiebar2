import { Image, StyleSheet, Text, View } from "react-native";
import { CAR_ZONES } from "@/lib/carZones";
import type { DamageEntry } from "@/types";

interface DamageSummaryListProps {
  damages: DamageEntry[];
}

/** Lista de solo lectura de los desperfectos marcados, con foto si tienen. */
export function DamageSummaryList({ damages }: DamageSummaryListProps) {
  if (damages.length === 0) {
    return <Text style={styles.empty}>No se marcaron desperfectos.</Text>;
  }

  return (
    <View style={{ gap: 10 }}>
      {damages.map((d) => {
        const label = CAR_ZONES.find((z) => z.key === d.zone)?.label ?? d.zone;
        return (
          <View key={d.zone} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.zone}>{label}</Text>
              <Text style={styles.types}>{d.types.join(", ") || "—"}</Text>
            </View>
            {d.photo_url ? <Image source={{ uri: d.photo_url }} style={styles.thumb} /> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 13, color: "#6B7280" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 10,
  },
  zone: { fontSize: 13, fontWeight: "700", color: "#111827" },
  types: { fontSize: 12, color: "#92400E" },
  thumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: "#F3F4F6" },
});
