import { Tabs } from "expo-router";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RoleGate } from "@/components/RoleGate";

/** Botón central destacado (redondo, negro) para "Pedir chofer". */
function CenterTabButton({ onPress, accessibilityState }: BottomTabBarButtonProps) {
  const focused = accessibilityState?.selected;
  return (
    <Pressable onPress={onPress} style={styles.centerWrapper}>
      <View style={[styles.centerButton, focused && styles.centerButtonFocused]}>
        <Text style={styles.centerIcon}>🚗</Text>
      </View>
      <Text style={styles.centerLabel}>Pedir chofer</Text>
    </Pressable>
  );
}

export default function ClientLayout() {
  return (
    <RoleGate role="client">
      <Tabs screenOptions={{ headerShown: true, tabBarActiveTintColor: "#111827" }}>
        <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
        <Tabs.Screen
          name="index"
          options={{
            title: "Pedir chofer",
            tabBarButton: (props) => <CenterTabButton {...props} />,
          }}
        />
        <Tabs.Screen name="history" options={{ title: "Historial" }} />
        <Tabs.Screen name="trip/[bookingId]" options={{ href: null, title: "Viaje" }} />
        <Tabs.Screen name="vehicles" options={{ href: null, title: "Mis vehículos" }} />
        <Tabs.Screen name="addresses" options={{ href: null, title: "Mis direcciones" }} />
      </Tabs>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  centerWrapper: { flex: 1, alignItems: "center", justifyContent: "center", top: -16 },
  centerButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 3,
    borderColor: "white",
  },
  centerButtonFocused: { backgroundColor: "#2563EB" },
  centerIcon: { fontSize: 24 },
  centerLabel: { fontSize: 11, color: "#111827", fontWeight: "700", marginTop: 4 },
});
