import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/state/AuthContext";

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
