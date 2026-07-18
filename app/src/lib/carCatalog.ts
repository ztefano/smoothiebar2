/**
 * Catálogo de marcas y modelos más comunes en España. No es exhaustivo:
 * si el vehículo del cliente no aparece, puede tipear la marca/modelo a
 * mano igual (ver "Otra marca" en el selector).
 */
export const CAR_CATALOG: Record<string, string[]> = {
  Seat: ["Ibiza", "León", "Arona", "Ateca", "Tarraco", "Leon Sportstourer", "Mii"],
  Renault: ["Clio", "Megane", "Captur", "Kadjar", "Scenic", "Twingo", "Austral", "Arkana"],
  Peugeot: ["208", "2008", "308", "3008", "5008", "108", "508", "Rifter"],
  Citroën: ["C3", "C4", "C5 Aircross", "Berlingo", "C1", "C3 Aircross", "C5 X"],
  Volkswagen: ["Golf", "Polo", "Tiguan", "Passat", "T-Roc", "T-Cross", "Ibiza", "Touareg", "ID.3", "ID.4"],
  Toyota: ["Corolla", "Yaris", "C-HR", "RAV4", "Aygo", "Auris", "Camry", "Land Cruiser"],
  Ford: ["Fiesta", "Focus", "Kuga", "Puma", "EcoSport", "Mondeo", "Ranger"],
  Opel: ["Corsa", "Astra", "Mokka", "Crossland", "Grandland", "Insignia"],
  BMW: ["Serie 1", "Serie 2", "Serie 3", "Serie 5", "X1", "X3", "X5", "Z4"],
  "Mercedes-Benz": ["Clase A", "Clase C", "Clase E", "GLA", "GLC", "CLA", "Clase B"],
  Audi: ["A1", "A3", "A4", "A6", "Q2", "Q3", "Q5", "TT"],
  Hyundai: ["i10", "i20", "i30", "Tucson", "Kona", "Santa Fe", "Bayon"],
  Kia: ["Picanto", "Rio", "Ceed", "Sportage", "Niro", "Stonic", "Sorento"],
  Nissan: ["Micra", "Juke", "Qashqai", "X-Trail", "Leaf", "Note"],
  Fiat: ["500", "Panda", "Tipo", "500X", "Punto", "Doblo"],
  Skoda: ["Fabia", "Octavia", "Kamiq", "Karoq", "Kodiaq", "Superb"],
  Dacia: ["Sandero", "Duster", "Spring", "Jogger", "Logan"],
  Volvo: ["XC40", "XC60", "XC90", "S60", "V60", "V40"],
  Mazda: ["Mazda2", "Mazda3", "CX-3", "CX-5", "CX-30"],
  Honda: ["Civic", "CR-V", "Jazz", "HR-V"],
  Mini: ["Cooper", "Countryman", "Clubman"],
  Suzuki: ["Swift", "Vitara", "S-Cross", "Ignis", "Jimny"],
  Jeep: ["Renegade", "Compass", "Cherokee", "Wrangler"],
  "Land Rover": ["Range Rover Evoque", "Discovery Sport", "Defender", "Range Rover Sport"],
  Lexus: ["CT", "NX", "RX", "UX"],
  Porsche: ["911", "Cayenne", "Macan", "Panamera"],
  Tesla: ["Model 3", "Model S", "Model X", "Model Y"],
  Chevrolet: ["Spark", "Aveo", "Captiva"],
  "Alfa Romeo": ["Giulietta", "Giulia", "Stelvio", "Tonale"],
  Mitsubishi: ["Space Star", "ASX", "Eclipse Cross", "Outlander"],
  Subaru: ["Impreza", "XV", "Forester"],
  Smart: ["Fortwo", "Forfour"],
  Jaguar: ["XE", "F-Pace", "E-Pace"],
  SsangYong: ["Tivoli", "Korando", "Rexton"],
  DS: ["DS 3", "DS 4", "DS 7"],
  Cupra: ["Leon", "Formentor", "Born", "Ateca"],
  MG: ["MG3", "ZS", "MG4", "HS"],
};

export const CAR_BRANDS = Object.keys(CAR_CATALOG).sort((a, b) => a.localeCompare(b, "es"));

export function modelsForBrand(brand: string): string[] {
  return CAR_CATALOG[brand] ?? [];
}
