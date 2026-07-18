import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types";

interface EditableProfileHeaderProps {
  profile: Profile;
  email: string | undefined;
  roleLabel: string;
  onSaved: () => void;
}

/** Nombre/apellido/teléfono del perfil, editables in-place. */
export function EditableProfileHeader({ profile, email, roleLabel, onSaved }: EditableProfileHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile.full_name);
  const [lastName, setLastName] = useState(profile.last_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [saving, setSaving] = useState(false);

  function startEditing() {
    setFullName(profile.full_name);
    setLastName(profile.last_name ?? "");
    setPhone(profile.phone ?? "");
    setEditing(true);
  }

  async function handleSave() {
    if (!fullName.trim() || !lastName.trim() || !phone.trim()) {
      Alert.alert("Faltan datos", "Completá nombre, apellido y teléfono.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), last_name: lastName.trim(), phone: phone.trim() })
        .eq("id", profile.id);
      if (error) throw error;
      onSaved();
      setEditing(false);
    } catch (err) {
      Alert.alert("No se pudo guardar", (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Nombre" value={fullName} onChangeText={setFullName} />
        <TextInput style={styles.input} placeholder="Apellido" value={lastName} onChangeText={setLastName} />
        <TextInput
          style={styles.input}
          placeholder="Teléfono"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <View style={styles.row}>
          <Pressable style={styles.cancelButton} onPress={() => setEditing(false)} disabled={saving}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>
          <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Guardar</Text>}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: 2 }}>
      <Text style={styles.name}>
        {profile.full_name} {profile.last_name}
      </Text>
      <Text style={styles.meta}>{email}</Text>
      <Text style={styles.meta}>{profile.phone}</Text>
      <Text style={styles.role}>{roleLabel}</Text>
      <Pressable onPress={startEditing}>
        <Text style={styles.editLink}>Editar datos</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 22, fontWeight: "800", color: "#111827" },
  meta: { fontSize: 14, color: "#6B7280" },
  role: { fontSize: 13, fontWeight: "600", color: "#2563EB", marginTop: 4 },
  editLink: { fontSize: 13, color: "#2563EB", fontWeight: "600", marginTop: 10, marginBottom: 10 },
  form: { gap: 10, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  row: { flexDirection: "row", gap: 10 },
  cancelButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cancelButtonText: { color: "#374151", fontWeight: "600" },
  saveButton: { flex: 1, backgroundColor: "#111827", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  saveButtonText: { color: "white", fontWeight: "700" },
});
