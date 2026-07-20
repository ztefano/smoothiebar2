import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRefreshBus } from "@/hooks/useRefreshBus";
import type { Booking } from "@/types";

const ACTIVE_STATUSES: Booking["status"][] = ["pending", "accepted", "in_progress"];

/** La reserva activa más reciente del cliente (si tiene alguna), con tiempo
 * real — para poder avisarle en el momento en que le asignan un chofer. */
export function useActiveClientBooking(clientId: string | null) {
  const [booking, setBooking] = useState<Booking | null | undefined>(undefined);

  const reload = useCallback(async () => {
    if (!clientId) return;
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("client_id", clientId)
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setBooking((data as Booking) ?? null);
  }, [clientId]);

  useRefreshBus(reload);

  useEffect(() => {
    if (!clientId) return;
    reload();

    const channel = supabase
      .channel(`active-client-booking-${clientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `client_id=eq.${clientId}` },
        () => reload()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, reload]);

  return booking; // undefined = cargando, null = sin viaje activo
}
