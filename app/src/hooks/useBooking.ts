import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRefreshBus } from "@/hooks/useRefreshBus";
import { uniqueChannelName } from "@/lib/realtime";
import type { Booking, BookingStatus } from "@/types";

export function useBooking(bookingId: string | null) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!bookingId) return;
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();
    if (!error) setBooking(data as Booking);
    setLoading(false);
  }, [bookingId]);

  useRefreshBus(reload);

  useEffect(() => {
    if (!bookingId) return;
    setLoading(true);
    reload();

    const channel = supabase
      .channel(uniqueChannelName(`booking-${bookingId}`))
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${bookingId}`,
        },
        (payload) => setBooking(payload.new as Booking)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, reload]);

  async function updateStatus(status: BookingStatus) {
    if (!bookingId) return;
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);
    if (error) throw error;
  }

  return { booking, loading, reload, updateStatus };
}

/** Solicitudes pendientes visibles para cualquier chofer disponible. */
export function usePendingBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    if (!error) setBookings((data ?? []) as Booking[]);
    setLoading(false);
  }, []);

  useRefreshBus(reload);

  useEffect(() => {
    reload();

    const channel = supabase
      .channel(uniqueChannelName("pending-bookings"))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => reload()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload]);

  return { bookings, loading, reload };
}

/** Todas las reservas (para el admin), en tiempo real, para las pestañas
 * por estado en la pantalla de Solicitudes. */
export function useAllBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setBookings((data ?? []) as Booking[]);
    setLoading(false);
  }, []);

  useRefreshBus(reload);

  useEffect(() => {
    reload();
    const channel = supabase
      .channel(uniqueChannelName("all-bookings"))
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => reload())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [reload]);

  return { bookings, loading, reload };
}

/** Reservas asignadas a un chofer puntual (todas menos las pendientes), en
 * tiempo real. Usado en la pestaña Solicitudes del chofer no-admin. */
export function useDriverBookings(driverId: string | null) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!driverId) return;
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false });
    if (!error) setBookings((data ?? []) as Booking[]);
    setLoading(false);
  }, [driverId]);

  useRefreshBus(reload);

  useEffect(() => {
    if (!driverId) return;
    reload();
    const channel = supabase
      .channel(uniqueChannelName(`driver-bookings-${driverId}`))
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

  return { bookings, loading, reload };
}
