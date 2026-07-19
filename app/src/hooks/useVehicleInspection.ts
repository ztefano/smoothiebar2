import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { DamageEntry, InspectionGeneralStatus, VehicleInspection } from "@/types";

export function useVehicleInspection(bookingId: string | null) {
  const [inspection, setInspection] = useState<VehicleInspection | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    const { data } = await supabase
      .from("vehicle_inspections")
      .select("*")
      .eq("booking_id", bookingId)
      .maybeSingle();
    setInspection((data as VehicleInspection) ?? null);
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function save(params: {
    driverId: string;
    generalStatus: InspectionGeneralStatus;
    damages: DamageEntry[];
    clientConfirmationName: string;
  }) {
    if (!bookingId) return;
    const { error } = await supabase.from("vehicle_inspections").upsert(
      {
        booking_id: bookingId,
        driver_id: params.driverId,
        general_status: params.generalStatus,
        damages: params.damages,
        client_confirmation_name: params.clientConfirmationName,
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: "booking_id" }
    );
    if (error) throw error;
    await reload();
  }

  async function saveReturn(returnConfirmationName: string) {
    if (!bookingId) return;
    const { error } = await supabase
      .from("vehicle_inspections")
      .update({
        return_confirmation_name: returnConfirmationName,
        return_confirmed_at: new Date().toISOString(),
      })
      .eq("booking_id", bookingId);
    if (error) throw error;
    await reload();
  }

  return { inspection, loading, save, saveReturn };
}
