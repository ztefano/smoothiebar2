import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { formatEuros } from "@/lib/pricing";
import type { Booking } from "@/types";

interface BookingDetailProps {
  booking: Booking;
}

interface Person {
  full_name: string;
  last_name: string | null;
  phone: string | null;
}

const STATUS_LABEL: Record<Booking["status"], string> = {
  pending: "Sin asignar",
  accepted: "Asignada",
  in_progress: "En curso",
  completed: "Finalizada",
  cancelled: "Cancelada",
};

/** Vista de solo lectura con todos los datos de un servicio. */
export function BookingDetail({ booking }: BookingDetailProps) {
  const [client, setClient] = useState<Person | null>(null);
  const [driver, setDriver] = useState<Person | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("full_name, last_name, phone")
      .eq("id", booking.client_id)
      .single()
      .then(({ data }) => setClient((data as Person) ?? null));
    if (booking.driver_id) {
      supabase
        .from("profiles")
        .select("full_name, last_name, phone")
        .eq("id", booking.driver_id)
        .single()
        .then(({ data }) => setDriver((data as Person) ?? null));
    }
  }, [booking.id, booking.driver_id]);

  return (
    <View style={{ gap: 12 }}>
      <Row label="Estado" value={STATUS_LABEL[booking.status]} />
      <Row
        label="Cuándo"
        value={booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleString("es-ES") : "Lo antes posible"}
      />
      <Row label="Punto de encuentro" value={booking.pickup_address} />
      {booking.dropoff_address ? <Row label="Destino" value={booking.dropoff_address} /> : null}
      <Row label="Vehículo" value={booking.vehicle_info} />
      <Row label="Precio" value={formatEuros(booking.price_estimate)} />
      {client ? (
        <Row
          label="Cliente"
          value={`${client.full_name} ${client.last_name ?? ""}${client.phone ? ` · ${client.phone}` : ""}`}
        />
      ) : null}
      <Row
        label="Chofer"
        value={
          booking.driver_id
            ? driver
              ? `${driver.full_name} ${driver.last_name ?? ""}${driver.phone ? ` · ${driver.phone}` : ""}`
              : "…"
            : "Sin asignar"
        }
      />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 2 },
  label: { fontSize: 12, color: "#9CA3AF", fontWeight: "600", textTransform: "uppercase" },
  value: { fontSize: 15, color: "#111827", fontWeight: "600" },
});
