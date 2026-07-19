import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRefreshBus } from "@/hooks/useRefreshBus";
import type { PricingConfig } from "@/types";

/** Configuración de tarifas (fila única). */
export function usePricingConfig() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("pricing_config").select("*").eq("id", 1).single();
    setConfig((data as PricingConfig) ?? null);
    setLoading(false);
  }, []);

  useRefreshBus(reload);

  useEffect(() => {
    reload();
  }, [reload]);

  return { config, loading, reload };
}
