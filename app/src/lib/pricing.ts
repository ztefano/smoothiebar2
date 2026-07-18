import { haversineDistanceKm } from "@/lib/distance";
import type { Coordinates } from "@/types";

/**
 * Tarifa simple para el MVP: tarifa base + costo por km en línea recta.
 * Ajustar estos valores (o reemplazar por una tabla en la base de datos)
 * cuando se defina la tarifa real del negocio.
 */
const BASE_FARE_EUR = 25;
const PRICE_PER_KM_EUR = 1.1;
const NIGHT_SURCHARGE_MULTIPLIER = 1.2;

export function isNightTime(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= 23 || hour < 6;
}

export function estimatePrice(
  pickup: Coordinates,
  dropoff: Coordinates | null,
  when: Date = new Date()
): number {
  const distanceKm = dropoff ? haversineDistanceKm(pickup, dropoff) : 5; // estimación default sin destino
  let price = BASE_FARE_EUR + distanceKm * PRICE_PER_KM_EUR;

  if (isNightTime(when)) {
    price *= NIGHT_SURCHARGE_MULTIPLIER;
  }

  return Math.round(price * 2) / 2; // redondeo a 0,50 €
}

export function formatEuros(amount: number): string {
  return amount.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}
