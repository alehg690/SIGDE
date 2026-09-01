import { db } from '@backend/config/database';
import { registrarAccion } from '@backend/services/auditoria.service';
import type { SesionUsuario } from '@backend/types/roles';
import { obtenerGrupoAcademico } from '@/lib/academic-groups';

type EstudianteRow = {
  id: number; nombre: string; primerNombre: string | null; segundoNombre: string | null;
  primerApellido: string | null; segundoApellido: string | null; tipoDocumento: string | null;
  documento: string | null; correo: string | null; grado: string; grupo: string; jornada: string; estado: string;
  archivado: number; activo: number; creadoEn: string; actualizadoEn: string; novedades: number; salidas: number;
  acudienteId: number; acudienteNombre: string; acudientePrimerNombre: string | null;
  acudienteSegundoNombre: string | null; acudientePrimerApellido: string | null;
  acudienteSegundoApellido: string | null; acudienteTipoDocumento: string | null;
  acudienteContacto: string; acudienteCorreo: string | null; acudienteTelefono: string | null;
  acudienteDocumento: string | null; acudienteParentesco: string | null;
};

export type EstudianteInput = {
  primerNombre: string; segundoNombre?: string; primerApellido: string; segundoApellido: string;
  tipoDocumento: string; documento: string; correo: string; grado: string; grupo: string; jornada?: string; estado: string;
  acudientePrimerNombre: string; acudienteSegundoNombre?: string; acudientePrimerApellido: string;
  acudienteSegundoApellido: string; acudienteTipoDocumento: string; acudienteDocumento: string;
  acudienteParentesco: string; acudienteCorreo: string; acudienteTelefono: string;
};

const TIPOS_DOCUMENTO = new Set(['RC', 'TI', 'CC', 'CE', 'PPT', 'PEP', 'NUIP']);
const ESTADOS = new Set(['Activo', 'Desescolarizado', 'Egresado']);
const PARENTESCOS = new Set(['Madre', 'Padre', 'Abuela', 'Abuelo', 'Hermana', 'Hermano', 'Tía', 'Tío', 'Tutor legal', 'Otro']);

function limpiar(value?: string) { return value?.trim().replace(/\s+/g, ' ') || ''; }
function nombreCompleto(...partes: string[]) { return partes.filter(Boolean).join(' '); }

function mapEstudiante(row: EstudianteRow) {
  return {
    id: row.id, nombre: row.nombre, primerNombre: row.primerNombre, segundoNombre: row.segundoNombre,
    primerApellido: row.primerApellido, segundoApellido: row.segundoApellido, tipoDocumento: row.tipoDocumento,
    documento: row.documento, correo: row.correo, grado: row.grado, grupo: row.grupo, jornada: row.jornada, estado: row.estado,
    activo: Boolean(row.activo), archivado: Boolean(row.archivado), creadoEn: row.creadoEn,
    actualizadoEn: row.actualizadoEn, novedades: Number(row.novedades || 0), salidas: Number(row.salidas || 0),
    acudiente: {
      id: row.acudienteId, nombre: row.acudienteNombre, primerNombre: row.acudientePrimerNombre,
      segundoNombre: row.acudienteSegundoNombre, primerApellido: row.acudientePrimerApellido,
      segundoApellido: row.acudienteSegundoApellido, tipoDocumento: row.acudienteTipoDocumento,
      contacto: row.acudienteContacto, correo: row.acudienteCorreo, telefono: row.acudienteTelefono,
      documento: row.acudienteDocumento, parentesco: row.acudienteParentesco,
    },
  };
}

function validarInput(input: EstudianteInput) {
  const primerNombre = limpiar(input.primerNombre);
  const segundoNombre = limpiar(input.segundoNombre) || null;
  const primerApellido = limpiar(input.primerApellido);
  const segundoApellido = limpiar(input.segundoApellido);
  const tipoDocumento = limpiar(input.tipoDocumento).toUpperCase();
  const documento = limpiar(input.documento);
  const correo = limpiar(input.correo).toLowerCase();
  const grado = limpiar(input.grado).replace('°', '');
  const grupo = limpiar(input.grupo);
  const grupoAcademico = obtenerGrupoAcademico(grado, grupo);
  const jornada = grupoAcademico?.jornada || '';
  const estado = limpiar(input.estado) || 'Activo';
  const acudientePrimerNombre = limpiar(input.acudientePrimerNombre);
  const acudienteSegundoNombre = limpiar(input.acudienteSegundoNombre) || null;
  const acudientePrimerApellido = limpiar(input.acudientePrimerApellido);
  const acudienteSegundoApellido = limpiar(input.acudienteSegundoApellido);
  const acudienteTipoDocumento = limpiar(input.acudienteTipoDocumento).toUpperCase();
  const acudienteDocumento = limpiar(input.acudienteDocumento);
  const acudienteParentesco = limpiar(input.acudienteParentesco);
  const acudienteCorreo = limpiar(input.acudienteCorreo).toLowerCase();
  const acudienteTelefono = limpiar(input.acudienteTelefono);

  if (!primerNombre || !primerApellido || !segundoApellido) return { error: 'Completa los nombres y apellidos obligatorios del estudiante', status: 400 };
  if (!TIPOS_DOCUMENTO.has(tipoDocumento) || !documento) return { error: 'Selecciona el tipo y registra el documento del estudiante', status: 400 };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return { error: 'Ingresa un correo institucional válido para el estudiante', status: 400 };
  if (!grupoAcademico) return { error: 'Selecciona un grupo válido', status: 400 };
  if (!ESTADOS.has(estado)) return { error: 'Selecciona un estado válido', status: 400 };
  if (!acudientePrimerNombre || !acudientePrimerApellido || !acudienteSegundoApellido) return { error: 'Completa los nombres y apellidos obligatorios del acudiente', status: 400 };
  if (!TIPOS_DOCUMENTO.has(acudienteTipoDocumento) || !acudienteDocumento) return { error: 'Selecciona el tipo y registra el documento del acudiente', status: 400 };
  if (!PARENTESCOS.has(acudienteParentesco)) return { error: 'Selecciona el parentesco del acudiente', status: 400 };
  if (!acudienteTelefono) return { error: 'El número de teléfono del acudiente es obligatorio', status: 400 };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acudienteCorreo)) return { error: 'Ingresa un correo válido para el acudiente', status: 400 };

  return { data: {
    primerNombre, segundoNombre, primerApellido, segundoApellido, tipoDocumento, documento, correo,
    nombre: nombreCompleto(primerNombre, segundoNombre || '', primerApellido, segundoApellido),
    grado, grupo, jornada, estado, activo: estado === 'Activo' ? 1 : 0,
    acudientePrimerNombre, acudienteSegundoNombre, acudientePrimerApellido, acudienteSegundoApellido,
    acudienteTipoDocumento, acudienteDocumento, acudienteParentesco, acudienteCorreo, acudienteTelefono,
    acudienteNombre: nombreCompleto(acudientePrimerNombre, acudienteSegundoNombre || '', acudientePrimerApellido, acudienteSegundoApellido),
    acudienteContacto: acudienteTelefono,
  } };
}

const SELECT_ESTUDIANTE = `
  SELECT e.id, e.nombre, e.primerNombre, e.segundoNombre, e.primerApellido, e.segundoApellido,
    e.tipoDocumento, e.documento, e.correo, e.grado, e.grupo, e.jornada, e.estado, e.activo, e.archivado,
    e.creadoEn, e.actualizadoEn,
    (SELECT COUNT(*) FROM Reporte r WHERE r.estudianteId = e.id) AS novedades,
    (SELECT COUNT(*) FROM Salida s WHERE s.estudianteId = e.id) AS salidas,
    a.id AS acudienteId, a.nombre AS acudienteNombre,
    a.primerNombre AS acudientePrimerNombre, a.segundoNombre AS acudienteSegundoNombre,
    a.primerApellido AS acudientePrimerApellido, a.segundoApellido AS acudienteSegundoApellido,
    a.tipoDocumento AS acudienteTipoDocumento, a.contacto AS acudienteContacto,
    a.correo AS acudienteCorreo, a.telefono AS acudienteTelefono,
    a.documento AS acudienteDocumento, a.parentesco AS acudienteParentesco
  FROM Estudiante e INNER JOIN Acudiente a ON a.id = e.acudienteId`;

export async function listarEstudiantes() {
  const result = await db.execute(`${SELECT_ESTUDIANTE} WHERE e.archivado = 0 ORDER BY e.nombre ASC`);
  return { data: result.rows.map((row) => mapEstudiante(row as unknown as EstudianteRow)) };
}

export async function crearEstudiante(input: EstudianteInput, usuario?: SesionUsuario) {
  const validacion = validarInput(input);
  if ('error' in validacion) return validacion;
  const data = validacion.data;
  const duplicado = await db.execute({ sql: 'SELECT id FROM Estudiante WHERE documento = ? AND archivado = 0 LIMIT 1', args: [data.documento] });
  if (duplicado.rows[0]) return { error: 'Ya existe un estudiante con ese documento', status: 409 };
  const correoDuplicado = await db.execute({ sql: 'SELECT id FROM Estudiante WHERE correo = ? LIMIT 1', args: [data.correo] });
  if (correoDuplicado.rows[0]) return { error: 'Ya existe un estudiante con ese correo', status: 409 };

  const result = await db.batch([
    { sql: `INSERT INTO Acudiente (nombre, primerNombre, segundoNombre, primerApellido, segundoApellido, tipoDocumento, documento, parentesco, contacto, correo, telefono) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`, args: [data.acudienteNombre, data.acudientePrimerNombre, data.acudienteSegundoNombre, data.acudientePrimerApellido, data.acudienteSegundoApellido, data.acudienteTipoDocumento, data.acudienteDocumento, data.acudienteParentesco, data.acudienteContacto, data.acudienteCorreo, data.acudienteTelefono] },
    { sql: `INSERT INTO Estudiante (nombre, primerNombre, segundoNombre, primerApellido, segundoApellido, tipoDocumento, documento, correo, grado, grupo, jornada, estado, activo, acudienteId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, last_insert_rowid()) RETURNING id`, args: [data.nombre, data.primerNombre, data.segundoNombre, data.primerApellido, data.segundoApellido, data.tipoDocumento, data.documento, data.correo, data.grado, data.grupo, data.jornada, data.estado, data.activo] },
  ], 'write');

  const estudianteId = Number(result[1].rows[0]?.id);
  if (usuario) await registrarAccion({ usuarioId: usuario.id, accion: 'crear_estudiante', entidad: 'Estudiante', entidadId: estudianteId });
  return obtenerEstudiante(estudianteId, 201);
}

export async function obtenerEstudiante(id: number, status = 200) {
  const result = await db.execute({ sql: `${SELECT_ESTUDIANTE} WHERE e.id = ? LIMIT 1`, args: [id] });
  if (!result.rows[0]) return { error: 'Estudiante no encontrado', status: 404 };
  return { data: mapEstudiante(result.rows[0] as unknown as EstudianteRow), status };
}

export async function actualizarEstudiante(id: number, input: EstudianteInput, usuario?: SesionUsuario) {
  const validacion = validarInput(input);
  if ('error' in validacion) return validacion;
  const actual = await db.execute({ sql: 'SELECT acudienteId FROM Estudiante WHERE id = ? LIMIT 1', args: [id] });
  if (!actual.rows[0]) return { error: 'Estudiante no encontrado', status: 404 };
  const data = validacion.data;
  const duplicado = await db.execute({ sql: 'SELECT id FROM Estudiante WHERE documento = ? AND id <> ? AND archivado = 0 LIMIT 1', args: [data.documento, id] });
  if (duplicado.rows[0]) return { error: 'Ya existe otro estudiante con ese documento', status: 409 };
  const correoDuplicado = await db.execute({ sql: 'SELECT id FROM Estudiante WHERE correo = ? AND id <> ? LIMIT 1', args: [data.correo, id] });
  if (correoDuplicado.rows[0]) return { error: 'Ya existe otro estudiante con ese correo', status: 409 };

  await db.batch([
    { sql: `UPDATE Acudiente SET nombre = ?, primerNombre = ?, segundoNombre = ?, primerApellido = ?, segundoApellido = ?, tipoDocumento = ?, documento = ?, parentesco = ?, contacto = ?, correo = ?, telefono = ? WHERE id = ?`, args: [data.acudienteNombre, data.acudientePrimerNombre, data.acudienteSegundoNombre, data.acudientePrimerApellido, data.acudienteSegundoApellido, data.acudienteTipoDocumento, data.acudienteDocumento, data.acudienteParentesco, data.acudienteContacto, data.acudienteCorreo, data.acudienteTelefono, Number(actual.rows[0].acudienteId)] },
    { sql: `UPDATE Estudiante SET nombre = ?, primerNombre = ?, segundoNombre = ?, primerApellido = ?, segundoApellido = ?, tipoDocumento = ?, documento = ?, correo = ?, grado = ?, grupo = ?, jornada = ?, estado = ?, activo = ?, actualizadoEn = CURRENT_TIMESTAMP WHERE id = ?`, args: [data.nombre, data.primerNombre, data.segundoNombre, data.primerApellido, data.segundoApellido, data.tipoDocumento, data.documento, data.correo, data.grado, data.grupo, data.jornada, data.estado, data.activo, id] },
  ], 'write');

  if (usuario) await registrarAccion({ usuarioId: usuario.id, accion: 'actualizar_estudiante', entidad: 'Estudiante', entidadId: id });
  return obtenerEstudiante(id);
}

export async function archivarEstudiante(id: number, usuario?: SesionUsuario) {
  const result = await db.execute({ sql: 'UPDATE Estudiante SET archivado = 1, actualizadoEn = CURRENT_TIMESTAMP WHERE id = ? RETURNING id', args: [id] });
  if (!result.rows[0]) return { error: 'Estudiante no encontrado', status: 404 };
  if (usuario) await registrarAccion({ usuarioId: usuario.id, accion: 'archivar_estudiante', entidad: 'Estudiante', entidadId: id });
  return { data: { mensaje: 'Estudiante archivado correctamente' } };
}
