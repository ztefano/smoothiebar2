import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRefreshBus } from "@/hooks/useRefreshBus";

/** El viaje que el chofer tiene en curso ahora mismo (aceptado o en camino), si tiene alguno. */
export function useActiveDriverBooking(driverId: string | null) {
  const [bookingId, setBookingId] = useState<string | null | undefined>(undefined);
  const [tick, setTick] = useState(0);

  useRefreshBus(() => setTick((t) => t + 1));

  useEffect(() => {
    if (!driverId) return;
    supabase
      .from("bookings")
      .select("id")
      .eq("driver_id", driverId)
      .in("status", ["accepted", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setBookingId((data?.id as string) ?? null);
      });
  }, [driverId, tick]);

  return bookingId; // undefined = cargando, null = sin viaje activo
}
