'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

export type DashboardUser = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

type DashboardRole = 'coordinador' | 'docente' | 'portero';
type DashboardSection = 'dashboard' | 'usuarios' | 'personas' | 'seguimiento' | 'estadisticas' | 'salidas' | 'comunicaciones' | 'calendario' | 'reportes' | 'configuracion' | 'perfil' | 'auditoria';

const DASHBOARD_SECTIONS: DashboardSection[] = ['dashboard', 'usuarios', 'personas', 'seguimiento', 'estadisticas', 'salidas', 'comunicaciones', 'calendario', 'reportes', 'configuracion', 'perfil', 'auditoria'];

function sectionFromUrl(value: string | null): DashboardSection {
  return DASHBOARD_SECTIONS.includes(value as DashboardSection) ? value as DashboardSection : 'dashboard';
}

function obtenerResumenSemana(reference = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(reference);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => Number(partes.find((parte) => parte.type === tipo)?.value);
  const fechaBogota = new Date(Date.UTC(valor('year'), valor('month') - 1, valor('day')));
  const diaSemana = fechaBogota.getUTCDay();
  const diasDesdeSabado = (diaSemana + 1) % 7;
  const sabadoDeCorte = new Date(fechaBogota);
  sabadoDeCorte.setUTCDate(fechaBogota.getUTCDate() - diasDesdeSabado);
  const viernes = new Date(sabadoDeCorte);
  viernes.setUTCDate(sabadoDeCorte.getUTCDate() - 1);
  const lunes = new Date(viernes);
  lunes.setUTCDate(viernes.getUTCDate() - 4);

  const dia = (fecha: Date) => fecha.getUTCDate();
  const mes = (fecha: Date) => new Intl.DateTimeFormat('es-CO', { month: 'long', timeZone: 'UTC' }).format(fecha);
  const anoLunes = lunes.getUTCFullYear();
  const anoViernes = viernes.getUTCFullYear();

  if (anoLunes !== anoViernes) {
    return `Semana del ${dia(lunes)} de ${mes(lunes)}, ${anoLunes} al ${dia(viernes)} de ${mes(viernes)}, ${anoViernes}`;
  }

  if (lunes.getUTCMonth() !== viernes.getUTCMonth()) {
    return `Semana del ${dia(lunes)} de ${mes(lunes)} al ${dia(viernes)} de ${mes(viernes)}, ${anoViernes}`;
  }

  return `Semana del ${dia(lunes)} al ${dia(viernes)} de ${mes(viernes)}, ${anoViernes}`;
}

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
    notificaciones: number;
    salidasHoy: number;
    salidasAyer: number;
    eventosProximos: number;
  };
  resumenSemanal: {
    reportes: number;
    reportesSemanaAnterior: number;
    gradoMayorActividad: string | null;
    registrosGrado: number;
    salidasAutorizadas: number;
  };
  graficas: {
    actividadSemanal: Array<{
      dia: string;
      tipoI: number;
      tipoII: number;
      tipoIII: number;
    }>;
    reportesPorTipo: Array<{ tipo: string; total: number }>;
    salidasSemanales: number;
    salidasPorEstado: Array<{ estado: string; total: number }>;
  };
  tablas: {
    ultimosReportes: Array<Record<string, unknown>>;
    ultimasSalidas: Array<Record<string, unknown>>;
  };
};

type UsuarioSistema = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
  creadoEn: string;
};

type UsuarioForm = {
  nombre: string;
  correo: string;
  rol: string;
  contrasena: string;
  activo: boolean;
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
    notificaciones: 0,
    salidasHoy: 0,
    salidasAyer: 0,
    eventosProximos: 0,
  },
  resumenSemanal: {
    reportes: 0,
    reportesSemanaAnterior: 0,
    gradoMayorActividad: null,
    registrosGrado: 0,
    salidasAutorizadas: 0,
  },
  graficas: {
    actividadSemanal: [
      { dia: 'Lun', tipoI: 0, tipoII: 0, tipoIII: 0 },
      { dia: 'Mar', tipoI: 0, tipoII: 0, tipoIII: 0 },
      { dia: 'Mié', tipoI: 0, tipoII: 0, tipoIII: 0 },
      { dia: 'Jue', tipoI: 0, tipoII: 0, tipoIII: 0 },
      { dia: 'Vie', tipoI: 0, tipoII: 0, tipoIII: 0 },
    ],
    reportesPorTipo: [],
    salidasSemanales: 0,
    salidasPorEstado: [],
  },
  tablas: {
    ultimosReportes: [],
    ultimasSalidas: [],
  },
};

const ROLE_LABELS: Record<DashboardRole, string> = {
  coordinador: 'Coordinador',
  docente: 'Docente',
  portero: 'Portero',
};

const USER_ROLES = ['Coordinador', 'Docente', 'Porteria'];

const EMPTY_USER_FORM: UsuarioForm = {
  nombre: '',
  correo: '',
  rol: 'Docente',
  contrasena: '',
  activo: true,
};

const ROLE_CONFIG: Record<DashboardRole, {
  headline: string;
  summary: string;
  actions: string[];
}> = {
  coordinador: {
    headline: 'Gestión y seguimiento institucional',
    summary: 'Gestiona usuarios y configuración, y realiza el seguimiento de convivencia y alertas.',
    actions: ['Gestionar usuarios', 'Revisar casos', 'Programar seguimiento'],
  },
  docente: {
    headline: 'Registro docente',
    summary: 'Acceso rápido para registrar reportes y consultar estudiantes asignados.',
    actions: ['Registrar reporte', 'Consultar estudiante', 'Ver historial'],
  },
  portero: {
    headline: 'Control de salidas',
    summary: 'Consulta y registra las salidas autorizadas de su turno.',
    actions: ['Registrar salida', 'Consultar salidas'],
  },
};

const NAV_GROUPS: Array<{
  label: string;
  gestion?: boolean;
  items: Array<{ id: DashboardSection; label: string }>;
}> = [
  { label: 'PRINCIPAL', items: [{ id: 'dashboard', label: 'Dashboard' }] },
  { label: 'OPERATIVO', items: [{ id: 'reportes', label: 'Reportes' }, { id: 'salidas', label: 'Salidas' }] },
  { label: 'ANALÍTICA', items: [{ id: 'seguimiento', label: 'Seguimiento' }, { id: 'estadisticas', label: 'Estadísticas' }] },
  { label: 'INFORMACIÓN', items: [{ id: 'comunicaciones', label: 'Comunicaciones' }, { id: 'calendario', label: 'Calendario' }] },
  { label: 'GESTIÓN', gestion: true, items: [{ id: 'usuarios', label: 'Usuarios' }, { id: 'personas', label: 'Estudiantes' }, { id: 'configuracion', label: 'Configuración' }, { id: 'perfil', label: 'Perfil' }] },
];

type SidebarIconName = 'dashboard' | 'users' | 'graduation' | 'document' | 'door' | 'message' | 'calendar' | 'chart' | 'settings' | 'profile' | 'logout' | 'chevron' | 'chevronDown' | 'search' | 'sparkles';

const ICON_BY_SECTION: Record<DashboardSection, SidebarIconName> = {
  dashboard: 'dashboard', usuarios: 'users', personas: 'graduation', seguimiento: 'document', estadisticas: 'chart', salidas: 'door', comunicaciones: 'message', calendario: 'calendar', reportes: 'chart', configuracion: 'settings', perfil: 'profile', auditoria: 'document',
};

function SidebarIcon({ name }: { name: SidebarIconName }) {
  const paths: Record<SidebarIconName, React.ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    users: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2" /><path d="M3.5 20c.5-3.2 2.4-5 5.5-5s5 1.8 5.5 5M15 15.5c2.8.1 4.5 1.6 5 4.5" /></>,
    graduation: <><path d="m3 9 9-5 9 5-9 5-9-5Z" /><path d="M7 11.2V16c2.8 2 7.2 2 10 0v-4.8M21 9v6" /></>,
    document: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></>,
    door: <><path d="M5 21V4a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v17M3 21h18M9 21V7h5v14M12 14h.01" /></>,
    message: <path d="M20 15a3 3 0 0 1-3 3H9l-5 3V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3z" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.3 2.3-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-3.2v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L6 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4.7v-3.2h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L6 7.8 8.3 5.5l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h3.2v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.3 2.3-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z" /></>,
    profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21c.7-4 3.3-6 8-6s7.3 2 8 6" /></>,
    logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9" /></>,
    chevron: <path d="m14 7-5 5 5 5" />,
    chevronDown: <path d="m6 9 6 6 6-6" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" /><path d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14ZM19 12l.6 1.4L21 14l-1.4.6L19 16l-.6-1.4L17 14l1.4-.6L19 12Z" /></>,
  };

  return <svg className="sidebar-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function normalizeRole(rol: string): DashboardRole {
  const value = rol.trim().toLowerCase();
  if (value.includes('coord')) return 'coordinador';
  if (value.includes('doc')) return 'docente';
  if (value.includes('port')) return 'portero';
  return 'docente';
}

function metricasPorRol(role: DashboardRole, stats: DashboardStats) {
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

function usuarioToForm(usuario: UsuarioSistema): UsuarioForm {
  return {
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    contrasena: '',
    activo: usuario.activo,
  };
}

async function leerErrorApi(res: Response, fallback: string) {
  const data = await res.json().catch(() => null);
  return typeof data?.error === 'string' ? data.error : fallback;
}

export default function DashboardExperience({ usuario }: { usuario: DashboardUser }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [section, setSection] = useState<DashboardSection>(() => sectionFromUrl(searchParams.get('seccion') || searchParams.get('dashboard')));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dashboardSnapshot, setDashboardSnapshot] = useState<DashboardStats | null>(null);
  const [dashboardError, setDashboardError] = useState('');
  const role = useMemo(() => normalizeRole(usuario.rol), [usuario.rol]);

  useEffect(() => {
    const legacySection = searchParams.get('dashboard');

    if (legacySection) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('dashboard');
      if (legacySection !== 'dashboard' && !params.has('seccion')) params.set('seccion', legacySection);
      const query = params.toString();
      window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
    }

    const sincronizarDesdeHistorial = () => {
      const params = new URLSearchParams(window.location.search);
      setSection(sectionFromUrl(params.get('seccion') || params.get('dashboard')));
    };

    window.addEventListener('popstate', sincronizarDesdeHistorial);
    return () => window.removeEventListener('popstate', sincronizarDesdeHistorial);
  }, [searchParams]);

  function seleccionarSeccion(nextSection: DashboardSection) {
    setSection(nextSection);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('dashboard');
    if (nextSection === 'dashboard') {
      params.delete('seccion');
    } else {
      params.set('seccion', nextSection);
    }
    const query = params.toString();
    window.history.pushState(null, '', query ? `?${query}` : window.location.pathname);
  }

  useEffect(() => {
    if (section !== 'dashboard') return;
    let activo = true;

    fetch('/api/dashboard/estadisticas', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('No se pudo cargar el resumen semanal');
        return response.json();
      })
      .then((data) => {
        if (!activo) return;
        setDashboardSnapshot({
          ...EMPTY_STATS,
          ...data,
          metricas: { ...EMPTY_STATS.metricas, ...data.metricas },
          resumenSemanal: { ...EMPTY_STATS.resumenSemanal, ...data.resumenSemanal },
          graficas: { ...EMPTY_STATS.graficas, ...data.graficas },
          tablas: { ...EMPTY_STATS.tablas, ...data.tablas },
        });
        setDashboardError('');
      })
      .catch(() => {
        if (!activo) return;
        setDashboardSnapshot(null);
        setDashboardError('No fue posible cargar los datos del dashboard. Verifica la conexión e inténtalo de nuevo.');
      });

    return () => { activo = false; };
  }, [section]);

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
    <main data-theme="dark" className={sidebarCollapsed ? 'app-shell app-shell--sidebar-collapsed' : 'app-shell'}>
      <aside className="app-sidebar" aria-label="Navegación principal">
        <div className="app-sidebar-head">
          <div className="app-brand">
          <strong>SIGDE</strong>
          <span>{ROLE_LABELS[role]}</span>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed((actual) => !actual)}
            aria-label={sidebarCollapsed ? 'Mostrar menú' : 'Ocultar menú'}
            title={sidebarCollapsed ? 'Mostrar menú' : 'Ocultar menú'}
          >
            <SidebarIcon name="chevron" />
          </button>
        </div>
        <nav className="app-nav">
          {NAV_GROUPS.filter((group) => !group.gestion || role === 'coordinador').map((group) => (
            <div className="app-nav-group" key={group.label}>
              <span className="app-nav-group-label">{group.label}</span>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-tooltip={item.label}
                  className={section === item.id ? 'app-nav-item app-nav-item--active' : 'app-nav-item'}
                  onClick={() => seleccionarSeccion(item.id)}
                >
                  <span className="app-nav-icon"><SidebarIcon name={ICON_BY_SECTION[item.id]} /></span>
                  <span className="app-nav-label">{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="app-sidebar-footer">
          <div className="sidebar-user-card"><span className="admin-avatar">{usuario.nombre.slice(0, 1).toUpperCase()}</span><span className="sidebar-user-copy"><strong>{usuario.nombre}</strong><small>{ROLE_LABELS[role]}</small></span><button type="button" className="sidebar-logout" onClick={handleLogout} disabled={closing} aria-label="Cerrar sesión" title="Cerrar sesión"><SidebarIcon name="logout" /></button></div>
        </div>
      </aside>

      <section className="app-main">
        <header className="app-topbar app-topbar--account-only">
          <label className="topbar-global-search">
            <span className="sr-only">Buscar estudiantes o reportes</span>
            <SidebarIcon name="search" />
            <input type="search" placeholder="Buscar estudiantes, reportes..." />
          </label>
          <div className="app-topbar-tools">
            <div className="profile-menu-wrap">
              <button className="profile-menu-trigger" type="button" onClick={() => setProfileOpen((actual) => !actual)} aria-expanded={profileOpen} aria-haspopup="menu"><span className="admin-avatar">{usuario.nombre.slice(0, 1).toUpperCase()}</span><span className="profile-menu-name">{usuario.nombre.split(' ')[0]}</span><span className="profile-menu-chevron"><SidebarIcon name="chevronDown" /></span></button>
              {profileOpen && <div className="profile-menu" role="menu"><strong>{usuario.nombre}</strong><span>{usuario.correo}</span><button type="button" role="menuitem" onClick={() => { seleccionarSeccion('perfil'); setProfileOpen(false); }}><SidebarIcon name="profile" /> Mi perfil</button><button className="profile-menu-logout" type="button" role="menuitem" disabled={closing} onClick={handleLogout}><SidebarIcon name="logout" /> {closing ? 'Cerrando...' : 'Cerrar sesión'}</button></div>}
            </div>
          </div>
        </header>

        {section === 'dashboard' ? (
          <section className="dashboard-weekly-summary" aria-labelledby="dashboard-title">
            <h1 id="dashboard-title">Dashboard</h1>
            <p>Resumen institucional <span aria-hidden="true">·</span> {obtenerResumenSemana()}</p>
            {dashboardError && <p className="dashboard-data-error" role="alert">{dashboardError}</p>}
            <WeeklyInsightCard summary={dashboardSnapshot?.resumenSemanal ?? null} activeAlerts={dashboardSnapshot?.metricas.alertasActivas ?? 0} onViewAnalysis={() => seleccionarSeccion('estadisticas')} />
            <DashboardMetricCards stats={dashboardSnapshot} />
            <DashboardAnalytics stats={dashboardSnapshot} />
          </section>
        ) : (
          <section className="dashboard-empty-canvas" aria-label="Área de trabajo vacía" />
        )}
      </section>
    </main>
  );
}

function WeeklyInsightCard({
  summary,
  activeAlerts,
  onViewAnalysis,
}: {
  summary: DashboardStats['resumenSemanal'] | null;
  activeAlerts: number;
  onViewAnalysis: () => void;
}) {
  const diferencia = summary ? summary.reportes - summary.reportesSemanaAnterior : 0;
  const porcentaje = summary && summary.reportesSemanaAnterior > 0
    ? Math.round(Math.abs(diferencia / summary.reportesSemanaAnterior) * 100)
    : null;

  return (
    <article className="weekly-insight-card">
      <span className="weekly-insight-icon"><SidebarIcon name="sparkles" /></span>
      <div className="weekly-insight-content">
        <div className="weekly-insight-heading">
          <h2>Resumen inteligente generado por SIGDE</h2>
          <span>DATOS REALES</span>
        </div>
        {summary ? (
          <p>
            Durante la semana analizada se registraron <strong>{summary.reportes} reportes</strong>.
            {summary.gradoMayorActividad && <> El grado <strong>{summary.gradoMayorActividad}</strong> presentó la mayor actividad con <strong>{summary.registrosGrado} reportes</strong>.</>}
            {porcentaje !== null && diferencia !== 0 && <> Se observó {diferencia > 0 ? 'un incremento' : 'una reducción'} del <strong>{porcentaje}%</strong> frente a la semana anterior.</>}
            {diferencia === 0 && summary.reportesSemanaAnterior > 0 && <> La cantidad de reportes se mantuvo igual a la semana anterior.</>}
          </p>
        ) : (
          <p className="weekly-insight-loading">Calculando el resumen con los registros de la semana...</p>
        )}
        <div className="weekly-insight-actions">
          <span className="weekly-alert-count"><b aria-hidden="true">!</b> {activeAlerts} {activeAlerts === 1 ? 'alerta activa' : 'alertas activas'}</span>
          <button type="button" onClick={onViewAnalysis}>Ver análisis completo <span aria-hidden="true">→</span></button>
        </div>
      </div>
    </article>
  );
}

function DashboardMetricCards({ stats }: { stats: DashboardStats | null }) {
  const weekly = stats?.resumenSemanal;
  const diferenciaReportes = weekly ? weekly.reportes - weekly.reportesSemanaAnterior : 0;
  const porcentajeReportes = weekly && weekly.reportesSemanaAnterior > 0
    ? Math.round((diferenciaReportes / weekly.reportesSemanaAnterior) * 100)
    : null;
  const format = (value: number) => new Intl.NumberFormat('es-CO').format(value);
  const cards: Array<{
    label: string;
    value: number;
    detail: string;
    icon: SidebarIconName;
    tone: string;
    trend?: string;
    trendDown?: boolean;
  }> = [
    { label: 'Estudiantes', value: stats?.metricas.estudiantes ?? 0, detail: 'Activos', icon: 'graduation', tone: 'blue' },
    { label: 'Usuarios', value: stats?.metricas.usuarios ?? 0, detail: 'Cuentas activas', icon: 'users', tone: 'cyan' },
    { label: 'Reportes (semana)', value: weekly?.reportes ?? 0, detail: 'vs. semana anterior', icon: 'document', tone: 'sky', trend: porcentajeReportes === null ? undefined : `${porcentajeReportes > 0 ? '+' : ''}${porcentajeReportes}%`, trendDown: (porcentajeReportes ?? 0) < 0 },
    { label: 'Salidas (semana)', value: stats?.graficas.salidasSemanales ?? 0, detail: 'En el periodo', icon: 'door', tone: 'aqua' },
    { label: 'Comunicaciones (semana)', value: stats?.metricas.notificaciones ?? 0, detail: `${stats?.metricas.notificacionesNoLeidas ?? 0} sin leer`, icon: 'message', tone: 'ocean' },
    { label: 'Eventos (semana)', value: stats?.metricas.eventosProximos ?? 0, detail: stats?.metricas.eventosProximos ? 'Programados' : 'Sin eventos', icon: 'calendar', tone: 'navy' },
  ];

  return (
    <section className="dashboard-metric-grid" aria-label="Indicadores institucionales">
      {cards.map((card) => (
        <article className={`dashboard-metric-card dashboard-metric-card--${card.tone}`} key={card.label}>
          <div className="dashboard-metric-top">
            <span className="dashboard-metric-icon"><SidebarIcon name={card.icon} /></span>
            {card.trend && <span className={card.trendDown ? 'dashboard-metric-trend dashboard-metric-trend--down' : 'dashboard-metric-trend'}>{card.trend}</span>}
          </div>
          <strong>{stats ? format(card.value) : '—'}</strong>
          <span>{card.label}</span>
          <small>{card.detail}</small>
        </article>
      ))}
    </section>
  );
}

const ACTIVITY_SERIES = [
  { key: 'tipoI', label: 'Tipo I', color: '#d9b44a' },
  { key: 'tipoII', label: 'Tipo II', color: '#d97706' },
  { key: 'tipoIII', label: 'Tipo III', color: '#ef4444' },
] as const;

const NOVELTY_TYPE_COLORS: Record<string, string> = {
  TIPO_I: '#d9b44a',
  TIPO_II: '#d97706',
  TIPO_III: '#ef4444',
  SALIDAS: '#3182ce',
};

function noveltyColor(tipo: string) {
  return NOVELTY_TYPE_COLORS[tipo] || '#6f8ba8';
}

function DashboardAnalytics({ stats }: { stats: DashboardStats | null }) {
  const actividad = stats?.graficas.actividadSemanal ?? EMPTY_STATS.graficas.actividadSemanal;
  const distribucion = [
    ...(stats?.graficas.reportesPorTipo ?? []),
    { tipo: 'SALIDAS', total: stats?.graficas.salidasSemanales ?? 0 },
  ].filter((item) => Number(item.total) > 0);

  return (
    <section className="dashboard-analytics-grid" aria-label="Análisis semanal">
      <WeeklyActivityChart data={actividad} loading={!stats} />
      <DataDistributionChart data={distribucion} loading={!stats} />
    </section>
  );
}

function smoothLinePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

function WeeklyActivityChart({ data, loading }: {
  data: DashboardStats['graficas']['actividadSemanal'];
  loading: boolean;
}) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const width = 760;
  const height = 250;
  const padding = { top: 28, right: 20, bottom: 34, left: 42 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const highest = Math.max(0, ...data.flatMap((day) => ACTIVITY_SERIES.map((serie) => Number(day[serie.key]) || 0)));
  const maxValue = Math.max(4, Math.ceil(highest / 4) * 4);
  const xFor = (index: number) => padding.left + (chartWidth / Math.max(1, data.length - 1)) * index;
  const yFor = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const ticks = Array.from({ length: 5 }, (_, index) => Math.round((maxValue / 4) * index));
  const hovered = hoveredDay === null ? null : data[hoveredDay];
  const hoveredX = hoveredDay === null ? 0 : xFor(hoveredDay);
  const tooltipWidth = 154;
  const tooltipHeight = 88;
  const tooltipX = hoveredX > width / 2
    ? Math.max(8, hoveredX - tooltipWidth - 14)
    : Math.min(width - tooltipWidth - 8, hoveredX + 14);
  const hoveredHighestY = hovered
    ? Math.min(...ACTIVITY_SERIES.map((serie) => yFor(hovered[serie.key])))
    : padding.top;
  const tooltipY = hoveredHighestY < padding.top + tooltipHeight + 12
    ? Math.min(height - padding.bottom - tooltipHeight, hoveredHighestY + 14)
    : Math.max(8, hoveredHighestY - tooltipHeight - 14);

  return (
    <article className="dashboard-chart-card dashboard-activity-card">
      <header className="dashboard-chart-heading">
        <div><h2>Reportes esta semana</h2><p>Situaciones Tipo I, II y III</p></div>
        <div className="dashboard-chart-legend" aria-label="Series">
          {ACTIVITY_SERIES.map((serie) => <span key={serie.key}><i style={{ background: serie.color }} />{serie.label}</span>)}
        </div>
      </header>
      <div className={loading ? 'activity-chart-wrap activity-chart-wrap--loading' : 'activity-chart-wrap'}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Reportes diarios de la semana clasificados por tipo" onMouseLeave={() => setHoveredDay(null)}>
          <defs>
            <linearGradient id="activity-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d9b44a" stopOpacity=".18" />
              <stop offset="100%" stopColor="#d9b44a" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => {
            const y = yFor(tick);
            return <g key={tick}><line className="activity-grid-line" x1={padding.left} x2={width - padding.right} y1={y} y2={y} /><text className="activity-axis-label" x={padding.left - 10} y={y + 4} textAnchor="end">{tick}</text></g>;
          })}
          {data.map((day, index) => <line key={day.dia} className="activity-grid-line activity-grid-line--vertical" x1={xFor(index)} x2={xFor(index)} y1={padding.top} y2={height - padding.bottom} />)}
          {(() => {
            const points = data.map((day, index) => ({ x: xFor(index), y: yFor(day.tipoI) }));
            const line = smoothLinePath(points);
            const area = points.length ? `${line} L ${points.at(-1)?.x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z` : '';
            return <path d={area} fill="url(#activity-area)" />;
          })()}
          {ACTIVITY_SERIES.map((serie) => {
            const points = data.map((day, index) => ({ x: xFor(index), y: yFor(day[serie.key]) }));
            return <path key={serie.key} className="activity-series-line" d={smoothLinePath(points)} stroke={serie.color} />;
          })}
          {data.map((day, index) => <text key={day.dia} className="activity-axis-label activity-day-label" x={xFor(index)} y={height - 10} textAnchor="middle">{day.dia}</text>)}
          {hoveredDay !== null && hovered && <>
            <line className="activity-hover-line" x1={hoveredX} x2={hoveredX} y1={padding.top} y2={height - padding.bottom} />
            {ACTIVITY_SERIES.map((serie) => <circle key={serie.key} cx={hoveredX} cy={yFor(hovered[serie.key])} r="5" fill={serie.color} stroke="#eaf5ff" strokeWidth="2" />)}
            <g className="activity-tooltip" transform={`translate(${tooltipX} ${tooltipY})`}>
              <rect width={tooltipWidth} height="88" rx="9" />
              <text className="activity-tooltip-day" x="12" y="20">{hovered.dia}</text>
              {ACTIVITY_SERIES.map((serie, index) => <g key={serie.key} transform={`translate(0 ${31 + index * 17})`}><circle cx="14" cy="0" r="4" fill={serie.color} /><text x="25" y="4">{serie.label}: <tspan>{hovered[serie.key]}</tspan></text></g>)}
            </g>
          </>}
          {data.map((day, index) => {
            const step = chartWidth / Math.max(1, data.length - 1);
            return <rect key={`hit-${day.dia}`} className="activity-hit-area" x={Math.max(padding.left, xFor(index) - step / 2)} y={padding.top} width={index === 0 || index === data.length - 1 ? step / 2 : step} height={chartHeight} onMouseEnter={() => setHoveredDay(index)} onFocus={() => setHoveredDay(index)} tabIndex={0} aria-label={`${day.dia}: ${day.tipoI} reportes Tipo I, ${day.tipoII} reportes Tipo II y ${day.tipoIII} reportes Tipo III`} />;
          })}
        </svg>
      </div>
    </article>
  );
}

function noveltyLabel(tipo: string) {
  const labels: Record<string, string> = {
    TIPO_I: 'Falta tipo I',
    TIPO_II: 'Falta tipo II',
    TIPO_III: 'Falta tipo III',
    SALIDAS: 'Salidas',
  };
  return labels[tipo] || tipo.replaceAll('_', ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

function DataDistributionChart({ data, loading }: {
  data: DashboardStats['graficas']['reportesPorTipo'];
  loading: boolean;
}) {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const total = data.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const radius = 56;
  const circumference = 2 * Math.PI * radius;

  return (
    <article className="dashboard-chart-card dashboard-distribution-card">
      <header className="dashboard-chart-heading"><div><h2>Distribución de Datos</h2><p>Reportes por tipo y salidas · Esta semana</p></div></header>
      <div className={loading ? 'distribution-chart-body distribution-chart-body--loading' : 'distribution-chart-body'}>
        <div className="donut-chart-wrap" onMouseLeave={() => setHoveredSegment(null)}>
          <svg viewBox="0 0 180 180" role="img" aria-label={`Distribución de ${total} datos esta semana`}>
            <circle className="donut-track" cx="90" cy="90" r={radius} />
            <g transform="rotate(-90 90 90)">
              {data.map((item, index) => {
                const value = Number(item.total || 0);
                const length = total ? (value / total) * circumference : 0;
                const previousTotal = data.slice(0, index).reduce((sum, previous) => sum + Number(previous.total || 0), 0);
                const offset = total ? -(previousTotal / total) * circumference : 0;
                return <circle key={item.tipo} className={hoveredSegment === index ? 'donut-segment donut-segment--active' : 'donut-segment'} cx="90" cy="90" r={radius} stroke={noveltyColor(item.tipo)} strokeDasharray={`${Math.max(0, length - 2)} ${circumference}`} strokeDashoffset={offset} onMouseEnter={() => setHoveredSegment(index)} onFocus={() => setHoveredSegment(index)} tabIndex={0} aria-label={`${noveltyLabel(item.tipo)}: ${value}`} />;
              })}
            </g>
            <text className="donut-total" x="90" y="86" textAnchor="middle">{total}</text>
            <text className="donut-total-label" x="90" y="104" textAnchor="middle">Datos</text>
          </svg>
        </div>
        {data.length > 0 ? <div className="distribution-legend">
          {data.map((item, index) => <button type="button" key={item.tipo} className={hoveredSegment === index ? 'distribution-legend-item distribution-legend-item--active' : 'distribution-legend-item'} onMouseEnter={() => setHoveredSegment(index)} onMouseLeave={() => setHoveredSegment(null)} onFocus={() => setHoveredSegment(index)} onBlur={() => setHoveredSegment(null)}><span><i style={{ background: noveltyColor(item.tipo) }} />{noveltyLabel(item.tipo)}</span><strong>{item.total}</strong></button>)}
        </div> : <p className="distribution-empty">Aún no hay reportes ni salidas registrados en esta semana.</p>}
      </div>
    </article>
  );
}

function DashboardContent({
  section,
  usuario,
  onCurrentUserUpdated,
  role,
  config,
  stats,
  loadingStats,
}: {
  section: DashboardSection;
  usuario: DashboardUser;
  onCurrentUserUpdated: () => void;
  role: DashboardRole;
  config: typeof ROLE_CONFIG[DashboardRole];
  stats: DashboardStats;
  loadingStats: boolean;
}) {
  const metrics = metricasPorRol(role, stats);

  if (role === 'coordinador' && section === 'personas') {
    return <DirectoryManagementWorkspace entity="estudiantes" />;
  }

  if (section === 'salidas') {
    return <ControlSalidasWorkspace />;
  }

  if (section === 'comunicaciones' || section === 'calendario') {
    const titles = {
      comunicaciones: ['Comunicaciones', 'Envía y consulta comunicados vinculados a estudiantes y acudientes.'],
      calendario: ['Calendario', 'Consulta reuniones, citaciones y actividades institucionales.'],
    } as const;
    const [title, subtitle] = titles[section];
    return <section className="workspace-panel"><SectionTitle title={title} subtitle={subtitle} /><div className="empty-state"><span aria-hidden="true">◌</span><strong>Módulo listo para conectar</strong><p>La estructura visual está preparada para integrar los registros reales del sistema.</p></div></section>;
  }

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

  if (section === 'usuarios') {
    return <UsuariosWorkspace role={role} currentUserId={usuario.id} onCurrentUserUpdated={onCurrentUserUpdated} />;
  }

  if (section === 'configuracion') {
    return (
      <section className="workspace-panel">
        <SectionTitle title="Configuración del sistema" subtitle="Parámetros institucionales disponibles para el coordinador." />
        <div className="action-grid">
          {['Mi perfil', 'Cuenta y seguridad', 'Umbrales de alertas', 'Tipos de faltas', 'Periodos académicos'].map((action) => <button key={action} type="button">{action}</button>)}
        </div>
      </section>
    );
  }

  if (section === 'auditoria') {
    return (
      <section className="workspace-panel">
        <SectionTitle title="Auditoría y seguridad" subtitle="Consulta quién accedió, qué modificó y cuándo ocurrió." />
        <DataList title="Actividad reciente" rows={stats.tablas.ultimosReportes} loading={loadingStats} />
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

function DirectoryManagementWorkspace({ entity }: { entity: 'docentes' | 'estudiantes' }) {
  const isDocente = entity === 'docentes';
  const title = isDocente ? 'Docentes' : 'Estudiantes';
  const records = isDocente
    ? [['Laura Méndez', 'laura.mendez@institucion.edu.co', 'Matemáticas', 'Activo'], ['Carlos Rojas', 'carlos.rojas@institucion.edu.co', 'Ciencias sociales', 'Activo'], ['Diana Torres', 'diana.torres@institucion.edu.co', 'Lengua castellana', 'Inactivo']]
    : [['Juan David Martínez', '11° - A', 'Acudiente registrado', 'Activo'], ['Valentina Gómez', '10° - B', 'Acudiente registrado', 'Activo'], ['Mateo Rodríguez', '8° - C', 'Acudiente pendiente', 'Activo']];

  return (
    <section className="workspace-panel directory-workspace">
      <div className="directory-heading"><SectionTitle title={title} subtitle={`Administra la información, el acceso y el estado de los ${title.toLowerCase()} de la institución.`} /><button className="primary-button" type="button">＋ Crear {isDocente ? 'docente' : 'estudiante'}</button></div>
      <div className="directory-toolbar"><label className="dashboard-search"><span className="sr-only">Buscar {title.toLowerCase()}</span><span aria-hidden="true">⌕</span><input placeholder={`Buscar ${title.toLowerCase()}...`} /></label><select aria-label={`Filtrar ${title.toLowerCase()} por estado`}><option>Todos los estados</option><option>Activos</option><option>Inactivos</option></select></div>
      <div className="directory-action-grid">{['Crear', 'Editar', 'Eliminar', 'Activar', 'Desactivar', 'Cambiar contraseña'].map((action) => <button type="button" key={action} className={action === 'Eliminar' ? 'directory-action directory-action--danger' : 'directory-action'}><span aria-hidden="true">{action === 'Crear' ? '＋' : action === 'Editar' ? '✎' : action === 'Eliminar' ? '⌫' : action === 'Activar' ? '✓' : action === 'Desactivar' ? '◌' : '♢'}</span>{action}</button>)}</div>
      <div className="directory-table-wrap"><table className="directory-table"><thead><tr><th>{isDocente ? 'Docente' : 'Estudiante'}</th><th>{isDocente ? 'Correo institucional' : 'Curso'}</th><th>{isDocente ? 'Área' : 'Acudiente'}</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{records.map((record) => <tr key={record[0]}>{record.map((value, index) => index === 3 ? <td key={index}><span className={`status-badge ${value === 'Activo' ? 'status-badge--active' : 'status-badge--inactive'}`}>{value}</span></td> : <td key={index}>{value}</td>)}<td><button type="button" className="table-action">Gestionar</button></td></tr>)}</tbody></table></div>
    </section>
  );
}

function ControlSalidasWorkspace() {
  const [estudiante, setEstudiante] = useState('');
  const [grado, setGrado] = useState('');
  const [acudiente, setAcudiente] = useState('');
  const [motivo, setMotivo] = useState('');
  const [urgencia, setUrgencia] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function registrarSalida(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const response = await fetch('/api/salidas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estudiante, grado, acudiente, motivo, urgencia }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'No se pudo registrar la salida.');
      setMensaje('Salida registrada y notificación preparada para el acudiente vinculado.');
      setEstudiante(''); setGrado(''); setAcudiente(''); setMotivo(''); setUrgencia(false);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : 'No se pudo registrar la salida.');
    } finally {
      setGuardando(false);
    }
  }

  return <section className="workspace-panel exit-control-workspace"><SectionTitle title="Control de salidas" subtitle="Registra salidas autorizadas, urgentes o sin autorización previa y conserva el vínculo con el acudiente." /><div className="exit-control-layout"><form className="exit-form" onSubmit={registrarSalida}><div className="exit-form-heading"><span className="stat-icon stat-icon--exit">↗</span><div><strong>Registrar nueva salida</strong><span>La actividad quedará asociada al estudiante y a su acudiente.</span></div></div><div className="exit-form-grid"><UserInput label="Estudiante o código" value={estudiante} onChange={setEstudiante} required /><UserInput label="Grado y grupo" value={grado} onChange={setGrado} required /><UserInput label="Acudiente que retira" value={acudiente} onChange={setAcudiente} required /><UserInput label="Motivo de salida" value={motivo} onChange={setMotivo} required /></div><label className="exit-urgency"><input type="checkbox" checked={urgencia} onChange={(event) => setUrgencia(event.target.checked)} /><span><strong>Salida de urgencia</strong><small>Se notificará de inmediato al acudiente vinculado.</small></span></label>{mensaje && <p className="feedback success">{mensaje}</p>}<button className="primary-button" type="submit" disabled={guardando}>{guardando ? 'Registrando...' : 'Registrar salida'}</button></form><div className="exit-info-card"><span className="eyebrow">Flujo seguro</span><h3>Vínculo estudiante–acudiente</h3><p>Cada salida debe identificar al estudiante, la persona que lo retira, el motivo y el tipo de autorización.</p><div className="exit-flow-step"><b>1</b><span>Buscar estudiante</span></div><div className="exit-flow-step"><b>2</b><span>Verificar acudiente autorizado</span></div><div className="exit-flow-step"><b>3</b><span>Guardar y notificar</span></div></div></div></section>;
}

function ChartCard({ title, meta, children }: { title: string; meta: string; children: React.ReactNode }) { return <article className="dashboard-card chart-card"><div className="card-heading"><div><h3>{title}</h3><span>{meta}</span></div><button type="button" aria-label={`Más opciones de ${title}`}>•••</button></div>{children}</article>; }
function RecentReports() { return <article className="dashboard-card"><div className="card-heading"><div><h3>Reportes recientes</h3><span>Última actividad registrada</span></div><button type="button">Ver todos</button></div><div className="recent-report-list">{[['Incidente de convivencia', 'Juan David Martínez', 'Hace 12 min', 'Alta'], ['Seguimiento académico', 'Valentina Gómez', 'Hace 48 min', 'Media'], ['Salida autorizada', 'Mateo Rodríguez', 'Hace 1 h', 'Baja']].map(([title, student, time, priority]) => <div className="recent-report" key={`${title}-${student}`}><span className="report-avatar">{student[0]}</span><div><strong>{title}</strong><span>{student} · {time}</span></div><em className={`priority-badge priority-badge--${priority.toLowerCase()}`}>{priority}</em></div>)}</div></article>; }
function AlertsPanel() { return <article className="dashboard-card"><div className="card-heading"><div><h3>Alertas y actividad</h3><span>Requieren tu atención</span></div><button type="button" aria-label="Ver todas las alertas">•••</button></div><div className="alert-list"><div><span className="alert-mark alert-mark--red">!</span><p><strong>14 alertas pendientes</strong><span>Estudiantes con seguimiento requerido</span></p></div><div><span className="alert-mark alert-mark--blue">✓</span><p><strong>Sincronización completada</strong><span>Todos los datos están actualizados</span></p></div><div><span className="alert-mark alert-mark--gold">i</span><p><strong>Revisión mensual</strong><span>El período cierra en 5 días</span></p></div></div></article>; }

function UsuariosWorkspace({ role, currentUserId, onCurrentUserUpdated }: { role: DashboardRole; currentUserId: number; onCurrentUserUpdated: () => void }) {
  const puedeGestionar = role === 'coordinador';
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);
  const [filtroRol, setFiltroRol] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [formCrear, setFormCrear] = useState<UsuarioForm>(EMPTY_USER_FORM);
  const [formEditar, setFormEditar] = useState<UsuarioForm>(EMPTY_USER_FORM);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);

  const usuarioSeleccionado = usuarios.find((usuario) => usuario.id === seleccionadoId) ?? usuarios[0] ?? null;
  const usuariosFiltrados = usuarios.filter((usuario) => {
    const coincideRol = filtroRol === 'Todos' || usuario.rol === filtroRol;
    const textoBusqueda = `${usuario.nombre} ${usuario.correo} ${usuario.rol}`.toLowerCase();
    return coincideRol && textoBusqueda.includes(busqueda.trim().toLowerCase());
  });

  const resumenRoles = USER_ROLES.map((rol) => ({
    rol,
    total: usuarios.filter((usuario) => usuario.rol === rol).length,
  }));

  useEffect(() => {
    let activo = true;

    async function cargarUsuarios() {
      setCargando(true);
      setMensaje(null);

      try {
        const res = await fetch('/api/usuarios', { cache: 'no-store' });
        if (!res.ok) throw new Error(await leerErrorApi(res, 'No se pudieron cargar los usuarios'));
        const data = await res.json();
        if (!activo) return;

        const lista = Array.isArray(data) ? data as UsuarioSistema[] : [];
        setUsuarios(lista);
        setSeleccionadoId((actual) => actual ?? lista[0]?.id ?? null);
        if (lista[0]) setFormEditar((actual) => actual.correo ? actual : usuarioToForm(lista[0]));
      } catch (error) {
        if (activo) {
          setUsuarios([]);
          setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'Error cargando usuarios' });
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarUsuarios();

    return () => {
      activo = false;
    };
  }, []);

  function seleccionarUsuario(usuario: UsuarioSistema) {
    setSeleccionadoId(usuario.id);
    setFormEditar(usuarioToForm(usuario));
    setMensaje(null);
  }

  async function recargarUsuarios(idSeleccionado?: number) {
    const res = await fetch('/api/usuarios', { cache: 'no-store' });
    if (!res.ok) throw new Error(await leerErrorApi(res, 'No se pudieron actualizar los usuarios'));
    const data = await res.json();
    const lista = Array.isArray(data) ? data as UsuarioSistema[] : [];
    const siguiente = idSeleccionado ?? seleccionadoId ?? lista[0]?.id ?? null;
    const usuario = lista.find((item) => item.id === siguiente) ?? lista[0] ?? null;

    setUsuarios(lista);
    setSeleccionadoId(usuario?.id ?? null);
    if (usuario) setFormEditar(usuarioToForm(usuario));
  }

  async function crearUsuario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!puedeGestionar) return;

    setGuardando(true);
    setMensaje(null);

    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCrear),
      });

      if (!res.ok) throw new Error(await leerErrorApi(res, 'No se pudo crear el usuario'));
      const creado = await res.json() as UsuarioSistema;
      setFormCrear(EMPTY_USER_FORM);
      await recargarUsuarios(creado.id);
      setMensaje({ tipo: 'success', texto: 'Usuario creado correctamente.' });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'Error creando usuario' });
    } finally {
      setGuardando(false);
    }
  }

  async function actualizarUsuario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!puedeGestionar || !usuarioSeleccionado) return;

    setGuardando(true);
    setMensaje(null);

    try {
      const res = await fetch(`/api/usuarios/${usuarioSeleccionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formEditar),
      });

      if (!res.ok) throw new Error(await leerErrorApi(res, 'No se pudo actualizar el usuario'));
      const actualizado = await res.json() as UsuarioSistema;
      await recargarUsuarios(actualizado.id);
      if (actualizado.id === currentUserId) onCurrentUserUpdated();
      setMensaje({ tipo: 'success', texto: 'Usuario actualizado correctamente.' });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'Error actualizando usuario' });
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(usuario: UsuarioSistema) {
    if (!puedeGestionar) return;

    setGuardando(true);
    setMensaje(null);

    try {
      const res = await fetch(`/api/usuarios/${usuario.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !usuario.activo }),
      });

      if (!res.ok) throw new Error(await leerErrorApi(res, 'No se pudo cambiar el estado del usuario'));
      const actualizado = await res.json() as UsuarioSistema;
      await recargarUsuarios(actualizado.id);
      setMensaje({ tipo: 'success', texto: actualizado.activo ? 'Usuario activado.' : 'Usuario desactivado.' });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'Error cambiando estado' });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="workspace-panel">
      <SectionTitle title="Usuarios" subtitle="Administracion de cuentas, roles y estado de acceso." />

      {mensaje && <p className={`feedback ${mensaje.tipo}`}>{mensaje.texto}</p>}

      <div className="user-summary-grid">
        {resumenRoles.map((item) => (
          <button
            key={item.rol}
            type="button"
            className={filtroRol === item.rol ? 'user-role-card user-role-card--active' : 'user-role-card'}
            onClick={() => setFiltroRol(item.rol)}
          >
            <strong>{item.total}</strong>
            <span>{item.rol}</span>
          </button>
        ))}
        <button
          type="button"
          className={filtroRol === 'Todos' ? 'user-role-card user-role-card--active' : 'user-role-card'}
          onClick={() => setFiltroRol('Todos')}
        >
          <strong>{usuarios.length}</strong>
          <span>Todos</span>
        </button>
      </div>

      <div className="users-workspace-grid">
        <div className="user-list-panel">
          <div className="user-toolbar">
            <label>
              <span>Buscar usuario</span>
              <input
                value={busqueda}
                placeholder="Nombre, correo o rol"
                onChange={(event) => setBusqueda(event.target.value)}
              />
            </label>
            <small>{cargando ? 'Cargando...' : `${usuariosFiltrados.length} registros`}</small>
          </div>

          <div className="user-list" aria-live="polite">
            {!cargando && usuariosFiltrados.length === 0 && (
              <span className="empty-inline">No hay usuarios para mostrar.</span>
            )}
            {usuariosFiltrados.map((item) => (
              <article
                key={item.id}
                className={usuarioSeleccionado?.id === item.id ? 'user-list-row user-list-row--active' : 'user-list-row'}
              >
                <button type="button" onClick={() => seleccionarUsuario(item)}>
                  <strong>{item.nombre}</strong>
                  <span>{item.correo}</span>
                </button>
                <em>{item.rol}</em>
                <b className={item.activo ? 'status-badge status-badge--active' : 'status-badge status-badge--inactive'}>
                  {item.activo ? 'Activo' : 'Inactivo'}
                </b>
                <button type="button" disabled={!puedeGestionar || guardando} onClick={() => cambiarEstado(item)}>
                  {item.activo ? 'Desactivar' : 'Activar'}
                </button>
              </article>
            ))}
          </div>
        </div>

        <form className="user-form-panel" onSubmit={actualizarUsuario}>
          <SectionTitle title="Gestionar usuario" subtitle="Edita datos, rol y restablece contrasena." />
          {usuarioSeleccionado ? (
            <>
              <div className="user-form-grid">
                <UserInput label="Nombre" value={formEditar.nombre} onChange={(value) => setFormEditar({ ...formEditar, nombre: value })} required />
                <UserInput label="Correo" type="email" value={formEditar.correo} onChange={(value) => setFormEditar({ ...formEditar, correo: value })} required />
                <RoleSelect value={formEditar.rol} onChange={(value) => setFormEditar({ ...formEditar, rol: value })} />
                <UserInput label="Nueva contrasena" type="password" value={formEditar.contrasena} onChange={(value) => setFormEditar({ ...formEditar, contrasena: value })} />
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formEditar.activo}
                  onChange={(event) => setFormEditar({ ...formEditar, activo: event.target.checked })}
                />
                <span>Usuario activo</span>
              </label>
              <button className="primary-button" type="submit" disabled={!puedeGestionar || guardando}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </>
          ) : (
            <p className="empty-inline">Selecciona un usuario para gestionarlo.</p>
          )}
          {!puedeGestionar && <p className="readonly-note">Tu rol permite consultar usuarios, pero solo administracion puede gestionarlos.</p>}
        </form>
      </div>

      {puedeGestionar && (
        <form className="user-form-panel user-form-panel--create" onSubmit={crearUsuario}>
          <SectionTitle title="Crear usuario" subtitle="Alta de cuentas para coordinadores, docentes y portería." />
          <div className="user-form-grid user-form-grid--create">
            <UserInput label="Nombre" value={formCrear.nombre} onChange={(value) => setFormCrear({ ...formCrear, nombre: value })} required />
            <UserInput label="Correo" type="email" value={formCrear.correo} onChange={(value) => setFormCrear({ ...formCrear, correo: value })} required />
            <RoleSelect value={formCrear.rol} onChange={(value) => setFormCrear({ ...formCrear, rol: value })} />
            <UserInput label="Contrasena inicial" type="password" value={formCrear.contrasena} onChange={(value) => setFormCrear({ ...formCrear, contrasena: value })} required />
          </div>
          <button className="secondary-button" type="submit" disabled={guardando}>
            {guardando ? 'Creando...' : 'Crear usuario'}
          </button>
        </form>
      )}
    </section>
  );
}

function UserInput({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="user-field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function RoleSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="user-field">
      <span>Rol</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {USER_ROLES.map((rol) => <option key={rol} value={rol}>{rol}</option>)}
      </select>
    </label>
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
