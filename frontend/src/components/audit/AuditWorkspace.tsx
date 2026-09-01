'use client';

import { useEffect, useMemo, useState } from 'react';

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

function humanizar(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function fechaLegible(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'America/Bogota' }).format(date);
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
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let activa = true;
    void fetch('/api/auditoria', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(typeof body?.error === 'string' ? body.error : 'No se pudo cargar la auditoría.');
      }
      return response.json() as Promise<AuditLog[]>;
    }).then((data) => { if (activa) setLogs(data); }).catch((reason) => {
      if (activa) setError(reason instanceof Error ? reason.message : 'No se pudo cargar la auditoría.');
    }).finally(() => { if (activa) setCargando(false); });
    return () => { activa = false; };
  }, []);

  const entidades = useMemo(() => [...new Set(logs.map((log) => log.entidad))].sort((a, b) => a.localeCompare(b, 'es')), [logs]);
  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    return logs.filter((log) => {
      const texto = [log.usuario, log.accion, log.entidad, log.entidadId, log.detalle].join(' ').toLocaleLowerCase('es');
      return (!termino || texto.includes(termino)) && (entidad === 'Todas' || log.entidad === entidad);
    });
  }, [busqueda, entidad, logs]);

  const usuarios = new Set(logs.map((log) => log.usuarioId)).size;
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
  const accionesHoy = logs.filter((log) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(log.creadoEn)) === hoy).length;

  return <section className="workspace-panel audit-workspace">
    <header className="module-page-heading"><div className="module-title"><h2>Auditoría y seguridad</h2><p>Consulta acciones críticas, responsables y fecha exacta de cada cambio.</p></div><span className="audit-retention-note">Últimos 200 movimientos</span></header>
    {error && <p className="feedback error" role="alert">{error}</p>}
    <div className="module-kpi-grid">
      <article><span>Movimientos</span><strong>{logs.length}</strong><small>Registros disponibles</small></article>
      <article><span>Usuarios</span><strong>{usuarios}</strong><small>Responsables identificados</small></article>
      <article><span>Hoy</span><strong>{accionesHoy}</strong><small>Acciones registradas</small></article>
    </div>
    <div className="audit-log-card">
      <div className="module-filter-bar"><label className="module-search-field"><span>Buscar movimiento</span><input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Usuario, acción o identificador" /></label><label><span>Entidad</span><select value={entidad} onChange={(event) => setEntidad(event.target.value)}><option>Todas</option>{entidades.map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <div className="module-list-heading"><strong>Registro cronológico</strong><span>{cargando ? 'Cargando...' : `${filtrados.length} movimientos`}</span></div>
      <div className="audit-table-wrap"><table className="audit-table"><thead><tr><th>Fecha</th><th>Responsable</th><th>Acción</th><th>Recurso</th><th>Detalle</th></tr></thead><tbody>{filtrados.map((log) => <tr key={log.id}><td><time dateTime={log.creadoEn}>{fechaLegible(log.creadoEn)}</time></td><td><strong>{log.usuario}</strong><small>Usuario #{log.usuarioId}</small></td><td><span className="audit-action">{humanizar(log.accion)}</span></td><td>{humanizar(log.entidad)}{log.entidadId && <small>#{log.entidadId}</small>}</td><td title={detalleLegible(log.detalle)}>{detalleLegible(log.detalle)}</td></tr>)}</tbody></table>{!cargando && filtrados.length === 0 && <div className="module-empty-state"><strong>Sin movimientos</strong><p>No hay resultados para los filtros seleccionados.</p></div>}</div>
    </div>
  </section>;
}
