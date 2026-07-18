import { Tabs } from "expo-router";
import { RoleGate } from "@/components/RoleGate";

export default function ClientLayout() {
  return (
    <RoleGate role="client">
      <Tabs screenOptions={{ headerShown: true, tabBarActiveTintColor: "#111827" }}>
        <Tabs.Screen name="index" options={{ title: "Pedir chofer" }} />
        <Tabs.Screen name="schedule" options={{ title: "Agendar" }} />
        <Tabs.Screen name="history" options={{ title: "Historial" }} />
        <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
        <Tabs.Screen name="trip/[bookingId]" options={{ href: null, title: "Viaje" }} />
      </Tabs>
    </RoleGate>
  );
}
