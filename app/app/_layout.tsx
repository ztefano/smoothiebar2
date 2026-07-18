import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { AuthProvider } from "@/state/AuthContext";

// Recomendado por Expo para flujos de OAuth con WebBrowser: resuelve
// cualquier sesión de navegador que haya quedado pendiente al volver a
// abrir la app desde el link de redirección.
WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(client)" />
        <Stack.Screen name="(driver)" />
        <Stack.Screen name="payment" />
      </Stack>
    </AuthProvider>
  );
}
