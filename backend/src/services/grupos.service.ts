import { db } from '@backend/config/database';
import { registrarAccion } from '@backend/services/auditoria.service';
import type { SesionUsuario } from '@backend/types/roles';
import { GRUPOS_ACADEMICOS, obtenerGrupoAcademico } from '@/lib/academic-groups';

type GrupoRow = {
  id: number;
  grado: string;
  grupo: string;
  jornada: string;
  directorId: number | null;
  directorNombre: string | null;
  directorCorreo: string | null;
};

type EstudianteGrupoRow = {
  id: number;
  nombre: string;
  grado: string;
  grupo: string;
  estado: string;
};

type DocenteRow = {
  id: number;
  nombre: string;
  correo: string;
};

export async function listarGrupos() {
  const [gruposResult, estudiantesResult, docentesResult] = await Promise.all([
    db.execute(`
      SELECT g.id, g.grado, g.grupo, g.jornada, g.directorId,
        u.nombre AS directorNombre, u.correo AS directorCorreo
      FROM GrupoEscolar g
      LEFT JOIN Usuario u ON u.id = g.directorId AND u.eliminadoEn IS NULL
    `),
    db.execute(`
      SELECT id, nombre, grado, grupo, estado
      FROM Estudiante
      WHERE archivado = 0
      ORDER BY nombre ASC
    `),
    db.execute(`
      SELECT id, nombre, correo
      FROM Usuario
      WHERE rol = 'Docente' AND activo = 1 AND eliminadoEn IS NULL
      ORDER BY nombre ASC
    `),
  ]);

  const gruposGuardados = new Map(
    (gruposResult.rows as unknown as GrupoRow[]).map((grupo) => [`${grupo.grado}-${grupo.grupo}`, grupo]),
  );
  const estudiantes = estudiantesResult.rows as unknown as EstudianteGrupoRow[];

  return {
    data: {
      grupos: GRUPOS_ACADEMICOS.map((grupo) => {
        const guardado = gruposGuardados.get(grupo.etiqueta);
        return {
          id: guardado?.id ?? null,
          grado: grupo.grado,
          grupo: grupo.grupo,
          jornada: guardado?.jornada || grupo.jornada,
          director: guardado?.directorId
            ? {
                id: guardado.directorId,
                nombre: guardado.directorNombre || 'Docente no disponible',
                correo: guardado.directorCorreo || '',
              }
            : null,
          estudiantes: estudiantes
            .filter((estudiante) => estudiante.grado.replace('°', '') === grupo.grado && estudiante.grupo === grupo.grupo)
            .map((estudiante) => ({
              id: estudiante.id,
              nombre: estudiante.nombre,
              estado: estudiante.estado,
            })),
        };
      }),
      docentes: (docentesResult.rows as unknown as DocenteRow[]).map((docente) => ({
        id: docente.id,
        nombre: docente.nombre,
        correo: docente.correo,
      })),
    },
  };
}

export async function actualizarDirectorGrupo(
  grado: string,
  grupo: string,
  directorId: number | null,
  actor: SesionUsuario,
) {
  const grupoAcademico = obtenerGrupoAcademico(grado, grupo);
  if (!grupoAcademico) return { error: 'El grupo seleccionado no es válido', status: 400 };

  if (directorId !== null) {
    const docente = await db.execute({
      sql: `SELECT id FROM Usuario
        WHERE id = ? AND rol = 'Docente' AND activo = 1 AND eliminadoEn IS NULL
        LIMIT 1`,
      args: [directorId],
    });
    if (!docente.rows[0]) return { error: 'Selecciona un docente activo como director de grupo', status: 400 };
  }

  const result = await db.execute({
    sql: `
      INSERT INTO GrupoEscolar (grado, grupo, jornada, directorId)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(grado, grupo) DO UPDATE SET
        jornada = excluded.jornada,
        directorId = excluded.directorId,
        actualizadoEn = CURRENT_TIMESTAMP
      RETURNING id
    `,
    args: [grupoAcademico.grado, grupoAcademico.grupo, grupoAcademico.jornada, directorId],
  });

  const id = Number(result.rows[0]?.id);
  await registrarAccion({
    usuarioId: actor.id,
    accion: 'actualizar_director_grupo',
    entidad: 'GrupoEscolar',
    entidadId: id,
    detalle: { grupo: grupoAcademico.etiqueta, directorId },
  });

  return { data: { id, directorId } };
}
