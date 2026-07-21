import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRefreshBus } from "@/hooks/useRefreshBus";
import { uniqueChannelName } from "@/lib/realtime";
import type {
  ConfirmationMethod,
  DamageEntry,
  InspectionGeneralStatus,
  ReturnStatus,
  VehicleInspection,
} from "@/types";

/** Inspección del vehículo de una reserva, con sincronización en tiempo
 * real (el chofer y el cliente pueden estar mirando/editando a la vez
 * desde sus propios teléfonos). */
export function useVehicleInspection(bookingId: string | null) {
  const [inspection, setInspection] = useState<VehicleInspection | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!bookingId) return;
    const { data } = await supabase
      .from("vehicle_inspections")
      .select("*")
      .eq("booking_id", bookingId)
      .maybeSingle();
    setInspection((data as VehicleInspection) ?? null);
    setLoading(false);
  }, [bookingId]);

  useRefreshBus(reload);

  useEffect(() => {
    if (!bookingId) return;
    setLoading(true);
    reload();

    const channel = supabase
      .channel(uniqueChannelName(`inspection-${bookingId}`))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicle_inspections", filter: `booking_id=eq.${bookingId}` },
        () => reload()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, reload]);

  /** El chofer carga la revisión de salida (fotos/desperfectos), sin confirmar todavía. */
  async function submitDriverInspection(params: {
    driverId: string;
    generalStatus: InspectionGeneralStatus;
    damages: DamageEntry[];
  }) {
    if (!bookingId) return;
    const { error } = await supabase.from("vehicle_inspections").upsert(
      {
        booking_id: bookingId,
        driver_id: params.driverId,
        general_status: params.generalStatus,
        damages: params.damages,
      },
      { onConflict: "booking_id" }
    );
    if (error) throw error;
    await reload();
  }

  /** Confirma la revisión de salida: desde el teléfono del cliente (lo normal)
   * o, si no puede, desde el del chofer como respaldo (queda registrado cuál). */
  async function confirmStart(params: {
    name: string;
    method: ConfirmationMethod;
    lat: number | null;
    lng: number | null;
  }) {
    if (!bookingId) return;
    const { data, error } = await supabase
      .from("vehicle_inspections")
      .update({
        client_confirmation_name: params.name,
        confirmed_at: new Date().toISOString(),
        start_confirmation_method: params.method,
        start_lat: params.lat,
        start_lng: params.lng,
      })
      .eq("booking_id", bookingId)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("No se guardó la confirmación (permiso denegado). Falta correr la migración 0014 en Supabase.");
    }
    await reload();
  }

  /** El chofer avisa que llegó al destino y pide la conformidad de vuelta. */
  async function requestReturnConfirmation() {
    if (!bookingId) return;
    const { error } = await supabase
      .from("vehicle_inspections")
      .update({ return_requested_at: new Date().toISOString() })
      .eq("booking_id", bookingId);
    if (error) throw error;
    await reload();
  }

  /** Cierra la conformidad de vuelta: conforme, no conforme (con
   * observaciones/fotos), o el chofer deja constancia de que el cliente
   * no pudo/quiso firmar. */
  async function confirmReturn(params: {
    status: ReturnStatus;
    note: string;
    damages: DamageEntry[];
    name: string;
    method: ConfirmationMethod;
    lat: number | null;
    lng: number | null;
  }) {
    if (!bookingId) return;
    const { data, error } = await supabase
      .from("vehicle_inspections")
      .update({
        return_status: params.status,
        return_note: params.note || null,
        return_damages: params.damages,
        return_confirmation_name: params.name,
        return_confirmed_at: new Date().toISOString(),
        return_confirmation_method: params.method,
        return_lat: params.lat,
        return_lng: params.lng,
      })
      .eq("booking_id", bookingId)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error("No se guardó la confirmación (permiso denegado). Falta correr la migración 0014 en Supabase.");
    }
    await reload();
  }

  return {
    inspection,
    loading,
    submitDriverInspection,
    confirmStart,
    requestReturnConfirmation,
    confirmReturn,
  };
}
