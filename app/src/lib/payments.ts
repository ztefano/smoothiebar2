import { supabase } from "@/lib/supabase";
import type { Payment } from "@/types";

export interface RedsysOrder {
  paymentId: string;
  /** HTML con el formulario auto-enviado que redirige al TPV de Redsys. */
  formHtml: string;
}

/**
 * Invoca la Edge Function `create-redsys-order`, que arma y firma (HMAC
 * SHA256) el formulario de pago en el servidor (la clave de comercio de
 * Redsys nunca debe estar en el cliente). Redsys muestra tarjeta y Bizum
 * en la misma pantalla de pago.
 */
export async function createRedsysOrder(bookingId: string): Promise<RedsysOrder> {
  const { data, error } = await supabase.functions.invoke("create-redsys-order", {
    body: { bookingId },
  });

  if (error) throw error;
  return data as RedsysOrder;
}

/** El cliente elige pagar en efectivo: crea el registro pendiente de confirmación del chofer. */
export async function requestCashPayment(bookingId: string, amount: number) {
  const { error } = await supabase.from("payments").insert({
    booking_id: bookingId,
    provider: "cash",
    status: "pending",
    amount,
  });
  if (error) throw error;
}

/** El chofer confirma que recibió el efectivo. */
export async function confirmCashPayment(paymentId: string) {
  const { error } = await supabase
    .from("payments")
    .update({ status: "approved" })
    .eq("id", paymentId)
    .eq("provider", "cash");
  if (error) throw error;
}

export async function getPayment(bookingId: string): Promise<Payment | null> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as Payment | null;
}
