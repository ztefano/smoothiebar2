import { useCallback, useState } from "react";
import { Redirect, useFocusEffect } from "expo-router";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useAuth } from "@/state/AuthContext";
import { supabase } from "@/lib/supabase";
import { useDrivers } from "@/hooks/useDrivers";
import { SheetModal } from "@/components/SheetModal";
import { DriverFormModal } from "@/components/DriverFormModal";
import { Checkbox, PencilToggle, TrashFab } from "@/components/SelectionUI";
import type { Profile } from "@/types";

async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  const withContext = error as { context?: Response; message?: string };
  if (withContext?.context && typeof withContext.context.json === "function") {
    try {
      const body = await withContext.context.json();
      if (body?.error) return body.error as string;
    } catch {
      /* sin body legible */
    }
  }
  return withContext?.message ?? "Error desconocido.";
}

export default function AdminScreen() {
  const { profile } = useAuth();
  const { drivers, reload: loadDrivers } = useDrivers();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editDriver, setEditDriver] = useState<Profile | null>(null);
  const [detailDriver, setDetailDriver] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      loadDrivers();
    }, [loadDrivers])
  );

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelection() {
    setSelectionMode(false);
    setSelected(new Set());
  }

  function handleDeleteSelected() {
    const ids = [...selected];
    Alert.alert("Eliminar choferes", `¿Eliminar ${ids.length} chofer(es)? Esta acción no se puede deshacer.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          for (const id of ids) {
            try {
              const { data, error } = await supabase.functions.invoke("delete-driver-account", {
                body: { driverId: id },
              });
              if (error) throw new Error(await extractFunctionErrorMessage(error));
              if ((data as { error?: string } | null)?.error) throw new Error((data as { error: string }).error);
            } catch (err) {
              Alert.alert("No se pudo eliminar uno", (err as Error).message);
            }
          }
          exitSelection();
          await loadDrivers();
        },
      },
    ]);
  }

  if (!profile?.is_admin) {
    return <Redirect href="/(driver)/requests" />;
  }

  async function toggleActive(driver: Profile, value: boolean) {
    setTogglingId(driver.id);
    const { error } = await supabase.from("profiles").update({ is_active: value }).eq("id", driver.id);
    if (error) Alert.alert("No se pudo actualizar", error.message);
    else await loadDrivers();
    setTogglingId(null);
  }

  function handleDelete(driver: Profile) {
    setMenuOpen(false);
    Alert.alert("Eliminar chofer", `¿Seguro que querés eliminar a ${driver.full_name}? Esta acción no se puede deshacer.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            const { data, error } = await supabase.functions.invoke("delete-driver-account", {
              body: { driverId: driver.id },
            });
            if (error) throw new Error(await extractFunctionErrorMessage(error));
            if ((data as { error?: string } | null)?.error) throw new Error((data as { error: string }).error);
            setDetailDriver(null);
            await loadDrivers();
          } catch (err) {
            Alert.alert("No se pudo eliminar", (err as Error).message);
          }
        },
      },
    ]);
  }

  return (
    <>
      <FlatList
        contentContainerStyle={styles.list}
        data={drivers}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.title}>Choferes ({drivers.length})</Text>
            <PencilToggle
              active={selectionMode}
              onPress={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
            />
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>Todavía no creaste ningún chofer.</Text>}
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          return (
            <Pressable
              style={styles.card}
              onPress={() => (selectionMode ? toggleSelected(item.id) : setDetailDriver(item))}
            >
              <View style={styles.cardHeader}>
                <View style={styles.nameRow}>
                  {selectionMode ? <Checkbox checked={isSelected} /> : null}
                  <Text style={styles.driverName}>
                    {item.full_name} {item.last_name}
                  </Text>
                </View>
                {!selectionMode ? (
                  <Switch
                    value={item.is_active}
                    onValueChange={(value) => toggleActive(item, value)}
                    disabled={togglingId === item.id}
                  />
                ) : null}
              </View>
              <Text style={styles.driverMeta}>{item.phone ?? "Sin teléfono"}</Text>
              <View style={styles.statusRow}>
                <Text style={[styles.status, item.is_active ? styles.active : styles.inactive]}>
                  {item.is_active ? "Activo" : "Inactivo"}
                </Text>
                <Text style={[styles.status, item.is_online ? styles.online : styles.offline]}>
                  {item.is_online ? "Disponible" : "Desconectado"}
                </Text>
              </View>
              {!selectionMode ? (
                <View style={styles.detailButton}>
                  <Text style={styles.detailButtonText}>Ver detalle</Text>
                </View>
              ) : null}
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListFooterComponent={
          !selectionMode ? (
            <Pressable style={styles.addButton} onPress={() => setShowForm(true)}>
              <Text style={styles.addButtonText}>+ Agregar chofer</Text>
            </Pressable>
          ) : null
        }
      />

      <TrashFab count={selected.size} onPress={handleDeleteSelected} />

      {/* Alta de chofer */}
      <DriverFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={loadDrivers}
      />

      {/* Edición de chofer */}
      <DriverFormModal
        visible={!!editDriver}
        driver={editDriver}
        onClose={() => setEditDriver(null)}
        onSaved={() => {
          setDetailDriver(null);
          loadDrivers();
        }}
      />

      {/* Detalle de chofer con menú de tres puntos */}
      <SheetModal
        visible={!!detailDriver}
        title={detailDriver ? `${detailDriver.full_name} ${detailDriver.last_name ?? ""}` : ""}
        onClose={() => {
          setMenuOpen(false);
          setDetailDriver(null);
        }}
        headerRight={
          <Pressable onPress={() => setMenuOpen((v) => !v)} hitSlop={10}>
            <Text style={styles.dots}>⋮</Text>
          </Pressable>
        }
      >
        {menuOpen ? (
          <View style={styles.menu}>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                setEditDriver(detailDriver);
              }}
            >
              <Text style={styles.menuText}>Editar</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => detailDriver && handleDelete(detailDriver)}>
              <Text style={[styles.menuText, styles.menuDelete]}>Eliminar</Text>
            </Pressable>
          </View>
        ) : null}

        {detailDriver ? (
          <View style={{ gap: 10 }}>
            <DetailRow label="Teléfono" value={detailDriver.phone ?? "—"} />
            <DetailRow
              label="Documento"
              value={detailDriver.dni ? `${detailDriver.document_type ?? "Doc."}: ${detailDriver.dni}` : "—"}
            />
            <DetailRow label="Permiso de conducir" value={detailDriver.license_type ?? "—"} />
            <DetailRow label="Nacionalidad" value={detailDriver.nationality ?? "—"} />
            <DetailRow label="Dirección" value={detailDriver.address ?? "—"} />
            <DetailRow label="Estado" value={detailDriver.is_active ? "Activo" : "Inactivo"} />
            <DetailRow label="Conexión" value={detailDriver.is_online ? "Disponible" : "Desconectado"} />
          </View>
        ) : null}
      </SheetModal>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, gap: 10, flexGrow: 1 },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  title: { fontSize: 20, fontWeight: "800", color: "#111827" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 8 },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 4,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  driverName: { fontWeight: "700", fontSize: 15, color: "#111827" },
  driverMeta: { fontSize: 13, color: "#6B7280" },
  statusRow: { flexDirection: "row", gap: 12 },
  status: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  active: { color: "#16A34A" },
  inactive: { color: "#DC2626" },
  online: { color: "#16A34A" },
  offline: { color: "#9CA3AF" },
  detailButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  detailButtonText: { fontSize: 13, fontWeight: "700", color: "#2563EB" },
  addButton: {
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  addButtonText: { color: "white", fontWeight: "700", fontSize: 15 },
  dots: { fontSize: 22, color: "#111827", fontWeight: "800" },
  menu: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  menuItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  menuText: { fontSize: 15, fontWeight: "600", color: "#111827" },
  menuDelete: { color: "#DC2626" },
  detailRow: { gap: 2 },
  detailLabel: { fontSize: 12, color: "#9CA3AF", fontWeight: "600", textTransform: "uppercase" },
  detailValue: { fontSize: 15, color: "#111827", fontWeight: "600" },
});
