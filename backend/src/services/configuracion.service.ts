import { db } from '@backend/config/database';
import { registrarAccion } from '@backend/services/auditoria.service';
import type { SesionUsuario } from '@backend/types/roles';

export async function obtenerConfiguracion() {
  const result = await db.execute(`
    SELECT clave, valor, actualizadoEn
    FROM ConfiguracionSistema
    ORDER BY clave ASC
  `);

  return { data: result.rows };
}

export async function obtenerValorConfiguracion(clave: string, fallback: string) {
  const result = await db.execute({
    sql: 'SELECT valor FROM ConfiguracionSistema WHERE clave = ? LIMIT 1',
    args: [clave],
  });

  return String(result.rows[0]?.valor ?? fallback);
}

export async function actualizarConfiguracion(clave: string, valor: string, usuario: SesionUsuario) {
  const claveLimpia = clave.trim();
  const valorLimpio = valor.trim();

  if (!claveLimpia || !valorLimpio) {
    return { error: 'Clave y valor son obligatorios', status: 400 };
  }

  await db.execute({
    sql: `
      INSERT INTO ConfiguracionSistema (clave, valor, actualizadoEn)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, actualizadoEn = CURRENT_TIMESTAMP
    `,
    args: [claveLimpia, valorLimpio],
  });

  await registrarAccion({
    usuarioId: usuario.id,
    accion: 'actualizar_configuracion',
    entidad: 'ConfiguracionSistema',
    entidadId: claveLimpia,
    detalle: { valor: valorLimpio },
  });

  return { data: { clave: claveLimpia, valor: valorLimpio } };
}
