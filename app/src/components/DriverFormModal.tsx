import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { supabase } from "@/lib/supabase";
import { SheetModal } from "@/components/SheetModal";
import { SelectModal } from "@/components/SelectModal";
import { NATIONALITIES } from "@/lib/countries";
import { DOCUMENT_TYPES, LICENSE_TYPES } from "@/lib/licenseTypes";
import type { Profile } from "@/types";

interface DriverFormModalProps {
  visible: boolean;
  /** Si viene, es edición; si no, es alta de un chofer nuevo. */
  driver?: Profile | null;
  onClose: () => void;
  onSaved: () => void;
}

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

export function DriverFormModal({ visible, driver, onClose, onSaved }: DriverFormModalProps) {
  const isEdit = !!driver;
  const [fullName, setFullName] = useState(driver?.full_name ?? "");
  const [lastName, setLastName] = useState(driver?.last_name ?? "");
  const [documentType, setDocumentType] = useState(driver?.document_type ?? "");
  const [dni, setDni] = useState(driver?.dni ?? "");
  const [licenseType, setLicenseType] = useState(driver?.license_type ?? "");
  const [address, setAddress] = useState(driver?.address ?? "");
  const [nationality, setNationality] = useState(driver?.nationality ?? "");
  const [phone, setPhone] = useState(driver?.phone ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!fullName.trim() || !lastName.trim()) {
      Alert.alert("Faltan datos", "Completá al menos nombre y apellido.");
      return;
    }
    if (!isEdit && (!email.trim() || !password.trim())) {
      Alert.alert("Faltan datos", "Para un chofer nuevo hace falta correo y contraseña.");
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit) {
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: fullName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim() || null,
            dni: dni.trim() || null,
            document_type: documentType || null,
            license_type: licenseType || null,
            address: address.trim() || null,
            nationality: nationality || null,
          })
          .eq("id", driver!.id);
        if (error) throw error;
      } else {
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
        if ((data as { error?: string } | null)?.error) throw new Error((data as { error: string }).error);
      }
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert("No se pudo guardar", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SheetModal visible={visible} title={isEdit ? "Editar chofer" : "Nuevo chofer"} onClose={onClose}>
      <TextInput style={styles.input} placeholder="Nombre" value={fullName} onChangeText={setFullName} />
      <TextInput style={styles.input} placeholder="Apellido" value={lastName} onChangeText={setLastName} />

      <SelectModal
        label="Tipo de documento"
        placeholder="Tipo de documento"
        value={documentType}
        options={[...DOCUMENT_TYPES]}
        allowCustom={false}
        onSelect={setDocumentType}
      />
      <TextInput
        style={styles.input}
        placeholder="Número de documento"
        value={dni}
        onChangeText={setDni}
      />
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
      <TextInput
        style={styles.input}
        placeholder="Teléfono"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      {!isEdit ? (
        <>
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
        </>
      ) : null}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>{isEdit ? "Guardar cambios" : "Crear chofer"}</Text>
        )}
      </Pressable>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  button: { backgroundColor: "#111827", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  buttonText: { color: "white", fontWeight: "700", fontSize: 15 },
});
