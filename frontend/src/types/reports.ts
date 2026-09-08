export type TipoFalta = 'TIPO_I' | 'TIPO_II' | 'TIPO_III';
export type TipoFaltaForm = '1' | '2' | '3';
export type EstadoReporte = 'Pendiente' | 'EnRevision' | 'Cerrado' | 'Anulado';

export type EvidenciaReporte = {
  id: number;
  nombre: string;
  tipo: string;
  url: string;
  creadoEn: string;
};

export type ObservacionReporte = {
  id: number;
  usuarioId: number;
  usuario: string;
  rol: string;
  texto: string;
  creadoEn: string;
};

export type NotificacionReporte = {
  id: number;
  destinatarioTipo: string;
  destinatario: string;
  canal: string;
  asunto: string;
  leida: boolean | number;
  enviadoEn: string;
};

export type Reporte = {
  id: number;
  estudianteId: number;
  estudiante: string;
  grado: string;
  grupo: string;
  docenteId: number;
  docente: string;
  tipoFalta: TipoFalta;
  fechaHecho: string | null;
  lugar: string | null;
  situacion: string | null;
  descripcion: string;
  actuacionInicial: string | null;
  evidenciaUrl: string | null;
  observaciones: string | null;
  fecha: string;
  estado: EstadoReporte;
  confidencial: boolean | number;
  editableHasta: string | null;
  creadoEn: string;
  actualizadoEn: string;
  evidenciasCount: number;
  observacionesCount: number;
  notificacionesCount: number;
};

export type ReporteDetalle = Reporte & {
  evidencias: EvidenciaReporte[];
  observacionesLista: ObservacionReporte[];
  notificaciones: NotificacionReporte[];
  permisos: {
    puedeEditar: boolean;
    puedeAgregarEvidencia: boolean;
    puedeObservar: boolean;
    puedeGestionarEstado: boolean;
  };
};

export type ReporteFormData = {
  estudianteId: string;
  tipoFalta: TipoFaltaForm;
  fechaHecho: string;
  lugar: string;
  situacion: string;
  descripcion: string;
  actuacionInicial: string;
  evidenciaUrl: string;
  confidencial: boolean;
};

export type ReglaConvivencia = {
  tipo: 'Tipo I' | 'Tipo II' | 'Tipo III';
  articulo: string;
  descripcion: string;
  competencia: string;
  accion: string;
  instancia: string;
  requiereSiuce: boolean;
};

export type ManualConvivencia = {
  fuente: string;
  tipos: ReglaConvivencia[];
  situacionesTipificadas: Record<'Tipo I' | 'Tipo II' | 'Tipo III', string[]>;
};
