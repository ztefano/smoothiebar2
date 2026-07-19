import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/** El viaje que el chofer tiene en curso ahora mismo (aceptado o en camino), si tiene alguno. */
export function useActiveDriverBooking(driverId: string | null) {
  const [bookingId, setBookingId] = useState<string | null | undefined>(undefined);

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
  }, [driverId]);

  return bookingId; // undefined = cargando, null = sin viaje activo
}
