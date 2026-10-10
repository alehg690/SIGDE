import { db } from '@backend/config/database';
import { esRolAdministrador, esRolCoordinador, type SesionUsuario } from '@backend/types/roles';

const CLAVES_IDENTIDAD = new Set(['institucion.nombre', 'institucion.sede', 'institucion.codigoDane', 'institucion.ciudad']);
const CLAVES_CALENDARIO = new Set(['institucion.anoLectivo', 'calendario.fechaInicio', 'calendario.fechaFin', 'calendario.numeroPeriodos', 'calendario.periodoActual']);
const CLAVES_ALERTAS = new Set(['alertas.habilitadas', 'alertas.umbralReportes', 'alertas.periodoDias']);

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
  if (!Array.isArray(entradas) || entradas.length < 1 || entradas.length > 12) return { error: 'Configuración inválida.', status: 400 };
  const limpias: Array<{ clave: string; valor: string }> = [];
  for (const entrada of entradas) {
    if (typeof entrada?.clave !== 'string' || typeof entrada?.valor !== 'string') return { error: 'Clave y valor deben ser texto.', status: 400 };
    const clave = entrada.clave.trim();
    const valor = entrada.valor.trim();
    const numero = Number(valor);
    const conocida = CLAVES_IDENTIDAD.has(clave) || CLAVES_CALENDARIO.has(clave) || CLAVES_ALERTAS.has(clave);
    if (!conocida) return { error: `Revisa el valor de ${clave || 'la configuración'}.`, status: 400 };
    const autorizada = CLAVES_IDENTIDAD.has(clave) ? esRolAdministrador(usuario.rol)
      : CLAVES_CALENDARIO.has(clave) || CLAVES_ALERTAS.has(clave) ? esRolCoordinador(usuario.rol)
      : false;
    if (!autorizada) return { error: CLAVES_IDENTIDAD.has(clave) ? 'Solo el administrador puede modificar la identidad institucional.' : 'No tienes permisos para modificar esta configuración.', status: 403 };
    const valida = clave === 'institucion.nombre' ? valor.length >= 3 && valor.length <= 120
      : clave === 'institucion.sede' ? valor.length >= 2 && valor.length <= 80
      : clave === 'institucion.codigoDane' ? valor === '' || /^\d{12}$/.test(valor)
      : clave === 'institucion.ciudad' ? valor === '' || (valor.length >= 2 && valor.length <= 80)
      : clave === 'institucion.anoLectivo' ? /^\d{4}$/.test(valor) && numero >= 2000 && numero <= 2100
      : clave === 'calendario.fechaInicio' || clave === 'calendario.fechaFin' ? /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(Date.parse(`${valor}T00:00:00Z`))
      : clave === 'calendario.numeroPeriodos' ? /^\d+$/.test(valor) && numero >= 1 && numero <= 6
      : clave === 'calendario.periodoActual' ? /^\d+$/.test(valor) && numero >= 1 && numero <= 6
      : clave === 'alertas.habilitadas' ? valor === 'true' || valor === 'false'
      : clave === 'alertas.umbralReportes' ? /^\d+$/.test(valor) && numero >= 2 && numero <= 20
      : clave === 'alertas.periodoDias' ? /^\d+$/.test(valor) && numero >= 1 && numero <= 365
      : false;
    if (!valida || limpias.some((item) => item.clave === clave)) return { error: `Revisa el valor de ${clave || 'la configuración'}.`, status: 400 };
    limpias.push({ clave, valor });
  }
  const valores = new Map(limpias.map((item) => [item.clave, item.valor]));
  const inicio = valores.get('calendario.fechaInicio');
  const fin = valores.get('calendario.fechaFin');
  if (inicio && fin && inicio > fin) return { error: 'La fecha de finalización debe ser posterior a la fecha de inicio.', status: 400 };
  const numeroPeriodos = Number(valores.get('calendario.numeroPeriodos') ?? await obtenerValorConfiguracion('calendario.numeroPeriodos', '4'));
  const periodoActual = Number(valores.get('calendario.periodoActual') ?? await obtenerValorConfiguracion('calendario.periodoActual', '1'));
  if (periodoActual > numeroPeriodos) return { error: 'El periodo actual no puede superar la cantidad de periodos del año.', status: 400 };
  await db.batch([
    ...limpias.map(({ clave, valor }) => ({
      sql: 'INSERT INTO ConfiguracionSistema (clave, valor, actualizadoEn) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor, actualizadoEn = CURRENT_TIMESTAMP',
      args: [clave, valor],
    })),
    { sql: 'INSERT INTO AuditLog (usuarioId, accion, entidad, detalle) VALUES (?, ?, ?, ?)', args: [usuario.id, 'actualizar_configuracion', 'ConfiguracionSistema', JSON.stringify(limpias)] },
  ], 'write');
  return { data: limpias, status: 200 };
}
