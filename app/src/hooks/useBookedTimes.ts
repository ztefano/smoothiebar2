import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/** Horarios (de cualquier cliente) ya reservados para el mismo día que `date`. Solo informativo. */
export function useBookedTimes(date: Date): Date[] {
  const [times, setTimes] = useState<Date[]>([]);
  const dayKey = date.toDateString();

  useEffect(() => {
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
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey]);

  return times;
}
