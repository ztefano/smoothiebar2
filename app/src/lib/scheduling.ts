/** Duración mínima asumida de un servicio: una reserva a las t deja al
 * chofer ocupado desde t hasta t + este valor (o sea que también cuenta
 * contra la disponibilidad de la franja siguiente, no solo la suya). */
export const MIN_SERVICE_MS = 60 * 60 * 1000;
