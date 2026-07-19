import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { AuthProvider, useAuth } from "@/state/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { UpdateFab } from "@/components/UpdateFab";

// Recomendado por Expo para flujos de OAuth con WebBrowser: resuelve
// cualquier sesión de navegador que haya quedado pendiente al volver a
// abrir la app desde el link de redirección.
WebBrowser.maybeCompleteAuthSession();

function PushNotificationRegistrar() {
  const { profile } = useAuth();
  usePushNotifications(profile?.id ?? null);
  return null;
}

function AdminUpdateFab() {
  const { profile } = useAuth();
  // Visible para cualquier sesión logueada (temporal, mientras probamos con
  // cuenta admin + cuenta cliente en paralelo). Sacarlo cuando ya no haga falta.
  if (!profile) return null;
  return <UpdateFab />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <PushNotificationRegistrar />
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(client)" />
        <Stack.Screen name="(driver)" />
        <Stack.Screen name="payment" />
      </Stack>
      <AdminUpdateFab />
    </AuthProvider>
  );
}
