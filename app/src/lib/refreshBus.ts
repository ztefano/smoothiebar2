type Listener = () => void;

const listeners = new Set<Listener>();

/** Avisa a todos los hooks de datos suscritos que vuelvan a pedir sus datos
 * (usado por el botón flotante de actualizar, además de la actualización OTA). */
export function triggerGlobalRefresh() {
  listeners.forEach((listener) => listener());
}

export function subscribeGlobalRefresh(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
