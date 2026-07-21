'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export type DashboardUser = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

type DashboardRole = 'administrador' | 'coordinador' | 'docente' | 'portero';
type DashboardSection = 'inicio' | 'personas' | 'seguimiento' | 'reportes' | 'perfil';

type DashboardStats = {
  metricas: {
    usuarios: number;
    estudiantes: number;
    reportes: number;
    reportesPendientes: number;
    convivenciaAbierta: number;
    salidasPendientes: number;
    alertasActivas: number;
    notificacionesNoLeidas: number;
  };
  graficas: {
    reportesPorTipo: Array<{ tipo: string; total: number }>;
    salidasPorEstado: Array<{ estado: string; total: number }>;
  };
  tablas: {
    ultimosReportes: Array<Record<string, unknown>>;
    ultimasSalidas: Array<Record<string, unknown>>;
  };
};

const EMPTY_STATS: DashboardStats = {
  metricas: {
    usuarios: 0,
    estudiantes: 0,
    reportes: 0,
    reportesPendientes: 0,
    convivenciaAbierta: 0,
    salidasPendientes: 0,
    alertasActivas: 0,
    notificacionesNoLeidas: 0,
  },
  graficas: {
    reportesPorTipo: [],
    salidasPorEstado: [],
  },
  tablas: {
    ultimosReportes: [],
    ultimasSalidas: [],
  },
};

const ROLE_LABELS: Record<DashboardRole, string> = {
  administrador: 'Administrador',
  coordinador: 'Coordinador',
  docente: 'Docente',
  portero: 'Portero',
};

const ROLE_CONFIG: Record<DashboardRole, {
  headline: string;
  summary: string;
  actions: string[];
}> = {
  administrador: {
    headline: 'Vista general institucional',
    summary: 'Control de usuarios, módulos, reportes y configuración del sistema.',
    actions: ['Crear usuario', 'Asignar roles', 'Auditar actividad'],
  },
  coordinador: {
    headline: 'Seguimiento de convivencia',
    summary: 'Priorización de casos, alertas académicas y acompañamiento escolar.',
    actions: ['Revisar casos', 'Generar reporte', 'Programar seguimiento'],
  },
  docente: {
    headline: 'Registro docente',
    summary: 'Acceso rápido para registrar novedades y consultar estudiantes asignados.',
    actions: ['Registrar novedad', 'Consultar estudiante', 'Ver historial'],
  },
  portero: {
    headline: 'Control de ingreso',
    summary: 'Herramientas para registrar entradas, salidas y novedades de portería.',
    actions: ['Registrar entrada', 'Registrar salida', 'Validar visitante'],
  },
};

const SECTIONS: Array<{ id: DashboardSection; label: string }> = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'personas', label: 'Personas' },
  { id: 'seguimiento', label: 'Seguimiento' },
  { id: 'reportes', label: 'Reportes' },
  { id: 'perfil', label: 'Perfil' },
];

function normalizeRole(rol: string): DashboardRole {
  const value = rol.trim().toLowerCase();
  if (value.includes('admin')) return 'administrador';
  if (value.includes('coord')) return 'coordinador';
  if (value.includes('doc')) return 'docente';
  if (value.includes('port')) return 'portero';
  return 'docente';
}

function metricasPorRol(role: DashboardRole, stats: DashboardStats) {
  if (role === 'administrador') {
    return [
      { label: 'Usuarios activos', value: stats.metricas.usuarios },
      { label: 'Estudiantes activos', value: stats.metricas.estudiantes },
      { label: 'Reportes registrados', value: stats.metricas.reportes },
    ];
  }
  if (role === 'coordinador') {
    return [
      { label: 'Reportes pendientes', value: stats.metricas.reportesPendientes },
      { label: 'Alertas activas', value: stats.metricas.alertasActivas },
      { label: 'Salidas pendientes', value: stats.metricas.salidasPendientes },
    ];
  }
  if (role === 'docente') {
    return [
      { label: 'Estudiantes activos', value: stats.metricas.estudiantes },
      { label: 'Reportes registrados', value: stats.metricas.reportes },
      { label: 'Pendientes', value: stats.metricas.reportesPendientes },
    ];
  }
  return [
    { label: 'Estudiantes activos', value: stats.metricas.estudiantes },
    { label: 'Salidas pendientes', value: stats.metricas.salidasPendientes },
    { label: 'Notificaciones', value: stats.metricas.notificacionesNoLeidas },
  ];
}

function texto(valor: unknown) {
  if (valor == null) return '';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  return String(valor);
}

export default function DashboardExperience({ usuario }: { usuario: DashboardUser }) {
  const router = useRouter();
  const [section, setSection] = useState<DashboardSection>('inicio');
  const [closing, setClosing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const role = useMemo(() => normalizeRole(usuario.rol), [usuario.rol]);
  const config = ROLE_CONFIG[role];

  useEffect(() => {
    let activo = true;

    async function cargarEstadisticas() {
      setLoadingStats(true);
      setStatsError(null);

      try {
        const res = await fetch('/api/dashboard/estadisticas', { cache: 'no-store' });
        if (!res.ok) throw new Error('No se pudieron cargar las estadísticas');
        const data = await res.json();
        if (activo) setStats({ ...EMPTY_STATS, ...data });
      } catch (error) {
        if (activo) {
          setStats(EMPTY_STATS);
          setStatsError(error instanceof Error ? error.message : 'Error cargando estadísticas');
        }
      } finally {
        if (activo) setLoadingStats(false);
      }
    }

    cargarEstadisticas();

    return () => {
      activo = false;
    };
  }, []);

  async function handleLogout() {
    setClosing(true);
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'logout' }),
    });
    sessionStorage.setItem('sigde_logout_message', 'Sesión cerrada correctamente.');
    router.push('/');
  }

  return (
    <main className="app-shell">
      <aside className="app-sidebar" aria-label="Navegación principal">
        <div className="app-brand">
          <strong>SIGDE</strong>
          <span>{ROLE_LABELS[role]}</span>
        </div>
        <nav className="app-nav">
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={section === item.id ? 'app-nav-item app-nav-item--active' : 'app-nav-item'}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="app-main">
        <header className="app-topbar">
          <div>
            <p>{ROLE_LABELS[role]}</p>
            <h1>{config.headline}</h1>
            <span>{config.summary}</span>
          </div>
          <button className="logout-button" type="button" disabled={closing} onClick={handleLogout}>
            {closing ? 'Cerrando...' : 'Cerrar sesión'}
          </button>
        </header>

        {statsError && <p className="feedback error">{statsError}</p>}
        <DashboardContent
          section={section}
          usuario={usuario}
          role={role}
          config={config}
          stats={stats}
          loadingStats={loadingStats}
        />
      </section>
    </main>
  );
}

function DashboardContent({
  section,
  usuario,
  role,
  config,
  stats,
  loadingStats,
}: {
  section: DashboardSection;
  usuario: DashboardUser;
  role: DashboardRole;
  config: typeof ROLE_CONFIG[DashboardRole];
  stats: DashboardStats;
  loadingStats: boolean;
}) {
  const metrics = metricasPorRol(role, stats);

  if (section === 'perfil') {
    return (
      <section className="workspace-panel">
        <SectionTitle title="Perfil" subtitle="Información de la sesión activa." />
        <dl className="profile-list">
          <div><dt>Nombre</dt><dd>{usuario.nombre}</dd></div>
          <div><dt>Correo</dt><dd>{usuario.correo}</dd></div>
          <div><dt>Rol</dt><dd>{ROLE_LABELS[role]}</dd></div>
        </dl>
      </section>
    );
  }

  if (section === 'personas') {
    return (
      <section className="workspace-panel">
        <SectionTitle title="Personas" subtitle="Datos institucionales conectados al backend." />
        <div className="metric-grid">
          <Metric label="Usuarios activos" value={stats.metricas.usuarios} loading={loadingStats} />
          <Metric label="Estudiantes activos" value={stats.metricas.estudiantes} loading={loadingStats} />
          <Metric label="Alertas activas" value={stats.metricas.alertasActivas} loading={loadingStats} />
        </div>
      </section>
    );
  }

  if (section === 'seguimiento') {
    return (
      <section className="workspace-panel">
        <SectionTitle title="Seguimiento" subtitle="Tareas operativas principales para el rol." />
        <div className="action-grid">
          {config.actions.map((action) => <button key={action} type="button">{action}</button>)}
        </div>
        <DataList title="Últimos reportes" rows={stats.tablas.ultimosReportes} loading={loadingStats} />
      </section>
    );
  }

  if (section === 'reportes') {
    return (
      <section className="workspace-panel">
        <SectionTitle title="Reportes" subtitle="Indicadores calculados desde reportes y salidas reales." />
        <div className="metric-grid">
          {metrics.map((metric) => <Metric key={metric.label} {...metric} loading={loadingStats} />)}
        </div>
        <Chart title="Reportes por tipo" data={stats.graficas.reportesPorTipo.map((item) => ({ label: item.tipo, value: Number(item.total) }))} />
        <Chart title="Salidas por estado" data={stats.graficas.salidasPorEstado.map((item) => ({ label: item.estado, value: Number(item.total) }))} />
      </section>
    );
  }

  return (
    <section className="workspace-panel">
      <SectionTitle title="Inicio" subtitle="Resumen de trabajo y accesos rápidos." />
      <div className="metric-grid">
        {metrics.map((metric) => <Metric key={metric.label} {...metric} loading={loadingStats} />)}
      </div>
      <DataList title="Últimas salidas" rows={stats.tablas.ultimasSalidas} loading={loadingStats} />
    </section>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="module-title">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

function Metric({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <div className="mini-metric">
      <strong>{loading ? '...' : value.toLocaleString('es-CO')}</strong>
      <span>{label}</span>
    </div>
  );
}

function Chart({ title, data }: { title: string; data: Array<{ label: string; value: number }> }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="table-preview">
      <Row title={title} text={data.length ? 'Distribución actual' : 'Sin datos registrados'} />
      {data.map((item) => (
        <div key={item.label} className="chart-row">
          <strong>{item.label}</strong>
          <span>{item.value.toLocaleString('es-CO')}</span>
          <div className="chart-bar" style={{ inlineSize: `${Math.max((item.value / max) * 100, 6)}%` }} />
        </div>
      ))}
    </div>
  );
}

function DataList({ title, rows, loading }: { title: string; rows: Array<Record<string, unknown>>; loading: boolean }) {
  if (loading) {
    return (
      <div className="activity-list">
        <span>Cargando datos...</span>
      </div>
    );
  }

  return (
    <div className="table-preview">
      <Row title={title} text={rows.length ? `${rows.length} registros recientes` : 'Sin registros'} />
      {rows.map((row, index) => (
        <div key={String(row.id ?? index)}>
          <strong>{texto(row.estudiante || row.nombre || row.id || 'Registro')}</strong>
          <span>{Object.entries(row).slice(1, 5).map(([, value]) => texto(value)).filter(Boolean).join(' · ')}</span>
        </div>
      ))}
    </div>
  );
}

function Row({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}
