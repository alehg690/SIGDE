export type Observador = {
  fechaRegistro?: string;
  fecha: string;
  horaInicio: string;
  horaFinal: string;
  sede: string;
  jornada: string;
  grupo: string;
  acudiente: string;
  cedulaAcudiente: string;
  motivo: string;
  tipoSituacion: '1' | '2' | '3' | '0';
  situacionAcademica: string;
  ordenDia: string;
  desarrollo: string;
  documentoReferencia: 'Manual de Convivencia' | 'SIEE';
  referenciaNormativa: string;
};
