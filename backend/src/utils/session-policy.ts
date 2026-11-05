const CORREOS_SIN_LIMITE_INACTIVIDAD = new Set([
  'alehg690@gmail.com',
]);

export function sinLimiteInactividad(correo: string) {
  return CORREOS_SIN_LIMITE_INACTIVIDAD.has(correo.trim().toLowerCase());
}
