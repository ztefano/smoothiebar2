import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { createRedsysOrder } from "@/lib/payments";

const RETURN_PATH = "/payment/result";

export default function CheckoutScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [formHtml, setFormHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    createRedsysOrder(bookingId)
      .then((order) => setFormHtml(order.formHtml))
      .catch((err) => setError(err.message));
  }, [bookingId]);

  function handleNavigationChange(navState: WebViewNavigation) {
    // Redsys redirige a las URLs Ok/Ko configuradas en la Edge Function,
    // que apuntan al esquema de deep link de la app (ver docs/SETUP.md).
    if (navState.url.includes(RETURN_PATH)) {
      router.replace(`/payment/result?bookingId=${bookingId}`);
    }
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!formHtml) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Preparando el pago…</Text>
      </View>
    );
  }

  return (
    <WebView
      // El HTML contiene un <form> que se auto-envía por POST al TPV de
      // Redsys (Redsys no admite un simple link con querystring como
      // Mercado Pago: la petición debe ir firmada y por POST).
      originWhitelist={["*"]}
      source={{ html: formHtml }}
      onNavigationStateChange={handleNavigationChange}
      startInLoadingState
      renderLoading={() => (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  error: { color: "#DC2626", textAlign: "center" },
});
