import { useEffect } from "react";
import { subscribeGlobalRefresh } from "@/lib/refreshBus";

/** Vuelve a ejecutar `callback` cuando se dispara un refresco global
 * (botón flotante de actualizar). */
export function useRefreshBus(callback: () => void) {
  useEffect(() => subscribeGlobalRefresh(callback), [callback]);
}
