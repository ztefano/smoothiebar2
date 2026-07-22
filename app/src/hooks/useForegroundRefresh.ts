import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { triggerGlobalRefresh } from "@/lib/refreshBus";
import { supabase } from "@/lib/supabase";

/**
 * Cuando la app vuelve al primer plano, refresca todos los datos y reconecta
 * el Realtime. En React Native, la conexión de Supabase Realtime a veces se
 * corta al minimizar la app y no se recupera sola; sin esto, el cliente no
 * veía los cambios (chofer asignado, firma, etc.) hasta reiniciar la app.
 */
export function useForegroundRefresh() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      const cameToForeground =
        appState.current.match(/inactive|background/) && next === "active";
      appState.current = next;
      if (cameToForeground) {
        // Reconecta el socket de Realtime y vuelve a pedir los datos.
        try {
          supabase.realtime.connect();
        } catch {
          /* best-effort */
        }
        triggerGlobalRefresh();
      }
    });
    return () => sub.remove();
  }, []);
}
