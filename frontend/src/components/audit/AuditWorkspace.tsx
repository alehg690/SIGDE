'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseReportDate } from '@/lib/report-dates';
import { coincideBusqueda } from '@/lib/search-normalization';
import ModuleHeader from '@/components/ui/ModuleHeader';
import KpiGrid from '@/components/ui/KpiGrid';

type AuditLog = {
  id: number;
  usuarioId: number;
  usuario: string;
  accion: string;
  entidad: string;
  entidadId: string | null;
  detalle: string | null;
  creadoEn: string;
};

const REGISTROS_POR_PAGINA = 20;

function humanizar(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function fechaLegible(value: string) {
  const date = parseReportDate(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'America/Bogota' }).format(date);
}

function fechaFiltro(value: string) {
  const date = parseReportDate(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(date);
}

function detalleLegible(value: string | null) {
  if (!value) return 'Sin detalle adicional';
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.entries(parsed).map(([key, item]) => `${humanizar(key)}: ${String(item)}`).join(' · ');
  } catch {
    return value;
  }
}

export default function AuditWorkspace() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [entidad, setEntidad] = useState('Todas');
  const [accion, setAccion] = useState('Todas');
  const [responsable, setResponsable] = useState('Todos');
  const [fecha, setFecha] = useState('');
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const response = await fetch('/api/auditoria', { cache: 'no-store' });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(typeof body?.error === 'string' ? body.error : 'No se pudo cargar la auditoría.');
      }
      setLogs(await response.json() as AuditLog[]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar la auditoría.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void cargar(); }, 0);
    return () => window.clearTimeout(timer);
  }, [cargar]);

  const entidades = useMemo(() => [...new Set(logs.map((log) => log.entidad))].sort((a, b) => a.localeCompare(b, 'es')), [logs]);
  const acciones = useMemo(() => [...new Set(logs.map((log) => log.accion))].sort((a, b) => a.localeCompare(b, 'es')), [logs]);
  const responsables = useMemo(() => [...new Set(logs.map((log) => log.usuario))].sort((a, b) => a.localeCompare(b, 'es')), [logs]);
  const filtrados = useMemo(() => logs.filter((log) =>
    coincideBusqueda(busqueda, [log.usuario, log.accion, log.entidad, log.entidadId, log.detalle])
    && (entidad === 'Todas' || log.entidad === entidad)
    && (accion === 'Todas' || log.accion === accion)
    && (responsable === 'Todos' || log.usuario === responsable)
    && (!fecha || fechaFiltro(log.creadoEn) === fecha)
  ), [accion, busqueda, entidad, fecha, logs, responsable]);

  const usuarios = new Set(logs.map((log) => log.usuarioId)).size;
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
  const accionesHoy = logs.filter((log) => fechaFiltro(log.creadoEn) === hoy).length;
  const recursos = new Set(logs.map((log) => log.entidad)).size;
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / REGISTROS_POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio = (paginaSegura - 1) * REGISTROS_POR_PAGINA;
  const visibles = filtrados.slice(inicio, inicio + REGISTROS_POR_PAGINA);
  const limpiarFiltros = () => { setBusqueda(''); setEntidad('Todas'); setAccion('Todas'); setResponsable('Todos'); setFecha(''); };

  return <section className="audit-workspace ui-workspace" aria-label="Auditoría y seguridad">
    <ModuleHeader
      icon={<svg viewBox="0 0 24 24"><path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M10 12h5m-5 3h5"/></svg>}
      kicker="Seguridad institucional"
      title="Auditoría y seguridad"
      description="Consulta acciones críticas, responsables y la fecha exacta de cada cambio registrado."
      action={<span className="audit-retention-note">Últimos 200 movimientos</span>}
    />

    <KpiGrid label="Resumen de auditoría" items={[
      { label: 'Movimientos', value: logs.length, detail: 'Registros disponibles' },
      { label: 'Responsables', value: usuarios, detail: 'Usuarios identificados' },
      { label: 'Registrados hoy', value: accionesHoy, detail: 'Actividad del día' },
      { label: 'Recursos', value: recursos, detail: 'Áreas con movimientos' },
    ]} />

    <section className="audit-log-card" aria-labelledby="audit-list-title">
      <header className="audit-card-heading"><div><span>Registro institucional</span><h3 id="audit-list-title">Historial de movimientos</h3><p>Filtra y revisa la trazabilidad de las acciones realizadas en SIGDE.</p></div><strong>{cargando ? 'Cargando…' : `${filtrados.length} ${filtrados.length === 1 ? 'movimiento' : 'movimientos'}`}</strong></header>

      <div className="audit-filters" aria-label="Filtros de auditoría">
        <label><span>Buscar</span><input type="search" value={busqueda} onChange={(event) => { setBusqueda(event.target.value); setPagina(1); }} placeholder="Usuario, acción o ID" /></label>
        <label><span>Entidad</span><select value={entidad} onChange={(event) => { setEntidad(event.target.value); setPagina(1); }}><option>Todas</option>{entidades.map((item) => <option key={item} value={item}>{humanizar(item)}</option>)}</select></label>
        <label><span>Acción</span><select value={accion} onChange={(event) => { setAccion(event.target.value); setPagina(1); }}><option>Todas</option>{acciones.map((item) => <option key={item} value={item}>{humanizar(item)}</option>)}</select></label>
        <label><span>Responsable</span><select value={responsable} onChange={(event) => { setResponsable(event.target.value); setPagina(1); }}><option>Todos</option>{responsables.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>Fecha</span><input type="date" value={fecha} onChange={(event) => { setFecha(event.target.value); setPagina(1); }} /></label>
      </div>

      {cargando ? <div className="audit-loading" role="status" aria-label="Cargando movimientos">{Array.from({ length: 7 }, (_, index) => <span key={index}><i/><b/><b/><b/><em/></span>)}</div>
        : error ? <div className="audit-state audit-state--error" role="alert"><span aria-hidden="true">!</span><strong>No pudimos cargar la auditoría</strong><p>{error}</p><button type="button" className="ui-button ui-button--secondary" onClick={() => void cargar()}>Reintentar</button></div>
        : visibles.length === 0 ? <div className="audit-state"><span aria-hidden="true">⌕</span><strong>Sin movimientos para mostrar</strong><p>No encontramos registros con los filtros seleccionados.</p><button type="button" className="ui-button ui-button--secondary" onClick={limpiarFiltros}>Limpiar filtros</button></div>
        : <div className="audit-table-wrap" tabIndex={0} role="region" aria-label="Registro de auditoría"><table className="audit-table"><thead><tr><th>Fecha</th><th>Responsable</th><th>Acción</th><th>Recurso</th><th>Detalle</th></tr></thead><tbody>{visibles.map((log) => { const detalle = detalleLegible(log.detalle); return <tr key={log.id}><td><time dateTime={log.creadoEn}>{fechaLegible(log.creadoEn)}</time></td><td><strong>{log.usuario}</strong><small>Usuario #{log.usuarioId}</small></td><td><span className="audit-action">{humanizar(log.accion)}</span></td><td><strong>{humanizar(log.entidad)}</strong>{log.entidadId && <small>Registro #{log.entidadId}</small>}</td><td><span className="audit-detail" title={detalle}>{detalle}</span></td></tr>; })}</tbody></table></div>}

      {!cargando && !error && filtrados.length > 0 && <footer className="audit-pagination"><p>Mostrando <strong>{inicio + 1}–{Math.min(inicio + REGISTROS_POR_PAGINA, filtrados.length)}</strong> de <strong>{filtrados.length}</strong></p><div><button type="button" disabled={paginaSegura === 1} onClick={() => setPagina((actual) => Math.max(1, actual - 1))}>Anterior</button><span>Página {paginaSegura} de {totalPaginas}</span><button type="button" disabled={paginaSegura === totalPaginas} onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))}>Siguiente</button></div></footer>}
    </section>
  </section>;
}
