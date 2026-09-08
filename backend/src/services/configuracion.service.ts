import { db } from '@backend/config/database';
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
  return actualizarConfiguraciones([{ clave, valor }], usuario);
}

export async function actualizarConfiguraciones(entradas: unknown, usuario: SesionUsuario) {
  if (!Array.isArray(entradas) || entradas.length < 1 || entradas.length > 4) return { error: 'Configuración inválida.', status: 400 };
  const limpias: Array<{ clave: string; valor: string }> = [];
  for (const entrada of entradas) {
    if (typeof entrada?.clave !== 'string' || typeof entrada?.valor !== 'string') return { error: 'Clave y valor deben ser texto.', status: 400 };
    const clave = entrada.clave.trim();
    const valor = entrada.valor.trim();
    const numero = Number(valor);
    const valida = clave === 'institucion.nombre' ? valor.length >= 3 && valor.length <= 120
      : clave === 'institucion.anoLectivo' ? /^\d{4}$/.test(valor) && numero >= 2000 && numero <= 2100
      : clave === 'alertas.umbralReportes' ? /^\d+$/.test(valor) && numero >= 2 && numero <= 20
      : clave === 'alertas.periodoDias' ? /^\d+$/.test(valor) && numero >= 1 && numero <= 365
      : false;
    if (!valida || limpias.some((item) => item.clave === clave)) return { error: `Revisa el valor de ${clave || 'la configuración'}.`, status: 400 };
    limpias.push({ clave, valor });
  }
  await db.batch([
    ...limpias.map(({ clave, valor }) => ({
      sql: 'INSERT INTO ConfiguracionSistema (clave, valor, actualizadoEn) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, actualizadoEn = CURRENT_TIMESTAMP',
      args: [clave, valor],
    })),
    { sql: 'INSERT INTO AuditLog (usuarioId, accion, entidad, detalle) VALUES (?, ?, ?, ?)', args: [usuario.id, 'actualizar_configuracion', 'ConfiguracionSistema', JSON.stringify(limpias)] },
  ], 'write');
  return { data: limpias, status: 200 };
}
