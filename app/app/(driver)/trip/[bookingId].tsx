import { useLocalSearchParams, router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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
import { openGoogleMapsNavigation, openWazeNavigation } from "@/lib/externalNav";
import { sendPushToUsers } from "@/lib/pushSend";
import type { Coordinates, DamageEntry, InspectionGeneralStatus, ReturnStatus } from "@/types";

interface ClientInfo {
  full_name: string;
  last_name: string | null;
  phone: string | null;
}

const ARRIVAL_THRESHOLD_KM = 0.15;
const RETURN_STATUS_LABEL: Record<ReturnStatus, string> = {
  conforme: "El cliente confirmó que el vehículo volvió sin daños.",
  disputed: "El cliente reportó un problema al finalizar.",
  refused: "El cliente no confirmó el estado de vuelta.",
};

export default function DriverTripScreen() {
  const { profile } = useAuth();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { booking, loading, updateStatus } = useBooking(bookingId ?? null);
  const { payment } = usePayment(booking ? booking.id : null);
  const {
    inspection,
    submitDriverInspection,
    confirmStart,
    requestReturnConfirmation,
    confirmReturn,
  } = useVehicleInspection(bookingId ?? null);
  const [myLocation, setMyLocation] = useState<Coordinates | null>(null);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [damages, setDamages] = useState<DamageEntry[]>([]);
  const [generalStatus, setGeneralStatus] = useState<InspectionGeneralStatus | null>(null);
  const [submittingInspection, setSubmittingInspection] = useState(false);
  const [forceShowFinish, setForceShowFinish] = useState(false);
  const [requestingReturn, setRequestingReturn] = useState(false);
  const [closingTrip, setClosingTrip] = useState(false);

  const [showStartFallback, setShowStartFallback] = useState(false);
  const [startFallbackName, setStartFallbackName] = useState("");
  const [confirmingStartFallback, setConfirmingStartFallback] = useState(false);

  const [showReturnFallback, setShowReturnFallback] = useState(false);
  const [returnFallbackStatus, setReturnFallbackStatus] = useState<ReturnStatus | null>(null);
  const [returnFallbackNote, setReturnFallbackNote] = useState("");
  const [returnFallbackDamages, setReturnFallbackDamages] = useState<DamageEntry[]>([]);
  const [returnFallbackName, setReturnFallbackName] = useState("");
  const [confirmingReturnFallback, setConfirmingReturnFallback] = useState(false);

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

  async function handleSubmitInspection() {
    if (!profile) return;
    const effectiveStatus = damages.length > 0 ? "detail" : generalStatus;
    if (!effectiveStatus) {
      Alert.alert("Falta un dato", "Marcá si el coche no tiene desperfectos o está en mal estado general.");
      return;
    }
    setSubmittingInspection(true);
    try {
      await submitDriverInspection({ driverId: profile.id, generalStatus: effectiveStatus, damages });
      sendPushToUsers(
        [booking!.client_id],
        "Confirmá el estado de tu vehículo",
        "Revisá y confirmá desde tu teléfono antes de que el chofer arranque."
      );
    } catch (err) {
      Alert.alert("Error", (err as Error).message);
    } finally {
      setSubmittingInspection(false);
    }
  }

  async function handleStartFallbackConfirm() {
    if (!startFallbackName.trim()) return;
    setConfirmingStartFallback(true);
    try {
      await confirmStart({
        name: startFallbackName.trim(),
        method: "driver_device",
        lat: myLocation?.lat ?? null,
        lng: myLocation?.lng ?? null,
      });
      setShowStartFallback(false);
    } catch (err) {
      Alert.alert("Error", (err as Error).message);
    } finally {
      setConfirmingStartFallback(false);
    }
  }

  async function handleRequestReturn() {
    setRequestingReturn(true);
    try {
      await requestReturnConfirmation();
      sendPushToUsers(
        [booking!.client_id],
        "Confirmá el estado del vehículo",
        "El viaje llegó a destino. Confirmá desde tu teléfono cómo quedó el vehículo."
      );
    } catch (err) {
      Alert.alert("Error", (err as Error).message);
    } finally {
      setRequestingReturn(false);
    }
  }

  async function handleReturnFallbackConfirm() {
    if (!returnFallbackStatus || !returnFallbackName.trim()) return;
    setConfirmingReturnFallback(true);
    try {
      await confirmReturn({
        status: returnFallbackStatus,
        note: returnFallbackNote,
        damages: returnFallbackDamages,
        name: returnFallbackName.trim(),
        method: "driver_device",
        lat: myLocation?.lat ?? null,
        lng: myLocation?.lng ?? null,
      });
      setShowReturnFallback(false);
    } catch (err) {
      Alert.alert("Error", (err as Error).message);
    } finally {
      setConfirmingReturnFallback(false);
    }
  }

  async function handleCloseTrip() {
    setClosingTrip(true);
    try {
      if (payment?.provider === "cash" && payment.status !== "approved") {
        Alert.alert(
          "Cobrá el viaje",
          `Recordá cobrarle ${formatEuros(booking!.price_estimate)} en efectivo al cliente.`,
          [
            {
              text: "Entendido",
              onPress: () => {
                updateStatus("completed").catch((err) => Alert.alert("Error", (err as Error).message));
              },
            },
          ]
        );
      } else {
        await updateStatus("completed");
      }
    } catch (err) {
      Alert.alert("Error", (err as Error).message);
    } finally {
      setClosingTrip(false);
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
  const waitingStartConfirmation = booking.status === "accepted" && !!inspection && !inspection.confirmed_at;
  const waitingReturnConfirmation =
    booking.status === "in_progress" && !!inspection?.return_requested_at && !inspection.return_confirmed_at;

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

      {isSharingLocation ? (
        <View style={styles.navRow}>
          <Pressable style={styles.navButton} onPress={() => openGoogleMapsNavigation(target)}>
            <Text style={styles.navButtonText}>🧭 Navegar con Google Maps</Text>
          </Pressable>
          <Pressable style={styles.navButton} onPress={() => openWazeNavigation(target)}>
            <Text style={styles.navButtonText}>🚗 Navegar con Waze</Text>
          </Pressable>
        </View>
      ) : null}

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
            <InspectionConfirm generalStatus={generalStatus} onChangeGeneralStatus={setGeneralStatus} />
            <Pressable style={styles.button} onPress={handleSubmitInspection} disabled={submittingInspection}>
              {submittingInspection ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Enviar al cliente para confirmar</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {waitingStartConfirmation ? (
          <View style={styles.inspectionBlock}>
            <Text style={styles.waitingText}>Esperando que el cliente confirme desde su teléfono…</Text>
            {!showStartFallback ? (
              <Pressable onPress={() => setShowStartFallback(true)}>
                <Text style={styles.fallbackLink}>El cliente no puede confirmar desde su teléfono, firmar acá</Text>
              </Pressable>
            ) : (
              <>
                <TextInput
                  style={styles.signatureInput}
                  placeholder="Nombre y apellido del cliente"
                  value={startFallbackName}
                  onChangeText={setStartFallbackName}
                />
                <Pressable
                  style={styles.button}
                  onPress={handleStartFallbackConfirm}
                  disabled={confirmingStartFallback}
                >
                  {confirmingStartFallback ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.buttonText}>Confirmar por el cliente</Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        ) : null}

        {booking.status === "accepted" && inspection?.confirmed_at ? (
          <Pressable style={styles.button} onPress={() => updateStatus("in_progress")}>
            <Text style={styles.buttonText}>Iniciar viaje</Text>
          </Pressable>
        ) : null}

        {booking.status === "in_progress" ? (
          <>
            {inspection?.confirmed_at ? (
              <Text style={styles.inspectionSummary}>
                Revisión de salida conforme por {inspection.client_confirmation_name}
                {inspection.damages.length > 0 ? ` · ${inspection.damages.length} desperfecto(s) registrados` : ""}
              </Text>
            ) : null}

            {!inspection?.return_requested_at ? (
              hasArrived || forceShowFinish ? (
                <Pressable style={styles.button} onPress={handleRequestReturn} disabled={requestingReturn}>
                  {requestingReturn ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.buttonText}>Pedir conformidad de vuelta al cliente</Text>
                  )}
                </Pressable>
              ) : (
                <Pressable onPress={() => setForceShowFinish(true)}>
                  <Text style={styles.arrivalHint}>
                    Esto aparece al llegar al destino. ¿Ya llegaste? Tocá acá.
                  </Text>
                </Pressable>
              )
            ) : null}

            {waitingReturnConfirmation ? (
              <View style={styles.inspectionBlock}>
                <Text style={styles.waitingText}>
                  Esperando que el cliente confirme el estado del vehículo desde su teléfono…
                </Text>
                {!showReturnFallback ? (
                  <Pressable onPress={() => setShowReturnFallback(true)}>
                    <Text style={styles.fallbackLink}>El cliente no puede confirmar, marcar acá</Text>
                  </Pressable>
                ) : (
                  <>
                    <View style={styles.statusRow}>
                      <Pressable
                        style={[styles.statusButton, returnFallbackStatus === "conforme" && styles.statusButtonOk]}
                        onPress={() => setReturnFallbackStatus("conforme")}
                      >
                        <Text
                          style={[styles.statusButtonText, returnFallbackStatus === "conforme" && styles.statusButtonTextActive]}
                        >
                          Conforme
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.statusButton, returnFallbackStatus === "disputed" && styles.statusButtonBad]}
                        onPress={() => setReturnFallbackStatus("disputed")}
                      >
                        <Text
                          style={[styles.statusButtonText, returnFallbackStatus === "disputed" && styles.statusButtonTextActive]}
                        >
                          No conforme
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.statusButton, returnFallbackStatus === "refused" && styles.statusButtonNeutral]}
                        onPress={() => setReturnFallbackStatus("refused")}
                      >
                        <Text
                          style={[styles.statusButtonText, returnFallbackStatus === "refused" && styles.statusButtonTextActive]}
                        >
                          No quiso firmar
                        </Text>
                      </Pressable>
                    </View>

                    {returnFallbackStatus === "disputed" ? (
                      <CarDamageDiagram
                        bookingId={booking.id}
                        damages={returnFallbackDamages}
                        onChangeDamages={setReturnFallbackDamages}
                      />
                    ) : null}

                    <TextInput
                      style={styles.noteInput}
                      placeholder="Observaciones (opcional)"
                      value={returnFallbackNote}
                      onChangeText={setReturnFallbackNote}
                      multiline
                    />
                    <TextInput
                      style={styles.signatureInput}
                      placeholder="Tu nombre (quien deja la constancia)"
                      value={returnFallbackName}
                      onChangeText={setReturnFallbackName}
                    />
                    <Pressable
                      style={styles.button}
                      onPress={handleReturnFallbackConfirm}
                      disabled={confirmingReturnFallback || !returnFallbackStatus}
                    >
                      {confirmingReturnFallback ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Text style={styles.buttonText}>Guardar constancia</Text>
                      )}
                    </Pressable>
                  </>
                )}
              </View>
            ) : null}

            {inspection?.return_confirmed_at && inspection.return_status ? (
              <View style={styles.inspectionBlock}>
                <Text style={styles.inspectionSummary}>
                  {RETURN_STATUS_LABEL[inspection.return_status]}
                  {inspection.return_note ? ` — "${inspection.return_note}"` : ""}
                </Text>
                <Pressable style={[styles.button, styles.completeButton]} onPress={handleCloseTrip} disabled={closingTrip}>
                  {closingTrip ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.buttonText}>Cerrar viaje</Text>
                  )}
                </Pressable>
              </View>
            ) : null}
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
  navRow: { flexDirection: "row", gap: 8, padding: 10, backgroundColor: "white" },
  navButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  navButtonText: { fontSize: 12, fontWeight: "700", color: "#111827" },
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
  inspectionSummary: { fontSize: 12, color: "#6B7280" },
  arrivalHint: { fontSize: 13, color: "#2563EB", fontWeight: "600", textAlign: "center", marginTop: 10 },
  waitingText: { fontSize: 13, color: "#D97706", fontWeight: "600", textAlign: "center" },
  fallbackLink: { fontSize: 13, color: "#2563EB", fontWeight: "600", textAlign: "center" },
  signatureInput: {
    borderWidth: 1,
    borderColor: "#111827",
    borderStyle: "dashed",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 16,
    fontSize: 17,
    fontStyle: "italic",
  },
  noteInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: "top",
  },
  statusRow: { flexDirection: "row", gap: 8 },
  statusButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  statusButtonOk: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  statusButtonBad: { backgroundColor: "#DC2626", borderColor: "#DC2626" },
  statusButtonNeutral: { backgroundColor: "#6B7280", borderColor: "#6B7280" },
  statusButtonText: { fontSize: 11, fontWeight: "700", color: "#111827" },
  statusButtonTextActive: { color: "white" },
});
