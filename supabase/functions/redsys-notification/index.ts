// Edge Function: recibe la notificación server-to-server que Redsys envía
// tras procesar el pago (Ds_Merchant_MerchantURL). Es la única fuente de
// verdad sobre el resultado del pago: nunca confiar en la URL de retorno
// del navegador/WebView para eso.
import { corsHeaders, createAdminClient } from "../_shared/supabaseAdmin.ts";
import { verifyRedsysNotification } from "../_shared/redsys.ts";

// Códigos Ds_Response 0000-0099 (y 900) son autorizaciones aprobadas.
function isApproved(dsResponse: string): boolean {
  const code = Number(dsResponse);
  return Number.isFinite(code) && (code <= 99 || code === 900);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const merchantKey = Deno.env.get("REDSYS_MERCHANT_KEY");
    if (!merchantKey) throw new Error("Falta REDSYS_MERCHANT_KEY en los secrets de la función.");

    const contentType = req.headers.get("content-type") ?? "";
    let merchantParametersB64: string;
    let receivedSignature: string;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      merchantParametersB64 = body.Ds_MerchantParameters;
      receivedSignature = body.Ds_Signature;
    } else {
      const form = await req.formData();
      merchantParametersB64 = String(form.get("Ds_MerchantParameters"));
      receivedSignature = String(form.get("Ds_Signature"));
    }

    const { valid, params } = await verifyRedsysNotification(
      merchantKey,
      merchantParametersB64,
      receivedSignature
    );

    if (!valid) {
      return new Response("Firma inválida", { status: 400, headers: corsHeaders });
    }

    const supabase = createAdminClient();
    const approved = isApproved(params.Ds_Response);

    const { error } = await supabase
      .from("payments")
      .update({
        status: approved ? "approved" : "rejected",
        raw_payload: params,
      })
      .eq("external_reference", params.Ds_Order)
      .eq("provider", "redsys");

    if (error) throw error;

    return new Response("OK", { headers: corsHeaders });
  } catch (err) {
    return new Response((err as Error).message, { status: 400, headers: corsHeaders });
  }
});
