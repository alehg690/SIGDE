export type TipoSituacion = 'Tipo I' | 'Tipo II' | 'Tipo III';

export type ReglaTipoSituacion = {
  tipo: TipoSituacion;
  articulo: string;
  descripcion: string;
  competencia: string;
  accion: 'disuasiva' | 'correctiva' | 'reeducativa';
  instancia: 'Docente o director de grupo' | 'Coordinación' | 'Comité Escolar de Convivencia';
  requiereSiuce: boolean;
  pasosRaice: number[];
};

export const TIPOS_SITUACION: Record<TipoSituacion, ReglaTipoSituacion> = {
  'Tipo I': {
    tipo: 'Tipo I',
    articulo: 'Art. 149, Art. 155',
    descripcion:
      'Situaciones esporádicas o del diario vivir escolar que afectan levemente el clima escolar y no generan daño al cuerpo, la salud o la integridad física o mental.',
    competencia: 'Docentes de área o directores de grupo.',
    accion: 'disuasiva',
    instancia: 'Docente o director de grupo',
    requiereSiuce: false,
    pasosRaice: [1, 2, 3],
  },
  'Tipo II': {
    tipo: 'Tipo II',
    articulo: 'Art. 149, Art. 156',
    descripcion:
      'Situaciones de agresión, acoso o ciberacoso que afectan de forma importante la convivencia, son reiterativas o frecuentes y generan daño sin incapacidad.',
    competencia: 'Coordinación con apoyo de la Comisión Escolar de Convivencia.',
    accion: 'correctiva',
    instancia: 'Coordinación',
    requiereSiuce: true,
    pasosRaice: [4, 5],
  },
  'Tipo III': {
    tipo: 'Tipo III',
    articulo: 'Art. 149, Art. 157',
    descripcion:
      'Situaciones graves o presuntamente constitutivas de delito que afectan la integridad, libertad, formación humana, sexual o reproductiva.',
    competencia: 'Comité Escolar de Convivencia y Consejo Directivo.',
    accion: 'reeducativa',
    instancia: 'Comité Escolar de Convivencia',
    requiereSiuce: true,
    pasosRaice: [6, 7],
  },
};

export const PASOS_RAICE = [
  {
    paso: 1,
    nombre: 'Llamado de atención verbal',
    responsable: 'Docente o director de grupo',
    aplicaA: ['Tipo I'],
  },
  {
    paso: 2,
    nombre: 'Registro en observador o anecdotario',
    responsable: 'Docente o director de grupo',
    aplicaA: ['Tipo I'],
  },
  {
    paso: 3,
    nombre: 'Notificación al acudiente',
    responsable: 'Docente o director de grupo',
    aplicaA: ['Tipo I'],
  },
  {
    paso: 4,
    nombre: 'Intervención de coordinación y protocolo PR-01',
    responsable: 'Coordinación',
    aplicaA: ['Tipo II'],
  },
  {
    paso: 5,
    nombre: 'Apoyo psicosocial o remisión externa si aplica',
    responsable: 'Coordinación',
    aplicaA: ['Tipo II', 'Tipo III'],
  },
  {
    paso: 6,
    nombre: 'Intervención del Comité Escolar de Convivencia',
    responsable: 'Comité Escolar de Convivencia',
    aplicaA: ['Tipo III'],
  },
  {
    paso: 7,
    nombre: 'Decisión reeducativa y seguimiento de cierre',
    responsable: 'Comité Escolar de Convivencia / Consejo Directivo',
    aplicaA: ['Tipo III'],
  },
];

export const SITUACIONES_TIPIFICADAS = {
  'Tipo I': [
    'Juegos bruscos sin daño físico grave',
    'Peleas sin daño físico',
    'Apodos, burlas o mofas',
    'Vocabulario soez',
    'Interrupción reiterada de clase',
    'Uso no autorizado de equipos electrónicos',
    'Agresión digital leve por una sola vez',
  ],
  'Tipo II': [
    'Incumplimiento reiterado de compromisos disuasivos',
    'Agresión física sin heridas graves',
    'Acoso verbal o virtual por una sola vez sin agravantes',
    'Discriminación sistemática o acoso escolar',
    'Portar o consumir sustancias psicoactivas por una sola vez',
    'Fraude, plagio o apropiación de material escolar',
  ],
  'Tipo III': [
    'Incumplimiento de la activación de la RAICE',
    'Lesiones personales con incapacidad',
    'Amenazas, coacción, chantaje o extorsión',
    'Acoso sexual o vulneración grave de DHSR',
    'Porte o distribución de sustancias psicoactivas',
    'Porte de armas o elementos peligrosos',
    'Conductas presuntamente delictivas o de responsabilidad penal adolescente',
    'Acoso escolar o ciberacoso sistemático',
  ],
} satisfies Record<TipoSituacion, string[]>;

export function normalizarTipoSituacion(tipo: string): TipoSituacion | null {
  const value = tipo.trim().toLowerCase().replace(/\s+/g, ' ');
  if (value === 'tipo i' || value === 'tipo 1' || value === '1') return 'Tipo I';
  if (value === 'tipo ii' || value === 'tipo 2' || value === '2') return 'Tipo II';
  if (value === 'tipo iii' || value === 'tipo 3' || value === '3') return 'Tipo III';
  return null;
}

export function obtenerReglaTipo(tipo: TipoSituacion) {
  return TIPOS_SITUACION[tipo];
}

export function obtenerManualConvivenciaBackend() {
  return {
    fuente: 'Manual de Convivencia Institucional 2025 en actualización 2026',
    archivo: 'docs/manual-convivencia-institucional-2025-actualizacion-2026.pdf',
    tipos: Object.values(TIPOS_SITUACION),
    pasosRaice: PASOS_RAICE,
    situacionesTipificadas: SITUACIONES_TIPIFICADAS,
  };
}
