export type TipoFalta = 'TIPO_I' | 'TIPO_II' | 'TIPO_III';

export type Reporte = {
  id: number;
  estudianteId: number;
  estudiante: string;
  grado: string;
  grupo: string;
  docenteId: number;
  docente: string;
  tipoFalta: TipoFalta;
  descripcion: string;
  evidenciaUrl: string | null;
  observaciones: string | null;
  fecha: string;
  estado: string;
  confidencial: boolean | number;
  editableHasta: string | null;
  creadoEn: string;
  actualizadoEn: string;
};

export type ReporteFormData = {
  estudianteId: string;
  tipoFalta: '1' | '2' | '3';
  descripcion: string;
  evidenciaUrl: string;
  confidencial: boolean;
};
