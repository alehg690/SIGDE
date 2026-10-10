export const DOCUMENT_TYPES = [
  ["RC", "Registro civil"],
  ["TI", "Tarjeta de identidad"],
  ["CC", "Cédula de ciudadanía"],
  ["CE", "Cédula de extranjería"],
  ["PPT", "Permiso por protección temporal"],
  ["PEP", "Permiso especial de permanencia"],
  ["NUIP", "Número único de identificación"],
] as const;

export const NUMERIC_DOCUMENT_TYPES = new Set(["RC", "TI", "CC", "NUIP"]);

export const RELATIONSHIPS = [
  "Madre",
  "Padre",
  "Abuela",
  "Abuelo",
  "Hermana",
  "Hermano",
  "Tía",
  "Tío",
  "Tutor legal",
  "Otro",
] as const;
