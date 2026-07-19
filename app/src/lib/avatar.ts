import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { supabase } from "@/lib/supabase";

/** Abre el selector de fotos, sube la elegida al bucket "avatars" y guarda la URL en el perfil. */
export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Necesitamos permiso para acceder a tus fotos.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const extension = asset.uri.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar.${extension}`;

  // fetch().blob() para subir a Supabase Storage falla en React Native
  // ("Network request failed"): el manejo de Blob de RN no es el mismo
  // que el de un navegador. Leer el archivo como base64 y subir el
  // ArrayBuffer resultante es lo que Supabase recomienda para RN/Expo.
  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const contentType = extension === "png" ? "image/png" : "image/jpeg";

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, decode(base64), { upsert: true, contentType });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  // cache-bust: sin esto, la app puede seguir mostrando la foto vieja cacheada
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", userId);
  if (updateError) throw updateError;

  return publicUrl;
}
