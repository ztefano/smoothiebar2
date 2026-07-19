import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AdminBlockedSlot } from "@/types";

/** Bloqueos manuales de horario (admin), próximos desde ahora. */
export function useAdminBlockedSlots() {
  const [slots, setSlots] = useState<AdminBlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admin_blocked_slots")
      .select("*")
      .gte("blocked_at", new Date().toISOString())
      .order("blocked_at", { ascending: true });
    setSlots((data ?? []) as AdminBlockedSlot[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function addBlock(blockedAt: Date, note: string) {
    const { error } = await supabase
      .from("admin_blocked_slots")
      .insert({ blocked_at: blockedAt.toISOString(), note: note.trim() || null });
    if (error) throw error;
    await reload();
  }

  async function removeBlock(id: string) {
    const { error } = await supabase.from("admin_blocked_slots").delete().eq("id", id);
    if (error) throw error;
    await reload();
  }

  return { slots, loading, addBlock, removeBlock };
}
