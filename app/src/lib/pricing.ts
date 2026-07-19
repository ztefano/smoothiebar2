import { haversineDistanceKm } from "@/lib/distance";
import type { Coordinates, PricingConfig } from "@/types";

/**
 * Tarifa plana hasta `flat_km`, más extra por km si el trayecto es más
 * largo, más un recargo si el punto de recogida está fuera de la zona de
 * servicio (más allá de `zone_radius_km` desde el centro configurado).
 * Estos valores se configuran desde el panel de admin (pantalla Empresa).
 */
export function estimatePrice(
  pickup: Coordinates,
  dropoff: Coordinates | null,
  config: PricingConfig
): number {
  const tripKm = dropoff ? haversineDistanceKm(pickup, dropoff) : config.flat_km;
  const extraTripKm = Math.max(0, tripKm - config.flat_km);

  const zoneCenter: Coordinates = { lat: config.zone_center_lat, lng: config.zone_center_lng };
  const pickupDistanceFromCenterKm = haversineDistanceKm(pickup, zoneCenter);
  const outOfZoneKm = Math.max(0, pickupDistanceFromCenterKm - config.zone_radius_km);

  const price =
    config.flat_fare +
    extraTripKm * config.extra_km_price +
    outOfZoneKm * config.out_of_zone_km_price;

  return Math.round(price * 2) / 2; // redondeo a 0,50 €
}

/** Precio final pagando en efectivo, con el descuento configurado por el admin. */
export function applyCashDiscount(price: number, config: PricingConfig): number {
  const discounted = price * (1 - config.cash_discount_rate);
  return Math.round(discounted * 2) / 2; // redondeo a 0,50 €
}

export function formatEuros(amount: number): string {
  return amount.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}
