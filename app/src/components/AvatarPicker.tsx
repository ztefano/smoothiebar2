import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { pickAndUploadAvatar } from "@/lib/avatar";

interface AvatarPickerProps {
  userId: string;
  avatarUrl: string | null;
  fullName: string;
  onUploaded: () => void;
}

export function AvatarPicker({ userId, avatarUrl, fullName, onUploaded }: AvatarPickerProps) {
  const [uploading, setUploading] = useState(false);

  async function handlePress() {
    setUploading(true);
    try {
      const url = await pickAndUploadAvatar(userId);
      if (url) onUploaded();
    } catch (err) {
      Alert.alert("No se pudo subir la foto", (err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const initial = fullName?.trim()?.[0]?.toUpperCase() ?? "?";

  return (
    <Pressable style={styles.container} onPress={handlePress} disabled={uploading}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>{initial}</Text>
        </View>
      )}
      <View style={styles.badge}>
        {uploading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.badgeText}>✎</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { width: 84, height: 84, marginBottom: 8 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#E5E7EB" },
  placeholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { color: "white", fontSize: 32, fontWeight: "800" },
  badge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  badgeText: { color: "white", fontSize: 13, fontWeight: "700" },
});
