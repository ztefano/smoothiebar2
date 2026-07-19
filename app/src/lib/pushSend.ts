import { supabase } from "@/lib/supabase";

/**
 * Envía una notificación push a uno o varios usuarios, buscando su Expo
 * Push Token guardado en el perfil. Llama directo a la API pública de
 * Expo (no necesita credenciales) — best-effort: si falla, no interrumpe
 * el flujo principal (crear/aceptar una reserva no debe depender de esto).
 */
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  try {
    if (userIds.length === 0) return;

    const { data: profiles } = await supabase
      .from("profiles")
      .select("push_token")
      .in("id", userIds)
      .not("push_token", "is", null);

    const tokens = (profiles ?? [])
      .map((p) => p.push_token as string | null)
      .filter((t): t is string => !!t);
    if (tokens.length === 0) return;

    const messages = tokens.map((to) => ({ to, title, body, data, sound: "default" }));

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
  } catch {
    // silencioso a propósito, ver comentario arriba
  }
}
