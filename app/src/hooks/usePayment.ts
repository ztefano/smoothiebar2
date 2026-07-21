import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRefreshBus } from "@/hooks/useRefreshBus";
import { uniqueChannelName } from "@/lib/realtime";
import type { Payment } from "@/types";

/** Pago (si existe) asociado a una reserva, con actualización en tiempo real. */
export function usePayment(bookingId: string | null) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!bookingId) return;
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setPayment((data as Payment) ?? null);
    setLoading(false);
  }, [bookingId]);

  useRefreshBus(reload);

  useEffect(() => {
    if (!bookingId) return;
    setLoading(true);
    reload();

    const channel = supabase
      .channel(uniqueChannelName(`payment-${bookingId}`))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments", filter: `booking_id=eq.${bookingId}` },
        () => reload()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, reload]);

  return { payment, loading, reload };
}
