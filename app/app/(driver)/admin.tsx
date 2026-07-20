import { useCallback, useState } from "react";
import { Redirect, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/state/AuthContext";
import { supabase } from "@/lib/supabase";
import { useDrivers } from "@/hooks/useDrivers";
import { SelectModal } from "@/components/SelectModal";
import { NATIONALITIES } from "@/lib/countries";
import { DOCUMENT_TYPES, LICENSE_TYPES } from "@/lib/licenseTypes";
import type { Profile } from "@/types";

/** El cliente de supabase-js envuelve los errores no-2xx de una Edge
 * Function en un mensaje genérico; el motivo real viene en el body de la
 * respuesta, hay que leerlo aparte. */
async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  const withContext = error as { context?: Response; message?: string };
  if (withContext?.context && typeof withContext.context.json === "function") {
    try {
      const body = await withContext.context.json();
      if (body?.error) return body.error as string;
    } catch {
      // sin body JSON legible, usamos el mensaje genérico de abajo
    }
  }
  return withContext?.message ?? "Error desconocido.";
}

/** Panel de admin: crea cuentas de chofer (sin autorregistro), las lista y
 * permite activarlas/desactivarlas (afecta cuántos horarios puede agendar
 * el cliente a la vez). */
export default function AdminScreen() {
  const { profile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [dni, setDni] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [address, setAddress] = useState("");
  const [nationality, setNationality] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { drivers, reload: loadDrivers } = useDrivers();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadDrivers();
    }, [loadDrivers])
  );

  if (!profile?.is_admin) {
    return <Redirect href="/(driver)/requests" />;
  }

  async function handleCreate() {
    if (!fullName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Faltan datos", "Completá nombre, apellido, correo y contraseña.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-driver-account", {
        body: {
          fullName: fullName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          password,
          dni: dni.trim(),
          documentType: documentType || null,
          licenseType: licenseType || null,
          address: address.trim(),
          nationality: nationality || null,
        },
      });
      if (error) throw new Error(await extractFunctionErrorMessage(error));
      if ((data as { error?: string } | null)?.error) {
        throw new Error((data as { error: string }).error);
      }

      Alert.alert("Listo", `Se creó la cuenta de chofer para ${email.trim()}.`);
      setFullName("");
      setLastName("");
      setDocumentType("");
      setDni("");
      setLicenseType("");
      setAddress("");
      setNationality("");
      setPhone("");
      setEmail("");
      setPassword("");
      await loadDrivers();
    } catch (err) {
      Alert.alert("No se pudo crear el chofer", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(driver: Profile, value: boolean) {
    setTogglingId(driver.id);
    const { error } = await supabase.from("profiles").update({ is_active: value }).eq("id", driver.id);
    if (error) {
      Alert.alert("No se pudo actualizar", error.message);
    } else {
      await loadDrivers();
    }
    setTogglingId(null);
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={drivers}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.form}>
          <Text style={styles.title}>Nuevo chofer</Text>
          <Text style={styles.subtitle}>
            Cargá los datos y el chofer va a poder iniciar sesión directo con este email y
            contraseña (sin registrarse por su cuenta).
          </Text>

          <TextInput style={styles.input} placeholder="Nombre" value={fullName} onChangeText={setFullName} />
          <TextInput style={styles.input} placeholder="Apellido" value={lastName} onChangeText={setLastName} />

          <View style={styles.row}>
            <SelectModal
              label="Tipo de documento"
              placeholder="Tipo de documento"
              value={documentType}
              options={[...DOCUMENT_TYPES]}
              allowCustom={false}
              onSelect={setDocumentType}
            />
            <TextInput
              style={[styles.input, styles.rowInput]}
              placeholder="Número de documento"
              value={dni}
              onChangeText={setDni}
            />
          </View>

          <SelectModal
            label="Tipo de permiso"
            placeholder="Tipo de permiso de conducir"
            value={licenseType}
            options={LICENSE_TYPES}
            onSelect={setLicenseType}
          />
          <TextInput style={styles.input} placeholder="Dirección" value={address} onChangeText={setAddress} />
          <SelectModal
            label="Nacionalidad"
            placeholder="Nacionalidad"
            value={nationality}
            options={NATIONALITIES}
            onSelect={setNationality}
          />
          <TextInput style={styles.input} placeholder="Teléfono" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña inicial"
            value={password}
            onChangeText={setPassword}
          />

          <Pressable style={styles.button} onPress={handleCreate} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Crear chofer</Text>
            )}
          </Pressable>

          <Text style={styles.sectionTitle}>Choferes ({drivers.length})</Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>Todavía no creaste ningún chofer.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.driverName}>
              {item.full_name} {item.last_name}
            </Text>
            <Switch
              value={item.is_active}
              onValueChange={(value) => toggleActive(item, value)}
              disabled={togglingId === item.id}
            />
          </View>
          <Text style={styles.driverMeta}>{item.phone ?? "Sin teléfono"}</Text>
          {item.dni ? (
            <Text style={styles.driverMeta}>
              {item.document_type ?? "Doc."}: {item.dni}
            </Text>
          ) : null}
          <Text style={[styles.status, item.is_active ? styles.active : styles.inactive]}>
            {item.is_active ? "Activo" : "Inactivo"}
          </Text>
          <Text style={[styles.status, item.is_online ? styles.online : styles.offline]}>
            {item.is_online ? "Disponible" : "Desconectado"}
          </Text>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, gap: 10, flexGrow: 1 },
  form: { gap: 10, marginBottom: 10 },
  title: { fontSize: 20, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6B7280" },
  row: { flexDirection: "row", gap: 8 },
  rowInput: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  button: { backgroundColor: "#111827", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "700", fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 14 },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 8 },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  driverName: { fontWeight: "700", fontSize: 15, color: "#111827" },
  driverMeta: { fontSize: 13, color: "#6B7280" },
  status: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  active: { color: "#16A34A" },
  inactive: { color: "#DC2626" },
  online: { color: "#16A34A" },
  offline: { color: "#9CA3AF" },
});
