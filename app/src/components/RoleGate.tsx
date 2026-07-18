import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/state/AuthContext";
import type { UserRole } from "@/types";

/** Redirige si la sesión no está lista, no existe, o el rol no coincide. */
export function RoleGate({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session || !profile) return <Redirect href="/(auth)/login" />;
  if (!profile.phone) return <Redirect href="/(auth)/complete-profile" />;
  if (profile.role !== role) {
    return <Redirect href={profile.role === "client" ? "/(client)" : "/(driver)"} />;
  }

  return <>{children}</>;
}
