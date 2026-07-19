import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { BusinessHours } from "@/types";

/** Horarios de la empresa por día de semana (0=domingo...6=sábado). */
export function useBusinessHours() {
  const [hours, setHours] = useState<BusinessHours[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("business_hours")
      .select("*")
      .order("day_of_week", { ascending: true });
    setHours((data ?? []) as BusinessHours[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { hours, loading, reload };
}

export function hoursForDate(hours: BusinessHours[], date: Date): BusinessHours | null {
  return hours.find((h) => h.day_of_week === date.getDay()) ?? null;
}

/** "HH:MM:SS" -> Date con esa hora/minuto sobre el día dado. */
export function timeStringToDate(base: Date, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const result = new Date(base);
  result.setHours(h, m, 0, 0);
  return result;
}
