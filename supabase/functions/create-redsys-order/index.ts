// Edge Function: crea una orden de pago en Redsys (tarjeta + Bizum) para
// una reserva ya completada, y devuelve el HTML con el formulario que hay
// que auto-enviar al TPV de Redsys desde el WebView de la app.
import { corsHeaders, createAdminClient } from "../_shared/supabaseAdmin.ts";
import { generateOrderId, signRedsysRequest } from "../_shared/redsys.ts";

const REDSYS_ENDPOINT =
  Deno.env.get("REDSYS_ENV") === "production"
    ? "https://sis.redsys.es/sis/realizarPago"
    : "https://sis-t.redsys.es:25443/sis/realizarPago"; // entorno de pruebas

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { bookingId } = await req.json();
    if (!bookingId) throw new Error("Falta bookingId");

    const merchantCode = Deno.env.get("REDSYS_MERCHANT_CODE");
    const terminal = Deno.env.get("REDSYS_TERMINAL") ?? "001";
    const merchantKey = Deno.env.get("REDSYS_MERCHANT_KEY");
    const appScheme = Deno.env.get("APP_SCHEME") ?? "choferdereemplazo";
    const notificationUrl = Deno.env.get("REDSYS_NOTIFICATION_URL");

    if (!merchantCode || !merchantKey || !notificationUrl) {
      throw new Error(
        "Faltan REDSYS_MERCHANT_CODE / REDSYS_MERCHANT_KEY / REDSYS_NOTIFICATION_URL en los secrets de la función."
      );
    }

    const supabase = createAdminClient();

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, price_estimate, status")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) throw new Error("Reserva no encontrada");
    if (booking.status !== "completed") {
      throw new Error("Solo se puede pagar un viaje ya completado");
    }

    const orderId = generateOrderId();
    // Redsys espera el importe en céntimos, como string sin separadores.
    const amountInCents = Math.round(Number(booking.price_estimate) * 100).toString();

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        booking_id: booking.id,
        provider: "redsys",
        external_reference: orderId,
        status: "pending",
        amount: booking.price_estimate,
      })
      .select("id")
      .single();

    if (paymentError) throw paymentError;

    const merchantParameters: Record<string, string> = {
      DS_MERCHANT_AMOUNT: amountInCents,
      DS_MERCHANT_ORDER: orderId,
      DS_MERCHANT_MERCHANTCODE: merchantCode,
      DS_MERCHANT_CURRENCY: "978", // EUR
      DS_MERCHANT_TRANSACTIONTYPE: "0", // autorización
      DS_MERCHANT_TERMINAL: terminal,
      DS_MERCHANT_MERCHANTURL: notificationUrl,
      DS_MERCHANT_URLOK: `${appScheme}://payment/result?bookingId=${booking.id}`,
      DS_MERCHANT_URLKO: `${appScheme}://payment/result?bookingId=${booking.id}`,
      DS_MERCHANT_PRODUCTDESCRIPTION: "Servicio de chofer de reemplazo",
      DS_MERCHANT_MERCHANTNAME: "Chofer de Reemplazo",
      // Habilita explícitamente Bizum junto con tarjeta en la misma pantalla de pago.
      DS_MERCHANT_PAYMETHODS: "C,z",
    };

    const signed = await signRedsysRequest(merchantKey, merchantParameters);

    const formHtml = `<!doctype html>
<html><body onload="document.forms[0].submit()">
  <form action="${REDSYS_ENDPOINT}" method="POST">
    <input type="hidden" name="Ds_SignatureVersion" value="${signed.Ds_SignatureVersion}" />
    <input type="hidden" name="Ds_MerchantParameters" value="${signed.Ds_MerchantParameters}" />
    <input type="hidden" name="Ds_Signature" value="${signed.Ds_Signature}" />
  </form>
</body></html>`;

    return new Response(JSON.stringify({ paymentId: payment.id, formHtml }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
