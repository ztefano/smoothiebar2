// Edge Function: crea una cuenta de chofer. Solo puede llamarla un usuario
// autenticado con profiles.is_admin = true. El chofer creado no pasa por
// registro propio: entra directo con el email/contraseña que le da el admin.
//
// Sin dependencias de archivos compartidos a propósito, para poder
// desplegarla pegando este archivo directo en el editor del dashboard de
// Supabase (sin necesidad de la CLI).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Falta autenticación.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Falta configuración del proyecto.");
    }

    // Cliente con la identidad de quien llama, para validar que sea admin.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) throw new Error("No autenticado.");

    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("is_admin")
      .eq("id", caller.id)
      .single();

    if (!callerProfile?.is_admin) {
      return new Response(JSON.stringify({ error: "No autorizado." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fullName, lastName, phone, email, password } = await req.json();
    if (!fullName || !lastName || !email || !password) throw new Error("Faltan datos del chofer.");

    // Cliente con la service role key: puede crear usuarios directamente.
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // el chofer puede loguearse de inmediato, sin confirmar mail
      user_metadata: {
        full_name: fullName,
        last_name: lastName,
        phone: phone ?? null,
        role: "driver",
      },
    });

    if (error) throw error;

    return new Response(JSON.stringify({ userId: created.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
