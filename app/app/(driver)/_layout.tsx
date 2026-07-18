import { Tabs } from "expo-router";
import { RoleGate } from "@/components/RoleGate";

export default function DriverLayout() {
  return (
    <RoleGate role="driver">
      <Tabs screenOptions={{ headerShown: true, tabBarActiveTintColor: "#111827" }}>
        <Tabs.Screen name="requests" options={{ title: "Solicitudes" }} />
        <Tabs.Screen name="earnings" options={{ title: "Ganancias" }} />
        <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
        <Tabs.Screen name="trip/[bookingId]" options={{ href: null, title: "Viaje" }} />
      </Tabs>
    </RoleGate>
  );
}
