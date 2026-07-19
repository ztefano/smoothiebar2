import { useLocalSearchParams, router } from "expo-router";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";
import { useAuth } from "@/state/AuthContext";
import { useBooking } from "@/hooks/useBooking";
import { useWatchLocation } from "@/hooks/useLocation";
import { publishDriverLocation } from "@/hooks/useDriverLocation";
import { usePayment } from "@/hooks/usePayment";
import { useVehicleInspection } from "@/hooks/useVehicleInspection";
import { LiveTrackingMap } from "@/components/LiveTrackingMap";
import { CarDamageDiagram } from "@/components/CarDamageDiagram";
import { InspectionConfirm } from "@/components/InspectionConfirm";
import { confirmCashPayment } from "@/lib/payments";
import { formatEuros } from "@/lib/pricing";
import { supabase } from "@/lib/supabase";
import { haversineDistanceKm } from "@/lib/distance";
import type { Coordinates, DamageEntry, InspectionGeneralStatus } from "@/types";

interface ClientInfo {
  full_name: string;
  last_name: string | null;
  phone: string | null;
}

const ARRIVAL_THRESHOLD_KM = 0.15;

export default function DriverTripScreen() {
  const { profile } = useAuth();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { booking, loading, updateStatus } = useBooking(bookingId ?? null);
  const { payment } = usePayment(booking?.status === "completed" ? booking.id : null);
  const { inspection, save: saveInspection } = useVehicleInspection(bookingId ?? null);
  const [myLocation, setMyLocation] = useState<Coordinates | null>(null);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [damages, setDamages] = useState<DamageEntry[]>([]);
  const [generalStatus, setGeneralStatus] = useState<InspectionGeneralStatus | null>(null);
  const [clientName, setClientName] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [forceShowFinish, setForceShowFinish] = useState(false);

  const isSharingLocation = booking?.status === "accepted" || booking?.status === "in_progress";

  useWatchLocation(!!isSharingLocation, (coords) => {
    setMyLocation(coords);
    if (booking && profile) {
      publishDriverLocation(booking.id, profile.id, coords).catch(() => {});
    }
  });

  useEffect(() => {
    if (!booking) return;
    supabase
      .from("profiles")
      .select("full_name, last_name, phone")
      .eq("id", booking.client_id)
      .single()
      .then(({ data }) => setClient((data as ClientInfo) ?? null));
  }, [booking?.client_id]);

  if (loading || !booking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  async function handleConfirmInspection() {
    if (!profile) return;
    if (!generalStatus) {
      Alert.alert("Falta un dato", "Marcá si el coche no tiene desperfectos o está en mal estado general.");
      return;
    }
    if (!clientName.trim()) {
      Alert.alert("Falta la conformidad", "Pedile al cliente que escriba su nombre para confirmar.");
      return;
    }
    setConfirming(true);
    try {
      await saveInspection({
        driverId: profile.id,
        generalStatus,
        damages,
        clientConfirmationName: clientName.trim(),
      });
      await updateStatus("in_progress");
    } catch (err) {
      Alert.alert("Error", (err as Error).message);
    } finally {
      setConfirming(false);
    }
  }

  async function handleComplete() {
    try {
      await updateStatus("completed");
    } catch (err) {
      Alert.alert("Error", (err as Error).message);
    }
  }

  async function handleConfirmCash() {
    if (!payment) return;
    try {
      await confirmCashPayment(payment.id);
    } catch (err) {
      Alert.alert("No se pudo confirmar el cobro", (err as Error).message);
    }
  }

  function renderPaymentStatus() {
    if (booking!.status !== "completed") return null;

    if (!payment) {
      return <Text style={styles.pending}>Esperando que el cliente elija cómo pagar…</Text>;
    }

    if (payment.status === "approved") {
      return (
        <Text style={styles.doneText}>
          Pago confirmado ✓ ({payment.provider === "cash" ? "efectivo" : "tarjeta/Bizum"})
        </Text>
      );
    }

    if (payment.provider === "cash") {
      return (
        <Pressable style={[styles.button, styles.completeButton]} onPress={handleConfirmCash}>
          <Text style={styles.buttonText}>Confirmar efectivo recibido</Text>
        </Pressable>
      );
    }

    return <Text style={styles.pending}>El cliente está pagando con tarjeta/Bizum…</Text>;
  }

  const needsInspection = booking.status === "accepted" && !inspection;
  const dropoff: Coordinates | null =
    booking.dropoff_lat != null && booking.dropoff_lng != null
      ? { lat: booking.dropoff_lat, lng: booking.dropoff_lng }
      : null;
  const navigatingToDestination = booking.status === "in_progress" && dropoff;
  const target = navigatingToDestination ? dropoff! : { lat: booking.pickup_lat, lng: booking.pickup_lng };
  const targetLabel = navigatingToDestination ? "Destino" : "Punto de encuentro";
  const hasArrived =
    !!navigatingToDestination &&
    !!myLocation &&
    haversineDistanceKm(myLocation, dropoff!) <= ARRIVAL_THRESHOLD_KM;

  return (
    <View style={styles.container}>
      <LiveTrackingMap
        target={target}
        targetLabel={targetLabel}
        driverLocation={myLocation}
        showsOwnLocation
      />

      <ScrollView style={styles.footer} contentContainerStyle={styles.footerContent}>
        {client ? (
          <Text style={styles.clientName}>
            {client.full_name} {client.last_name} {client.phone ? `· ${client.phone}` : ""}
          </Text>
        ) : null}
        <Text style={styles.address}>{booking.pickup_address}</Text>
        {booking.dropoff_address ? <Text style={styles.meta}>Destino: {booking.dropoff_address}</Text> : null}
        <Text style={styles.meta}>Vehículo: {booking.vehicle_info}</Text>
        <Text style={styles.price}>{formatEuros(booking.price_estimate)}</Text>

        {needsInspection ? (
          <View style={styles.inspectionBlock}>
            <Text style={styles.inspectionTitle}>Revisión del vehículo antes de salir</Text>
            <CarDamageDiagram bookingId={booking.id} damages={damages} onChangeDamages={setDamages} />
            <InspectionConfirm
              generalStatus={generalStatus}
              onChangeGeneralStatus={setGeneralStatus}
              clientName={clientName}
              onChangeClientName={setClientName}
            />
            <Pressable style={styles.button} onPress={handleConfirmInspection} disabled={confirming}>
              {confirming ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Confirmar y comenzar viaje</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {booking.status === "accepted" && inspection ? (
          <Pressable style={styles.button} onPress={() => updateStatus("in_progress")}>
            <Text style={styles.buttonText}>Iniciar viaje</Text>
          </Pressable>
        ) : null}

        {booking.status === "in_progress" ? (
          <>
            {inspection ? (
              <Text style={styles.inspectionSummary}>
                Revisión conforme por {inspection.client_confirmation_name}
                {inspection.damages.length > 0 ? ` · ${inspection.damages.length} desperfecto(s) registrados` : ""}
              </Text>
            ) : null}
            {hasArrived || forceShowFinish ? (
              <Pressable style={[styles.button, styles.completeButton]} onPress={handleComplete}>
                <Text style={styles.buttonText}>Finalizar viaje</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setForceShowFinish(true)}>
                <Text style={styles.arrivalHint}>
                  El botón para finalizar aparece al llegar al destino. ¿Ya llegaste? Tocá acá.
                </Text>
              </Pressable>
            )}
          </>
        ) : null}

        {renderPaymentStatus()}

        {booking.status === "completed" && payment?.status === "approved" ? (
          <Pressable style={styles.secondaryButton} onPress={() => router.replace("/(driver)/requests")}>
            <Text style={styles.secondaryButtonText}>Volver a solicitudes</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  footer: { backgroundColor: "white" },
  footerContent: { padding: 20, gap: 6 },
  clientName: { fontSize: 15, fontWeight: "700", color: "#2563EB" },
  address: { fontSize: 16, fontWeight: "700", color: "#111827" },
  meta: { fontSize: 13, color: "#6B7280" },
  price: { fontSize: 18, fontWeight: "800", color: "#111827", marginTop: 4 },
  button: { backgroundColor: "#111827", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 10 },
  completeButton: { backgroundColor: "#16A34A" },
  buttonText: { color: "white", fontWeight: "700", fontSize: 15 },
  doneText: { marginTop: 10, fontWeight: "700", color: "#16A34A" },
  pending: { marginTop: 10, fontWeight: "600", color: "#D97706" },
  secondaryButton: { marginTop: 10, alignItems: "center", paddingVertical: 10 },
  secondaryButtonText: { color: "#2563EB", fontWeight: "600" },
  inspectionBlock: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  inspectionTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  inspectionSummary: { fontSize: 12, color: "#6B7280", marginTop: 6 },
  arrivalHint: { fontSize: 13, color: "#2563EB", fontWeight: "600", textAlign: "center", marginTop: 10 },
});
