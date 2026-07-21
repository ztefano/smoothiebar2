import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import * as Notifications from "expo-notifications";
import { AuthProvider, useAuth } from "@/state/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { UpdateFab } from "@/components/UpdateFab";
import { IncomingTripAlert } from "@/components/IncomingTripAlert";
import { DriverAssignedAlert } from "@/components/DriverAssignedAlert";
import { ErrorBoundary, ErrorBubble } from "@/components/ErrorOverlay";

// Recomendado por Expo para flujos de OAuth con WebBrowser: resuelve
// cualquier sesión de navegador que haya quedado pendiente al volver a
// abrir la app desde el link de redirección.
WebBrowser.maybeCompleteAuthSession();

function PushNotificationRegistrar() {
  const { profile } = useAuth();
  usePushNotifications(profile?.id ?? null);

  // Al tocar una notificación (con la app abierta, en segundo plano o
  // cerrada), navega directo al viaje al que corresponde en vez de dejar
  // a la persona en cualquier pantalla en la que haya quedado la app.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { bookingId?: string } | undefined;
      if (!data?.bookingId || !profile) return;
      const path = profile.role === "driver" ? "/(driver)/trip/" : "/(client)/trip/";
      router.push(`${path}${data.bookingId}`);
    });
    return () => sub.remove();
  }, [profile]);

  return null;
}

function TripAlerts() {
  const { profile } = useAuth();
  if (!profile) return null;
  if (profile.role === "driver") return <IncomingTripAlert driverId={profile.id} />;
  return <DriverAssignedAlert clientId={profile.id} />;
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
    <ErrorBoundary>
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
        <TripAlerts />
        <AdminUpdateFab />
        <ErrorBubble />
      </AuthProvider>
    </ErrorBoundary>
  );
}
