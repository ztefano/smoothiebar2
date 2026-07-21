import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { uniqueChannelName } from "@/lib/realtime";
import type { Coordinates } from "@/types";

/** Se suscribe en tiempo real a la posición del chofer para una reserva. */
export function useDriverLocation(bookingId: string | null): Coordinates | null {
  const [location, setLocation] = useState<Coordinates | null>(null);

  useEffect(() => {
    if (!bookingId) return;

    supabase
      .from("driver_locations")
      .select("lat, lng")
      .eq("booking_id", bookingId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLocation({ lat: data.lat, lng: data.lng });
      });

    const channel = supabase
      .channel(uniqueChannelName(`driver-location-${bookingId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_locations",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          const row = payload.new as { lat: number; lng: number } | undefined;
          if (row) setLocation({ lat: row.lat, lng: row.lng });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  return location;
}

/** Publica (upsert) la posición del chofer para la reserva activa. */
export async function publishDriverLocation(
  bookingId: string,
  driverId: string,
  coords: Coordinates
) {
  const { error } = await supabase.from("driver_locations").upsert({
    booking_id: bookingId,
    driver_id: driverId,
    lat: coords.lat,
    lng: coords.lng,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
