import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { supabase } from "@/lib/supabase";

/** Sube una foto de un desperfecto al bucket "inspection-photos" y devuelve su URL pública. */
export async function uploadInspectionPhoto(
  bookingId: string,
  zoneKey: string,
  uri: string
): Promise<string> {
  const extension = uri.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${bookingId}/${zoneKey}-${Date.now()}.${extension}`;
  const contentType = extension === "png" ? "image/png" : "image/jpeg";

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { error } = await supabase.storage
    .from("inspection-photos")
    .upload(path, decode(base64), { upsert: true, contentType });
  if (error) throw error;

  const { data } = supabase.storage.from("inspection-photos").getPublicUrl(path);
  return data.publicUrl;
}
