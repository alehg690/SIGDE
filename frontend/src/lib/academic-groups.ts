export type JornadaEscolar = 'Mañana' | 'Tarde';

export type GrupoAcademico = {
  grado: string;
  grupo: string;
  jornada: JornadaEscolar;
  etiqueta: string;
};

const GRUPOS_TARDE = new Set([
  '6-4', '6-5',
  '7-4', '7-5', '7-6',
  '8-3', '8-4', '8-5',
  '9-3', '9-4',
  '10-3', '10-4',
  '11-3', '11-4',
]);

const CANTIDAD_GRUPOS: Record<string, number> = {
  '6': 5,
  '7': 6,
  '8': 5,
  '9': 4,
  '10': 4,
  '11': 4,
};

export const GRUPOS_ACADEMICOS: GrupoAcademico[] = Object.entries(CANTIDAD_GRUPOS).flatMap(([grado, cantidad]) =>
  Array.from({ length: cantidad }, (_, index) => {
    const grupo = String(index + 1);
    const etiqueta = `${grado}-${grupo}`;
    return { grado, grupo, etiqueta, jornada: GRUPOS_TARDE.has(etiqueta) ? 'Tarde' : 'Mañana' };
  })
);

export function obtenerGrupoAcademico(grado: string, grupo: string) {
  const gradoNormalizado = grado.trim().replace('°', '');
  const grupoNormalizado = grupo.trim();
  return GRUPOS_ACADEMICOS.find((item) => item.grado === gradoNormalizado && item.grupo === grupoNormalizado) ?? null;
}

export function etiquetaGrupoAcademico(grado: string, grupo: string) {
  return `${grado.trim().replace('°', '')}-${grupo.trim()}`;
}
