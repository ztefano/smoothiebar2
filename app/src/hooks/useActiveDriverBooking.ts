import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRefreshBus } from "@/hooks/useRefreshBus";
import { uniqueChannelName } from "@/lib/realtime";

/** El viaje que el chofer tiene en curso ahora mismo (aceptado o en camino), si tiene alguno.
 * Con tiempo real: cuando el admin le asigna un viaje nuevo, aparece solo, sin
 * que el chofer tenga que salir y volver a entrar a la pestaña "Servicio". */
export function useActiveDriverBooking(driverId: string | null) {
  const [bookingId, setBookingId] = useState<string | null | undefined>(undefined);

  const reload = useCallback(async () => {
    if (!driverId) return;
    const { data } = await supabase
      .from("bookings")
      .select("id")
      .eq("driver_id", driverId)
      .in("status", ["accepted", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setBookingId((data?.id as string) ?? null);
  }, [driverId]);

  useRefreshBus(reload);

  useEffect(() => {
    if (!driverId) return;
    reload();

    const channel = supabase
      .channel(uniqueChannelName(`active-driver-booking-${driverId}`))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `driver_id=eq.${driverId}` },
        () => reload()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, reload]);

  return bookingId; // undefined = cargando, null = sin viaje activo
}
