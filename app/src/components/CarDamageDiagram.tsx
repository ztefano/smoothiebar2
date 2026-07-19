import { useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { CAR_ZONES } from "@/lib/carZones";
import { uploadInspectionPhoto } from "@/lib/inspectionPhotos";
import type { DamageEntry, DamageType } from "@/types";

interface CarDamageDiagramProps {
  bookingId: string;
  damages: DamageEntry[];
  onChangeDamages: (damages: DamageEntry[]) => void;
}

/** Silueta del coche vista desde arriba, armada con Views (sin imagen ni
 * SVG), con zonas tocables para marcar pintura/chapa/foto por desperfecto. */
export function CarDamageDiagram({ bookingId, damages, onChangeDamages }: CarDamageDiagramProps) {
  const [openZone, setOpenZone] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const zoneDamage = (key: string) => damages.find((d) => d.zone === key) ?? null;

  function updateZone(key: string, patch: Partial<DamageEntry>) {
    const existing = zoneDamage(key);
    const next: DamageEntry = {
      zone: key,
      types: existing?.types ?? [],
      photo_url: existing?.photo_url ?? null,
      ...patch,
    };
    const rest = damages.filter((d) => d.zone !== key);
    if (next.types.length === 0 && !next.photo_url) {
      onChangeDamages(rest);
    } else {
      onChangeDamages([...rest, next]);
    }
  }

  function toggleType(key: string, type: DamageType) {
    const existing = zoneDamage(key);
    const types = existing?.types ?? [];
    const nextTypes = types.includes(type) ? types.filter((t) => t !== type) : [...types, type];
    updateZone(key, { types: nextTypes });
  }

  async function handleTakePhoto(key: string) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Falta permiso", "Necesitamos acceso a la cámara para sacar la foto.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (result.canceled || !result.assets?.[0]) return;

    setUploadingPhoto(true);
    try {
      const url = await uploadInspectionPhoto(bookingId, key, result.assets[0].uri);
      updateZone(key, { photo_url: url });
    } catch (err) {
      Alert.alert("No se pudo subir la foto", (err as Error).message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  function zoneStyle(key: string) {
    return zoneDamage(key) ? styles.zoneDamaged : styles.zoneOk;
  }

  const openDamage = openZone ? zoneDamage(openZone) : null;
  const openLabel = CAR_ZONES.find((z) => z.key === openZone)?.label ?? "";

  return (
    <View>
      <Text style={styles.hint}>Tocá cada parte del coche para marcar un desperfecto.</Text>

      <View style={styles.car}>
        <Pressable style={[styles.bar, zoneStyle("parachoques_delantero")]} onPress={() => setOpenZone("parachoques_delantero")}>
          <Text style={styles.zoneLabel}>Parachoques del.</Text>
        </Pressable>
        <Pressable style={[styles.panel, zoneStyle("capo")]} onPress={() => setOpenZone("capo")}>
          <Text style={styles.zoneLabel}>Capó</Text>
        </Pressable>
        <View style={styles.middleRow}>
          <Pressable style={[styles.side, zoneStyle("lateral_izquierdo")]} onPress={() => setOpenZone("lateral_izquierdo")}>
            <Text style={styles.zoneLabelVertical}>Izq.</Text>
          </Pressable>
          <Pressable style={[styles.roof, zoneStyle("techo")]} onPress={() => setOpenZone("techo")}>
            <Text style={styles.zoneLabel}>Techo</Text>
          </Pressable>
          <Pressable style={[styles.side, zoneStyle("lateral_derecho")]} onPress={() => setOpenZone("lateral_derecho")}>
            <Text style={styles.zoneLabelVertical}>Der.</Text>
          </Pressable>
        </View>
        <Pressable style={[styles.panel, zoneStyle("maletero")]} onPress={() => setOpenZone("maletero")}>
          <Text style={styles.zoneLabel}>Maletero</Text>
        </Pressable>
        <Pressable style={[styles.bar, zoneStyle("parachoques_trasero")]} onPress={() => setOpenZone("parachoques_trasero")}>
          <Text style={styles.zoneLabel}>Parachoques tras.</Text>
        </Pressable>
      </View>

      <Modal visible={!!openZone} animationType="slide" transparent onRequestClose={() => setOpenZone(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{openLabel}</Text>

            <View style={styles.typeRow}>
              <Pressable
                style={[styles.typeChip, openDamage?.types.includes("pintura") && styles.typeChipActive]}
                onPress={() => openZone && toggleType(openZone, "pintura")}
              >
                <Text
                  style={[styles.typeChipText, openDamage?.types.includes("pintura") && styles.typeChipTextActive]}
                >
                  Pintura
                </Text>
              </Pressable>
              <Pressable
                style={[styles.typeChip, openDamage?.types.includes("chapa") && styles.typeChipActive]}
                onPress={() => openZone && toggleType(openZone, "chapa")}
              >
                <Text
                  style={[styles.typeChipText, openDamage?.types.includes("chapa") && styles.typeChipTextActive]}
                >
                  Chapa
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.photoButton}
              onPress={() => openZone && handleTakePhoto(openZone)}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator color="#111827" />
              ) : (
                <Text style={styles.photoButtonText}>
                  {openDamage?.photo_url ? "📷 Volver a tomar foto" : "📷 Tomar foto"}
                </Text>
              )}
            </Pressable>

            {openDamage?.photo_url ? (
              <Image source={{ uri: openDamage.photo_url }} style={styles.photoPreview} />
            ) : null}

            <Pressable
              style={styles.doneButton}
              onPress={() => setOpenZone(null)}
            >
              <Text style={styles.doneButtonText}>Listo</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const CAR_WIDTH = 220;

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: "#6B7280", marginBottom: 10, textAlign: "center" },
  car: { alignSelf: "center", width: CAR_WIDTH, gap: 4 },
  bar: { height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  panel: { height: 54, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  middleRow: { flexDirection: "row", gap: 4 },
  roof: { flex: 1, height: 70, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  side: { width: 30, height: 70, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  zoneOk: { backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  zoneDamaged: { backgroundColor: "#FEE2E2", borderWidth: 1, borderColor: "#FCA5A5" },
  zoneLabel: { fontSize: 11, fontWeight: "700", color: "#374151" },
  zoneLabelVertical: { fontSize: 10, fontWeight: "700", color: "#374151" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
  },
  sheetTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  typeRow: { flexDirection: "row", gap: 10 },
  typeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  typeChipActive: { backgroundColor: "#111827", borderColor: "#111827" },
  typeChipText: { fontWeight: "700", color: "#374151" },
  typeChipTextActive: { color: "white" },
  photoButton: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  photoButtonText: { fontWeight: "700", color: "#111827" },
  photoPreview: { width: "100%", height: 160, borderRadius: 10, backgroundColor: "#F3F4F6" },
  doneButton: { alignItems: "center", paddingVertical: 10, marginTop: 4 },
  doneButtonText: { color: "#2563EB", fontWeight: "700", fontSize: 15 },
});
