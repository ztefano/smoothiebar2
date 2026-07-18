import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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

  useEffect(() => {
    if (!bookingId) return;
    setLoading(true);
    reload();

    const channel = supabase
      .channel(`booking-${bookingId}`)
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

  useEffect(() => {
    reload();

    const channel = supabase
      .channel("pending-bookings")
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
