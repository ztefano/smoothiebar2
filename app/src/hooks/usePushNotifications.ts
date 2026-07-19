import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Pide permiso de notificaciones y guarda el Expo Push Token del usuario
 * logueado en su perfil, para poder avisarle aunque tenga la app cerrada. */
export function usePushNotifications(userId: string | null) {
  useEffect(() => {
    if (!userId) return;
    registerForPushNotifications(userId).catch(() => {
      // best-effort: si falla (emulador, permiso denegado, etc.) no bloquea la app
    });
  }, [userId]);
}

async function registerForPushNotifications(userId: string) {
  if (!Device.isDevice) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  await supabase.from("profiles").update({ push_token: token }).eq("id", userId);
}
