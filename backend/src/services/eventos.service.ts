import { db } from '@backend/config/database';
import { registrarAccion } from '@backend/services/auditoria.service';
import type { SesionUsuario } from '@backend/types/roles';

export type EventoInput = {
  titulo: string;
  iniciaEn: string;
  descripcion?: string;
  ubicacion?: string;
};

function validarEvento(input: EventoInput) {
  const titulo = input.titulo.trim();
  const iniciaEn = new Date(input.iniciaEn);

  if (!titulo) return { error: 'El título del evento es obligatorio.', status: 400 };
  if (Number.isNaN(iniciaEn.getTime())) return { error: 'Selecciona una fecha y hora válidas.', status: 400 };

  return {
    data: {
      titulo,
      iniciaEn: iniciaEn.toISOString(),
      descripcion: input.descripcion?.trim() || null,
      ubicacion: input.ubicacion?.trim() || null,
    },
  };
}

export async function listarEventosProximos() {
  const result = await db.execute(`
    SELECT id, titulo, descripcion, ubicacion, iniciaEn
    FROM Evento
    WHERE activo = 1 AND datetime(iniciaEn) >= datetime('now', '-1 day')
    ORDER BY datetime(iniciaEn) ASC
    LIMIT 20
  `);

  return { data: result.rows };
}

export async function crearEvento(input: EventoInput, usuario: SesionUsuario) {
  const validacion = validarEvento(input);
  if ('error' in validacion) return validacion;

  const evento = validacion.data;
  const result = await db.execute({
    sql: `
      INSERT INTO Evento (titulo, descripcion, ubicacion, iniciaEn)
      VALUES (?, ?, ?, ?)
      RETURNING id, titulo, descripcion, ubicacion, iniciaEn
    `,
    args: [evento.titulo, evento.descripcion, evento.ubicacion, evento.iniciaEn],
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
