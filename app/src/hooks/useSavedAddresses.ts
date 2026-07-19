import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRefreshBus } from "@/hooks/useRefreshBus";
import type { Coordinates, SavedAddress } from "@/types";

export function useSavedAddresses(clientId: string | null) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from("saved_addresses")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });
    setAddresses((data ?? []) as SavedAddress[]);
    setLoading(false);
  }, [clientId]);

  useRefreshBus(reload);

  useEffect(() => {
    reload();
  }, [reload]);

  async function addAddress(input: { label: string; address: string; coords: Coordinates }) {
    if (!clientId) return;
    const { error } = await supabase.from("saved_addresses").insert({
      client_id: clientId,
      label: input.label.trim(),
      address: input.address.trim(),
      lat: input.coords.lat,
      lng: input.coords.lng,
    });
    if (error) throw error;
    await reload();
  }

  async function removeAddress(id: string) {
    const { error } = await supabase.from("saved_addresses").delete().eq("id", id);
    if (error) throw error;
    await reload();
  }

  return { addresses, loading, addAddress, removeAddress, reload };
}
