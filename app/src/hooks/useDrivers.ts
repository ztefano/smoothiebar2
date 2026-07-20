import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRefreshBus } from "@/hooks/useRefreshBus";
import type { Profile } from "@/types";

/** Todos los choferes (incluye al propio admin si su cuenta también tiene
 * role='driver', que es como está armado hoy: el admin es un chofer más
 * con is_admin=true). Usado tanto para el panel "Choferes" como para el
 * selector de asignación de un viaje. */
export function useDrivers() {
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "driver")
      .order("full_name", { ascending: true });
    setDrivers((data ?? []) as Profile[]);
    setLoading(false);
  }, []);

  useRefreshBus(reload);

  useEffect(() => {
    reload();
  }, [reload]);

  return { drivers, loading, reload };
}
