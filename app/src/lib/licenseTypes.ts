/** Categorías del permiso de conducir en España. Se permite igual escribir
 * una combinación a mano (ej: "B, C1") si no alcanza con una sola. */
export const LICENSE_TYPES: string[] = [
  "AM",
  "A1",
  "A2",
  "A",
  "B",
  "B+E",
  "BTP",
  "C1",
  "C1+E",
  "C",
  "C+E",
  "D1",
  "D1+E",
  "D",
  "D+E",
];

export const DOCUMENT_TYPES = ["DNI", "NIE", "Pasaporte"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];
