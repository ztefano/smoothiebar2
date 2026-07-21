let counter = 0;

/** Nombre de canal de Realtime único por instancia. Dos componentes que se
 * suscriben al mismo dato (ej: la pestaña Servicio y la ventana flotante de
 * viaje nuevo) no pueden compartir el mismo nombre de canal — el segundo
 * choca con "cannot add postgres_changes callbacks ... after subscribe()".
 * Este sufijo garantiza que cada suscripción tenga su propio canal. */
export function uniqueChannelName(base: string): string {
  counter += 1;
  return `${base}-${counter}-${Date.now().toString(36)}`;
}
