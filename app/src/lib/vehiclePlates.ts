/** Formato actual español (desde 2000): 4 dígitos + 3 consonantes, sin
 * vocales ni Ñ/Q. Ej: 1234 BCD. */
const CURRENT_PLATE = /^\d{4}[BCDFGHJKLMNPRSTVWXYZ]{3}$/;

/** Formato antiguo (provincia, hasta 2000): 1-2 letras + 4 dígitos + 1-2
 * letras. Ej: B 1234 CD. Se sigue aceptando porque todavía circulan. */
const OLD_PLATE = /^[A-Z]{1,2}\d{4}[A-Z]{1,2}$/;

function normalizePlate(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function isValidSpanishPlate(raw: string): boolean {
  const normalized = normalizePlate(raw);
  return CURRENT_PLATE.test(normalized) || OLD_PLATE.test(normalized);
}

/** Matrícula con un espacio en el medio para mostrarla legible (no altera
 * el valor guardado, solo para UI). */
export function formatSpanishPlate(raw: string): string {
  const normalized = normalizePlate(raw);
  if (CURRENT_PLATE.test(normalized)) {
    return `${normalized.slice(0, 4)} ${normalized.slice(4)}`;
  }
  return normalized;
}
