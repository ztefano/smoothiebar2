import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRefreshBus } from "@/hooks/useRefreshBus";
import type { Vehicle } from "@/types";

export function useVehicles(clientId: string | null) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from("vehicles")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });
    setVehicles((data ?? []) as Vehicle[]);
    setLoading(false);
  }, [clientId]);

  useRefreshBus(reload);

  useEffect(() => {
    reload();
  }, [reload]);

  async function addVehicle(input: { brand: string; model: string; plate: string }) {
    if (!clientId) return;
    const label = `Coche ${vehicles.length + 1}`;
    const { error } = await supabase.from("vehicles").insert({
      client_id: clientId,
      label,
      brand: input.brand.trim() || null,
      model: input.model.trim() || null,
      plate: input.plate.trim() || null,
    });
    if (error) throw error;
    await reload();
  }

  async function removeVehicle(id: string) {
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) throw error;
    await reload();
  }

  return { vehicles, loading, addVehicle, removeVehicle, reload };
}

export function formatVehicle(vehicle: Vehicle): string {
  return formatVehicleParts(vehicle.brand, vehicle.model, vehicle.plate);
}

export function formatVehicleParts(
  brand: string | null,
  model: string | null,
  plate: string | null
): string {
  return [brand, model, plate].filter(Boolean).join(" · ");
}
