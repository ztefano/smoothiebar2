import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/** Cantidad de choferes activos (habilitados por el admin). Determina cuántas
 * reservas puede haber al mismo horario antes de que se bloquee. */
export function useActiveDriverCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "driver")
      .eq("is_active", true)
      .then(({ count: c }) => setCount(c ?? 0));
  }, []);

  return count;
}
