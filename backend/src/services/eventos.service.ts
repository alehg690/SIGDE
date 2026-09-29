import { db } from '@backend/config/database';
import { registrarAccion } from '@backend/services/auditoria.service';
import type { SesionUsuario } from '@backend/types/roles';

export type EventoInput = {
  titulo: string;
  iniciaEn: string;
  descripcion?: string;
  ubicacion?: string;
  tipo?: string;
  color?: string;
  todoElDia?: boolean;
};

const TIPOS_EVENTO = ['Reunión', 'Académico', 'Evento', 'Citación', 'Salud', 'Capacitación', 'Administrativo'];
const COLORES_EVENTO = ['azul', 'verde', 'amarillo', 'rojo', 'morado', 'cian'];

function validarEvento(input: EventoInput) {
  const titulo = input.titulo.trim();
  const iniciaEn = new Date(input.iniciaEn);

  if (!titulo) return { error: 'El título del evento es obligatorio.', status: 400 };
  if (titulo.length > 120 || (input.ubicacion?.length ?? 0) > 200 || (input.descripcion?.length ?? 0) > 1000) return { error: 'El evento supera la longitud permitida.', status: 400 };
  if (Number.isNaN(iniciaEn.getTime())) return { error: 'Selecciona una fecha y hora válidas.', status: 400 };
  if (input.tipo && !TIPOS_EVENTO.includes(input.tipo)) return { error: 'Selecciona un tipo de evento válido.', status: 400 };
  if (input.color && !COLORES_EVENTO.includes(input.color)) return { error: 'Selecciona un color válido.', status: 400 };

  return {
    data: {
      titulo,
      iniciaEn: iniciaEn.toISOString(),
      descripcion: input.descripcion?.trim() || null,
      ubicacion: input.ubicacion?.trim() || null,
      tipo: input.tipo || 'Evento',
      color: input.color || 'azul',
      todoElDia: input.todoElDia === true ? 1 : 0,
    },
  };
}

export async function listarEventosProximos() {
  const result = await db.execute(`
    SELECT id, titulo, descripcion, ubicacion, iniciaEn, tipo, color, todoElDia
    FROM Evento
    WHERE activo = 1 AND datetime(iniciaEn) >= datetime('now')
    ORDER BY datetime(iniciaEn) ASC
    LIMIT 20
  `);

  return { data: result.rows };
}

export async function listarEventosEnRango(desde: string, hasta: string) {
  const inicio = new Date(desde);
  const fin = new Date(hasta);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin <= inicio || fin.getTime() - inicio.getTime() > 62 * 86400000) {
    return { error: 'Selecciona un rango de hasta 62 días.', status: 400 } as const;
  }
  const result = await db.execute({
    sql: `SELECT id, titulo, descripcion, ubicacion, iniciaEn, tipo, color, todoElDia
      FROM Evento
      WHERE activo = 1 AND datetime(iniciaEn) >= datetime(?) AND datetime(iniciaEn) < datetime(?)
      ORDER BY datetime(iniciaEn) ASC LIMIT 500`,
    args: [inicio.toISOString(), fin.toISOString()],
  });
  return { data: result.rows } as const;
}

export async function crearEvento(input: EventoInput, usuario: SesionUsuario) {
  const validacion = validarEvento(input);
  if ('error' in validacion) return validacion;

  const evento = validacion.data;
  const result = await db.execute({
    sql: `
      INSERT INTO Evento (titulo, descripcion, ubicacion, iniciaEn, tipo, color, todoElDia)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING id, titulo, descripcion, ubicacion, iniciaEn, tipo, color, todoElDia
    `,
    args: [evento.titulo, evento.descripcion, evento.ubicacion, evento.iniciaEn, evento.tipo, evento.color, evento.todoElDia],
  });

  const creado = result.rows[0];
  await registrarAccion({
    usuarioId: usuario.id,
    accion: 'crear_evento',
    entidad: 'Evento',
    entidadId: Number(creado.id),
    detalle: { titulo: evento.titulo, iniciaEn: evento.iniciaEn },
  });

  return { data: creado, status: 201 };
}
