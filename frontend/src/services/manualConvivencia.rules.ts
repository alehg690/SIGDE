import type { Rol } from '@/types/auth';

export type TipoSituacion = 'Tipo 1' | 'Tipo 2' | 'Tipo 3';

export type ManualSituationRule = {
  tipo: TipoSituacion;
  nombre: string;
  descripcion: string;
  competencia: string;
  accion: string;
  notificaAcudiente: 'segun seguimiento' | 'obligatoria' | 'inmediata';
  requiereSiuce: boolean;
  ejemplos: string[];
};

export type ManualProcessStep = {
  paso: number;
  nombre: string;
  responsable: string;
  documento: string;
  descripcion: string;
};

export const manualSituationRules: ManualSituationRule[] = [
  {
    tipo: 'Tipo 1',
    nombre: 'Situacion Tipo I',
    descripcion:
      'Situaciones esporadicas o del diario vivir escolar que afectan el clima escolar sin generar dano al cuerpo, salud o integridad fisica/mental.',
    competencia: 'Docente de area o director de grupo',
    accion: 'Acciones disuasivas: dialogo, reflexion, compromisos y registro progresivo.',
    notificaAcudiente: 'segun seguimiento',
    requiereSiuce: false,
    ejemplos: [
      'Juegos bruscos sin dano fisico',
      'Apodos, burlas o vocabulario soez',
      'Interrupcion continua de clase',
      'Uso no autorizado de dispositivos electronicos',
      'Agresion digital leve por una sola vez',
    ],
  },
  {
    tipo: 'Tipo 2',
    nombre: 'Situacion Tipo II',
    descripcion:
      'Agresion, acoso o ciberacoso que ocurre de forma reiterada o frecuente, genera dano fisico o mental sin incapacidad, o afecta de forma importante la convivencia.',
    competencia: 'Coordinacion con apoyo de la Comision Escolar de Convivencia',
    accion: 'Acciones correctivas: PR-01, citacion/notificacion al acudiente, evidencias, compromisos y seguimiento.',
    notificaAcudiente: 'obligatoria',
    requiereSiuce: true,
    ejemplos: [
      'Agresion fisica sin heridas graves',
      'Peleas o rinas con dano fisico',
      'Acoso verbal presencial o virtual',
      'Discriminacion sistematica',
      'Consumo o porte de sustancias por una sola vez',
    ],
  },
  {
    tipo: 'Tipo 3',
    nombre: 'Situacion Tipo III',
    descripcion:
      'Situaciones graves o presunto delito que afectan la integridad, libertad, formacion sexual/reproductiva, seguridad fisica o mental de la comunidad educativa.',
    competencia: 'Comite Escolar de Convivencia, Consejo Directivo y rectoria',
    accion: 'Acciones reeducativas: remision a CECO, registro SIUCE, ruta especifica y apoyo de entidades externas cuando aplique.',
    notificaAcudiente: 'inmediata',
    requiereSiuce: true,
    ejemplos: [
      'Lesiones personales con incapacidad',
      'Amenazas a docentes, estudiantes o personal',
      'Acoso sexual',
      'Distribucion o expendio de sustancias psicoactivas',
      'Uso de TIC para presunto delito o dano grave a la salud mental',
    ],
  },
];

export const manualProcessSteps: ManualProcessStep[] = [
  {
    paso: 1,
    nombre: 'Llamado verbal',
    responsable: 'Docente',
    documento: 'Registro personal o planilla de convivencia',
    descripcion: 'Dialogo y reflexion disuasiva. El docente registra minimo 3 situaciones Tipo I antes de escalar.',
  },
  {
    paso: 2,
    nombre: 'Observador/anecdotario',
    responsable: 'Docente o director de grupo',
    documento: 'Observador del estudiante',
    descripcion: 'Registro escrito con firma del estudiante. Se recomiendan tres llamados escritos.',
  },
  {
    paso: 3,
    nombre: 'Notificacion al acudiente',
    responsable: 'Docente o director de grupo',
    documento: 'Anecdotario y acta RNV-FR-AT-12 cuando aplique',
    descripcion: 'Ante reiteracion, se convoca y notifica al acudiente. Deben quedar compromisos firmados.',
  },
  {
    paso: 4,
    nombre: 'Remision a coordinacion',
    responsable: 'Coordinacion',
    documento: 'PR-01 con evidencias',
    descripcion: 'Coordinacion revisa, escucha, aplica acciones correctivas y decide cierre o continuidad.',
  },
  {
    paso: 5,
    nombre: 'Apoyo psicosocial',
    responsable: 'Coordinacion / profesional de apoyo',
    documento: 'Remision PRAE-01 o soporte equivalente',
    descripcion: 'Se activa apoyo psicosocial o de salud cuando la situacion lo requiere.',
  },
  {
    paso: 6,
    nombre: 'Comite Escolar de Convivencia',
    responsable: 'CECO / Rector',
    documento: 'PR-01, PCE-01 y carpeta del debido proceso',
    descripcion: 'Atiende Tipo III o continuidad de Tipo II; decide acciones reeducativas y registro SIUCE.',
  },
];

export const exitRules = {
  salidaPedagogica: [
    'Debe estar respaldada por proyecto pedagogico, de aula o area.',
    'Debe reportarse a coordinacion y estar incluida o aprobada institucionalmente.',
    'Requiere autorizacion escrita del acudiente; sin autorizacion el estudiante no sale.',
    'Debe cumplir condiciones de seguridad, acompanamiento y uniforme.',
  ],
  salidaInstitucional: [
    'Registrar acudiente o responsable que retira al estudiante.',
    'Guardar motivo, hora, soporte y funcionario que autoriza.',
    'Notificar a coordinacion, docente de clase y director de grupo.',
    'En urgencia, priorizar integridad del estudiante y dejar trazabilidad posterior de firmas.',
  ],
  firmasRequeridas: ['Director de grupo', 'Docente de clase', 'Coordinacion', 'Acudiente'],
};

export const rolePermissions: Record<Rol, string[]> = {
  Admin: [
    'ver_todo',
    'gestionar_usuarios',
    'configurar_manual',
    'ver_siuce',
    'gestionar_salidas',
    'ver_ia',
  ],
  Coordinador: [
    'ver_reportes',
    'gestionar_tipo_2',
    'remitir_ceco',
    'notificar_acudiente',
    'gestionar_salidas',
    'ver_ia',
  ],
  Docente: [
    'crear_observador',
    'registrar_tipo_1',
    'consultar_historial_permitido',
    'remitir_pr_01',
  ],
  Porteria: ['registrar_salida', 'validar_acudiente', 'notificar_salida_urgente'],
};

export function getSituationRule(tipo: TipoSituacion) {
  return manualSituationRules.find((rule) => rule.tipo === tipo) ?? manualSituationRules[0];
}

export function getRequiredNotification(tipo: TipoSituacion) {
  return getSituationRule(tipo).notificaAcudiente;
}

export function getResponsibleArea(tipo: TipoSituacion) {
  return getSituationRule(tipo).competencia;
}

export function shouldRegisterInSiuce(tipo: TipoSituacion) {
  return getSituationRule(tipo).requiereSiuce;
}

export function canRole(rol: Rol, permission: string) {
  return rolePermissions[rol]?.includes(permission) || rolePermissions[rol]?.includes('ver_todo');
}
