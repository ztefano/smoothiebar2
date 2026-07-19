import { Tabs } from "expo-router";
import { RoleGate } from "@/components/RoleGate";
import { useAuth } from "@/state/AuthContext";

export default function DriverLayout() {
  const { profile } = useAuth();

  return (
    <RoleGate role="driver">
      <Tabs screenOptions={{ headerShown: true, tabBarActiveTintColor: "#111827" }}>
        <Tabs.Screen name="index" options={{ href: null, title: "Chofer de Reemplazo" }} />
        <Tabs.Screen name="requests" options={{ title: "Solicitudes" }} />
        <Tabs.Screen name="earnings" options={{ title: "Ganancias" }} />
        <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
        <Tabs.Screen name="trip/[bookingId]" options={{ href: null, title: "Viaje" }} />
        <Tabs.Screen
          name="admin"
          options={{ href: profile?.is_admin ? undefined : null, title: "Choferes" }}
        />
        <Tabs.Screen
          name="company"
          options={{ href: profile?.is_admin ? undefined : null, title: "Empresa" }}
        />
      </Tabs>
    </RoleGate>
  );
}
