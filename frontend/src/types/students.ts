export type Acudiente = {
  id: number;
  nombre: string;
  contacto: string;
  correo: string | null;
  telefono: string | null;
  documento: string | null;
};

export type Estudiante = {
  id: number;
  nombre: string;
  documento: string | null;
  grado: string;
  grupo: string;
  estado: string;
  activo: boolean;
  archivado: boolean;
  creadoEn: string;
  actualizadoEn: string;
  acudiente: Acudiente;
};

export type EstudianteFormData = {
  nombre: string;
  documento: string;
  grado: string;
  grupo: string;
  estado: string;
  activo: boolean;
  acudienteNombre: string;
  acudienteDocumento: string;
  acudienteTelefono: string;
  acudienteCorreo: string;
};
