import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRefreshBus } from "@/hooks/useRefreshBus";

/** Horarios (de cualquier cliente, más los bloqueos manuales del admin) ya
 * ocupados para el mismo día que `date`. */
export function useBookedTimes(date: Date): { times: Date[]; loading: boolean } {
  const [times, setTimes] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const dayKey = date.toDateString();

  useRefreshBus(() => setTick((t) => t + 1));

  useEffect(() => {
    setLoading(true);
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    supabase
      .from("booked_slots")
      .select("scheduled_at")
      .gte("scheduled_at", start.toISOString())
      .lt("scheduled_at", end.toISOString())
      .then(({ data }) => {
        setTimes((data ?? []).map((row) => new Date(row.scheduled_at as string)));
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, tick]);

  return { times, loading };
}
