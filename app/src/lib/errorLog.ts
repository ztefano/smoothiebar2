type Listener = (logs: string[]) => void;

const listeners = new Set<Listener>();
let logs: string[] = [];

/** Guarda un mensaje de error para mostrarlo en la burbuja de diagnóstico. */
export function pushError(message: string) {
  const stamp = new Date().toLocaleTimeString("es-ES");
  logs = [`${stamp}  ${message}`, ...logs].slice(0, 30);
  listeners.forEach((l) => l(logs));
}

export function subscribeErrors(listener: Listener): () => void {
  listeners.add(listener);
  listener(logs);
  return () => {
    listeners.delete(listener);
  };
}

export function clearErrors() {
  logs = [];
  listeners.forEach((l) => l(logs));
}
