import { db } from '@backend/config/database';
import { registrarAccion } from '@backend/services/auditoria.service';
import type { SesionUsuario } from '@backend/types/roles';

export type TipoInforme = 'reportes' | 'salidas' | 'resumen';
export type FormatoInforme = 'pdf' | 'excel';

type FilaInforme = Record<string, unknown>;

const TITULOS: Record<TipoInforme, string> = {
  reportes: 'Informe de reportes disciplinarios',
  salidas: 'Informe de salidas de estudiantes',
  resumen: 'Resumen estadistico institucional',
};

function normalizarTipo(tipo: string | null): TipoInforme | null {
  if (tipo === 'reportes' || tipo === 'salidas' || tipo === 'resumen') return tipo;
  return null;
}

function normalizarFormato(formato: string | null): FormatoInforme | null {
  if (formato === 'pdf' || formato === 'excel') return formato;
  return null;
}

function valorTexto(valor: unknown) {
  if (valor == null) return '';
  if (typeof valor === 'boolean') return valor ? 'Si' : 'No';
  return String(valor);
}

function escaparHtml(valor: unknown) {
  return valorTexto(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escaparPdf(valor: unknown) {
  return valorTexto(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replaceAll('\\', '\\\\')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)');
}

async function datosReportes() {
  const result = await db.execute(`
    SELECT
      r.id,
      r.fecha,
      e.nombre AS estudiante,
      e.grado,
      e.grupo,
      u.nombre AS docente,
      r.tipoFalta,
      r.estado,
      r.descripcion
    FROM Reporte r
    INNER JOIN Estudiante e ON e.id = r.estudianteId
    INNER JOIN Usuario u ON u.id = r.docenteId
    ORDER BY r.fecha DESC
  `);

  return result.rows as FilaInforme[];
}

async function datosSalidas() {
  const result = await db.execute(`
    SELECT
      s.id,
      s.creadoEn,
      e.nombre AS estudiante,
      e.grado,
      a.nombre AS acudiente,
      s.motivo,
      s.tipo,
      s.urgencia,
      s.estado
    FROM Salida s
    INNER JOIN Estudiante e ON e.id = s.estudianteId
    INNER JOIN Acudiente a ON a.id = s.acudienteId
    ORDER BY s.creadoEn DESC
  `);

  return result.rows as FilaInforme[];
}

async function datosResumen() {
  const result = await db.execute(`
    SELECT 'Usuarios activos' AS indicador, COUNT(*) AS total FROM Usuario WHERE activo = 1
    UNION ALL
    SELECT 'Estudiantes activos', COUNT(*) FROM Estudiante WHERE activo = 1 AND archivado = 0
    UNION ALL
    SELECT 'Reportes registrados', COUNT(*) FROM Reporte
    UNION ALL
    SELECT 'Reportes pendientes', COUNT(*) FROM Reporte WHERE estado = 'Pendiente'
    UNION ALL
    SELECT 'Salidas pendientes', COUNT(*) FROM Salida WHERE estado = 'pendiente'
    UNION ALL
    SELECT 'Alertas activas', COUNT(*) FROM Alerta WHERE estado <> 'resuelta'
  `);

  return result.rows as FilaInforme[];
}

async function obtenerFilas(tipo: TipoInforme) {
  if (tipo === 'reportes') return datosReportes();
  if (tipo === 'salidas') return datosSalidas();
  return datosResumen();
}

function crearExcelHtml(titulo: string, filas: FilaInforme[]) {
  const columnas = filas[0] ? Object.keys(filas[0]) : ['mensaje'];
  const filasExcel = filas.length > 0 ? filas : [{ mensaje: 'Sin datos para exportar' }];

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
    th { background: #1f6fb8; color: #ffffff; }
    th, td { border: 1px solid #b8c7d9; padding: 6px 8px; text-align: left; }
  </style>
</head>
<body>
  <h1>${escaparHtml(titulo)}</h1>
  <table>
    <thead><tr>${columnas.map((columna) => `<th>${escaparHtml(columna)}</th>`).join('')}</tr></thead>
    <tbody>
      ${filasExcel.map((fila) => `<tr>${columnas.map((columna) => `<td>${escaparHtml(fila[columna])}</td>`).join('')}</tr>`).join('')}
    </tbody>
  </table>
</body>
</html>`;
}

function crearPdf(titulo: string, filas: FilaInforme[]) {
  const lineas = [
    titulo,
    `Generado: ${new Date().toLocaleString('es-CO')}`,
    '',
    ...(filas.length > 0
      ? filas.slice(0, 42).map((fila) => Object.values(fila).map(valorTexto).join(' | ').slice(0, 110))
      : ['Sin datos para exportar']),
  ];

  const contenido = [
    'BT',
    '/F1 12 Tf',
    '50 790 Td',
    ...lineas.flatMap((linea, index) => [
      index === 0 ? '/F1 16 Tf' : '/F1 9 Tf',
      `(${escaparPdf(linea)}) Tj`,
      '0 -18 Td',
    ]),
    'ET',
  ].join('\n');

  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(contenido, 'utf8')} >>\nstream\n${contenido}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objetos.forEach((objeto, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${objeto}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${offset.toString().padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

export async function exportarInforme(
  tipoInput: string | null,
  formatoInput: string | null,
  usuario: SesionUsuario
) {
  const tipo = normalizarTipo(tipoInput);
  const formato = normalizarFormato(formatoInput);

  if (!tipo) return { error: 'Tipo de informe no valido', status: 400 };
  if (!formato) return { error: 'Formato de informe no valido', status: 400 };

  const filas = await obtenerFilas(tipo);
  const titulo = TITULOS[tipo];
  const fecha = new Date().toISOString().slice(0, 10);

  await registrarAccion({
    usuarioId: usuario.id,
    accion: 'exportar_informe',
    entidad: 'Informe',
    entidadId: `${tipo}:${formato}:${fecha}`,
    detalle: { tipo, formato, registros: filas.length },
  });

  if (formato === 'excel') {
    return {
      data: crearExcelHtml(titulo, filas),
      contentType: 'application/vnd.ms-excel; charset=utf-8',
      filename: `sigde-${tipo}-${fecha}.xls`,
    };
  }

  return {
    data: crearPdf(titulo, filas),
    contentType: 'application/pdf',
    filename: `sigde-${tipo}-${fecha}.pdf`,
  };
}
