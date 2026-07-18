import { createClient } from "npm:@supabase/supabase-js@2.45.4";

/** Cliente con la service role key: solo se usa dentro de Edge Functions, nunca en el cliente. */
export function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en los secrets de la función.");
  }
  return createClient(url, serviceKey);
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
