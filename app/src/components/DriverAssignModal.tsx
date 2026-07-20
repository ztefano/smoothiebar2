import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import type { Profile } from "@/types";

interface DriverAssignModalProps {
  visible: boolean;
  drivers: Profile[];
  assigning: boolean;
  onSelect: (driver: Profile) => void;
  onClose: () => void;
}

/** Lista de choferes (incluye al admin, que también es chofer) para elegir
 * a quién asignarle una reserva ya aceptada. */
export function DriverAssignModal({ visible, drivers, assigning, onSelect, onClose }: DriverAssignModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Asignar chofer</Text>
          <FlatList
            data={drivers}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.option}
                onPress={() => onSelect(item)}
                disabled={assigning}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {item.full_name} {item.last_name}
                  </Text>
                  <Text style={styles.meta}>
                    {item.is_active ? "Activo" : "Inactivo"} · {item.is_online ? "Disponible" : "Desconectado"}
                    {item.is_admin ? " · Admin" : ""}
                  </Text>
                </View>
                {assigning ? <ActivityIndicator size="small" /> : null}
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No hay choferes cargados todavía.</Text>}
          />
          <Pressable style={styles.closeButton} onPress={onClose} disabled={assigning}>
            <Text style={styles.closeButtonText}>Cancelar</Text>
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
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#111827" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  name: { fontSize: 15, fontWeight: "700", color: "#111827" },
  meta: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  empty: { textAlign: "center", color: "#9CA3AF", paddingVertical: 20 },
  closeButton: { alignItems: "center", paddingVertical: 12 },
  closeButtonText: { fontSize: 15, color: "#6B7280", fontWeight: "600" },
});
