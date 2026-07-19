export interface CarZone {
  key: string;
  label: string;
}

/** Zonas del coche vistas desde arriba, de adelante hacia atrás. */
export const CAR_ZONES: CarZone[] = [
  { key: "parachoques_delantero", label: "Parachoques delantero" },
  { key: "capo", label: "Capó" },
  { key: "lateral_izquierdo", label: "Lateral izquierdo" },
  { key: "techo", label: "Techo" },
  { key: "lateral_derecho", label: "Lateral derecho" },
  { key: "maletero", label: "Maletero" },
  { key: "parachoques_trasero", label: "Parachoques trasero" },
];
