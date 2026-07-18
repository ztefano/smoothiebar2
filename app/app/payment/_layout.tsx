import { Stack } from "expo-router";

export default function PaymentLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="checkout" options={{ title: "Pago" }} />
      <Stack.Screen name="result" options={{ title: "Resultado del pago" }} />
    </Stack>
  );
}
