import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/state/AuthContext";

/** Punto de entrada: decide a dónde mandar al usuario según sesión y rol. */
export default function Index() {
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
  return <Redirect href={profile.role === "client" ? "/(client)" : "/(driver)"} />;
}
