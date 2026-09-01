'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import StudentsWorkspace from '@/components/students/StudentsWorkspace';
import CommunicationsWorkspace from '@/components/communications/CommunicationsWorkspace';
import SettingsWorkspace from '@/components/settings/SettingsWorkspace';
import AuditWorkspace from '@/components/audit/AuditWorkspace';
import UsersWorkspace from '@/components/users/UsersWorkspace';
import type { Estudiante } from '@/types/students';

export type DashboardUser = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

type DashboardRole = 'coordinador' | 'docente' | 'portero';
type DashboardSection = 'dashboard' | 'usuarios' | 'personas' | 'seguimiento' | 'estadisticas' | 'salidas' | 'comunicaciones' | 'calendario' | 'reportes' | 'convivencia' | 'configuracion' | 'perfil' | 'auditoria';

const DASHBOARD_SECTIONS: DashboardSection[] = ['dashboard', 'usuarios', 'personas', 'seguimiento', 'estadisticas', 'salidas', 'comunicaciones', 'calendario', 'reportes', 'convivencia', 'configuracion', 'perfil', 'auditoria'];

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
    tendenciasMensuales: Array<{ mes: string; reportes: number; salidas: number }>;
  };
  tablas: {
    ultimosReportes: Array<Record<string, unknown>>;
    ultimasSalidas: Array<Record<string, unknown>>;
    proximosEventos: Array<{ id: number; titulo: string; iniciaEn: string }>;
    alertasRecientes: Array<{
      id: number;
      cantidadReportes: number;
      estado: string;
      notas: string | null;
      creadoEn: string;
      estudianteId: number;
      estudiante: string;
      grado: string;
      grupo: string;
    }>;
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
    tendenciasMensuales: [],
  },
  tablas: {
    ultimosReportes: [],
    ultimasSalidas: [],
    proximosEventos: [],
    alertasRecientes: [],
  },
};

const ROLE_LABELS: Record<DashboardRole, string> = {
  coordinador: 'Coordinador',
  docente: 'Docente',
  portero: 'Portero',
};

const NAV_GROUPS: Array<{
  label: string;
  items: Array<{ id: DashboardSection; label: string; roles: DashboardRole[] }>;
}> = [
  { label: 'PRINCIPAL', items: [{ id: 'dashboard', label: 'Dashboard', roles: ['coordinador', 'docente', 'portero'] }] },
  { label: 'OPERATIVO', items: [{ id: 'reportes', label: 'Reportes', roles: ['coordinador', 'docente'] }, { id: 'convivencia', label: 'Convivencia', roles: ['coordinador', 'docente'] }, { id: 'salidas', label: 'Salidas', roles: ['coordinador', 'portero'] }] },
  { label: 'ANALÍTICA', items: [{ id: 'seguimiento', label: 'Seguimiento', roles: ['coordinador', 'docente'] }, { id: 'estadisticas', label: 'Estadísticas', roles: ['coordinador', 'docente'] }] },
  { label: 'INFORMACIÓN', items: [{ id: 'comunicaciones', label: 'Comunicaciones', roles: ['coordinador', 'docente'] }, { id: 'calendario', label: 'Calendario', roles: ['coordinador', 'docente', 'portero'] }] },
  { label: 'GESTIÓN', items: [{ id: 'usuarios', label: 'Usuarios', roles: ['coordinador'] }, { id: 'personas', label: 'Estudiantes', roles: ['coordinador', 'docente'] }, { id: 'configuracion', label: 'Configuración', roles: ['coordinador'] }, { id: 'perfil', label: 'Perfil', roles: ['coordinador', 'docente', 'portero'] }] },
  { label: 'SEGURIDAD', items: [{ id: 'auditoria', label: 'Auditoría', roles: ['coordinador'] }] },
];

function puedeAbrirSeccion(section: DashboardSection, role: DashboardRole) {
  return NAV_GROUPS.some((group) => group.items.some((item) => item.id === section && item.roles.includes(role)));
}

type SidebarIconName = 'dashboard' | 'users' | 'graduation' | 'document' | 'door' | 'message' | 'calendar' | 'chart' | 'settings' | 'profile' | 'logout' | 'chevron' | 'chevronDown' | 'search' | 'sparkles';

const ICON_BY_SECTION: Record<DashboardSection, SidebarIconName> = {
  dashboard: 'dashboard', usuarios: 'users', personas: 'graduation', seguimiento: 'document', estadisticas: 'chart', salidas: 'door', comunicaciones: 'message', calendario: 'calendar', reportes: 'chart', convivencia: 'document', configuracion: 'settings', perfil: 'profile', auditoria: 'document',
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


function texto(valor: unknown) {
  if (valor == null) return '';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  return String(valor);
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
  const [globalSearch, setGlobalSearch] = useState(() => searchParams.get('buscar') || '');
  const role = useMemo(() => normalizeRole(usuario.rol), [usuario.rol]);

  useEffect(() => {
    if (puedeAbrirSeccion(section, role)) return;
    const timer = window.setTimeout(() => {
      setSection('dashboard');
      setGlobalSearch('');
      window.history.replaceState(null, '', window.location.pathname);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [role, section]);

  const cargarDashboard = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/estadisticas', { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo cargar el resumen semanal');
      const data = await response.json();
      setDashboardSnapshot({
        ...EMPTY_STATS,
        ...data,
        metricas: { ...EMPTY_STATS.metricas, ...data.metricas },
        resumenSemanal: { ...EMPTY_STATS.resumenSemanal, ...data.resumenSemanal },
        graficas: { ...EMPTY_STATS.graficas, ...data.graficas },
        tablas: { ...EMPTY_STATS.tablas, ...data.tablas },
      });
      setDashboardError('');
    } catch {
      setDashboardSnapshot(null);
      setDashboardError('No fue posible cargar los datos del dashboard. Verifica la conexión e inténtalo de nuevo.');
    }
  }, []);

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
    params.delete('buscar');
    setGlobalSearch('');
    if (nextSection === 'dashboard') {
      params.delete('seccion');
    } else {
      params.set('seccion', nextSection);
    }
    const query = params.toString();
    window.history.pushState(null, '', query ? `?${query}` : window.location.pathname);
  }

  function buscarGlobal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const termino = globalSearch.trim();
    if (!termino || role === 'portero') return;
    setSection('reportes');
    const params = new URLSearchParams(window.location.search);
    params.delete('dashboard');
    params.set('seccion', 'reportes');
    params.set('buscar', termino);
    window.history.pushState(null, '', `?${params.toString()}`);
  }

  useEffect(() => {
    if (section !== 'dashboard') return;
    const timer = window.setTimeout(() => void cargarDashboard(), 0);
    return () => window.clearTimeout(timer);
  }, [section, cargarDashboard]);

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
          {NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(role)) })).filter((group) => group.items.length > 0).map((group) => (
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
          {role !== 'portero' && <form className="topbar-global-search" role="search" onSubmit={buscarGlobal}>
            <label className="sr-only" htmlFor="global-search">Buscar estudiantes o reportes</label>
            <SidebarIcon name="search" />
            <input id="global-search" type="search" value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Buscar estudiantes, reportes..." />
            <button type="submit" aria-label="Buscar">Buscar</button>
          </form>}
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
            {role !== 'portero' && <WeeklyInsightCard summary={dashboardSnapshot?.resumenSemanal ?? null} activeAlerts={dashboardSnapshot?.metricas.alertasActivas ?? 0} onViewAnalysis={() => seleccionarSeccion('estadisticas')} />}
            <DashboardMetricCards stats={dashboardSnapshot} role={role} />
            {role !== 'portero' && <section className="dashboard-recent-grid" aria-label="Actividad y alertas recientes">
              <RecentActivityCard reports={dashboardSnapshot?.tablas.ultimosReportes ?? []} onViewAll={() => seleccionarSeccion('reportes')} />
              <IntelligentAlertsCard alerts={dashboardSnapshot?.tablas.alertasRecientes ?? []} onViewAll={() => seleccionarSeccion('seguimiento')} />
            </section>}
            {role !== 'portero' && <DashboardAnalytics stats={dashboardSnapshot} onOpenCalendar={() => seleccionarSeccion('calendario')} />}
            {role === 'portero' && <DashboardPorteria stats={dashboardSnapshot} onOpenSalidas={() => seleccionarSeccion('salidas')} onOpenCalendar={() => seleccionarSeccion('calendario')} />}
          </section>
        ) : (<>
          <DashboardContent section={section} usuario={usuario} role={role} onCurrentUserUpdated={() => router.refresh()} />
          <section className="dashboard-empty-canvas" aria-label="Área de trabajo vacía" />
        </>)}
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
  const porcentaje = summary && summary.reportes > 0 && summary.reportesSemanaAnterior > 0
    ? Math.round(Math.abs(diferencia / summary.reportesSemanaAnterior) * 100)
    : null;

  return (
    <article className="weekly-insight-card">
      <span className="weekly-insight-icon"><SidebarIcon name="sparkles" /></span>
      <div className="weekly-insight-content">
        <div className="weekly-insight-heading">
          <h2>Resumen automático generado por SIGDE</h2>
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

function DashboardMetricCards({ stats, role }: { stats: DashboardStats | null; role: DashboardRole }) {
  const weekly = stats?.resumenSemanal;
  const diferenciaReportes = weekly ? weekly.reportes - weekly.reportesSemanaAnterior : 0;
  const porcentajeReportes = weekly && weekly.reportes > 0 && weekly.reportesSemanaAnterior > 0
    ? Math.round((diferenciaReportes / weekly.reportesSemanaAnterior) * 100)
    : null;
  const format = (value: number) => new Intl.NumberFormat('es-CO').format(value);
  const allCards: Array<{
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
  const cards = role === 'portero'
    ? allCards.filter((card) => ['Estudiantes', 'Salidas (semana)', 'Eventos (semana)'].includes(card.label))
    : allCards;

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

function DashboardAnalytics({ stats, onOpenCalendar }: { stats: DashboardStats | null; onOpenCalendar: () => void }) {
  const actividad = stats?.graficas.actividadSemanal ?? EMPTY_STATS.graficas.actividadSemanal;
  const distribucion = [
    ...(stats?.graficas.reportesPorTipo ?? []),
    { tipo: 'SALIDAS', total: stats?.graficas.salidasSemanales ?? 0 },
  ].filter((item) => Number(item.total) > 0);

  return (
    <section className="dashboard-analytics-grid" aria-label="Análisis semanal">
      <div className="dashboard-analytics-main"><WeeklyActivityChart data={actividad} loading={!stats} /></div>
      <div className="dashboard-analytics-side"><DataDistributionChart data={distribucion} loading={!stats} /><UpcomingEventsCard events={stats?.tablas.proximosEventos ?? []} onOpenCalendar={onOpenCalendar} /></div>
    </section>
  );
}

function UpcomingEventsCard({ events, onOpenCalendar }: { events: DashboardStats['tablas']['proximosEventos']; onOpenCalendar: () => void }) {
  return <article className="dashboard-chart-card upcoming-events-card"><header className="dashboard-chart-heading"><div><h2>Agenda</h2><p>Próximos eventos institucionales</p></div><button type="button" className="upcoming-events-calendar" aria-label="Abrir calendario" onClick={onOpenCalendar}><SidebarIcon name="calendar" /></button></header><div className="upcoming-events-list">{events.length ? events.map((event, index) => <div className="upcoming-event" key={event.id}><i className={`upcoming-event-marker upcoming-event-marker--${index % 4}`} /><div><strong>{event.titulo}</strong><time dateTime={event.iniciaEn}>{new Date(event.iniciaEn).toLocaleString('es-CO', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</time></div></div>) : <p className="recent-activity-empty">No hay eventos próximos programados.</p>}</div></article>;
}

function DashboardPorteria({ stats, onOpenSalidas, onOpenCalendar }: { stats: DashboardStats | null; onOpenSalidas: () => void; onOpenCalendar: () => void }) {
  const salidas = stats?.tablas.ultimasSalidas ?? [];
  return <section className="porteria-dashboard-grid" aria-label="Operación de portería">
    <article className="dashboard-chart-card porteria-quick-card"><div><span>Control operativo</span><h2>Registro de salidas</h2><p>Consulta las novedades recientes o registra una nueva salida con los datos de la persona autorizada.</p></div><button type="button" className="module-primary-action" onClick={onOpenSalidas}>Abrir control de salidas</button></article>
    <article className="dashboard-chart-card porteria-recent-exits"><header className="dashboard-panel-heading"><div><h2>Salidas recientes</h2><p>Últimos movimientos registrados</p></div><button type="button" className="dashboard-view-all" onClick={onOpenSalidas}>Ver todo <span aria-hidden="true">›</span></button></header><div>{salidas.length ? salidas.map((salida) => <button type="button" key={texto(salida.id)} onClick={onOpenSalidas}><span>{texto(salida.estudiante).slice(0, 1).toUpperCase()}</span><div><strong>{texto(salida.estudiante)}</strong><small>Grado {texto(salida.grado)} · {texto(salida.acudiente)}</small></div><time dateTime={texto(salida.creadoEn)}>{formatearActividadReciente(texto(salida.creadoEn))}</time></button>) : <p className="recent-activity-empty">Aún no hay salidas registradas.</p>}</div></article>
    <UpcomingEventsCard events={stats?.tablas.proximosEventos ?? []} onOpenCalendar={onOpenCalendar} />
  </section>;
}

function RecentActivityCard({ reports, onViewAll }: { reports: Array<Record<string, unknown>>; onViewAll: () => void }) {
  return <article className="dashboard-chart-card recent-activity-card">
    <header className="dashboard-panel-heading"><div><h2>Actividad reciente</h2><p>Últimos reportes registrados</p></div><button className="dashboard-view-all" type="button" onClick={onViewAll}>Ver todo <span aria-hidden="true">›</span></button></header>
    <div className="recent-report-table">
      <div className="recent-report-table-head" aria-hidden="true"><span>#</span><span>Estudiante</span><span>Tipo de falta</span><span>Hora</span></div>
      <div className="recent-report-table-body">
        {reports.length ? reports.slice(0, 6).map((report, index) => {
          const tipo = texto(report.tipoFalta);
          const fecha = texto(report.fecha);
          return <button type="button" className="recent-report-row" onClick={onViewAll} key={texto(report.id)} aria-label={`Consultar reporte de ${texto(report.estudiante)}`}>
            <span className="recent-report-number">{String(index + 1).padStart(2, '0')}</span>
            <span className="recent-report-student"><strong>{texto(report.estudiante)}</strong><small>Grado {texto(report.grado)}° · {texto(report.docente)}</small></span>
            <span className={`recent-report-type recent-report-type--${tipo.toLowerCase()}`}>{tipoReporte(tipo)}</span>
            <time dateTime={fecha}>{formatearHora(fecha)}</time>
          </button>;
        }) : <p className="recent-activity-empty">Aún no hay reportes para mostrar.</p>}
      </div>
    </div>
  </article>;
}

function IntelligentAlertsCard({ alerts, onViewAll }: { alerts: DashboardStats['tablas']['alertasRecientes']; onViewAll: () => void }) {
  return <article className="dashboard-chart-card intelligent-alerts-card">
    <header className="dashboard-panel-heading intelligent-alerts-heading">
      <div><h2>Alertas por reglas</h2><p>Reincidencias detectadas por umbrales</p></div>
      <div className="intelligent-alerts-actions"><span><i /> En vivo</span><button className="dashboard-view-all" type="button" onClick={onViewAll}>Ver todo <b aria-hidden="true">›</b></button></div>
    </header>
    <div className="intelligent-alerts-list">
      {alerts.length ? alerts.map((alert) => {
        const priority = alert.cantidadReportes >= 5 ? 'high' : alert.estado === 'en_seguimiento' ? 'tracking' : 'active';
        const title = priority === 'high' ? 'Reincidencia prioritaria' : priority === 'tracking' ? 'Patrón en seguimiento' : 'Reincidencia detectada';
        return <button type="button" className="intelligent-alert-row" onClick={onViewAll} key={alert.id}>
          <span className={`intelligent-alert-icon intelligent-alert-icon--${priority}`}><SidebarIcon name="sparkles" /></span>
          <span className="intelligent-alert-copy"><strong>{title}</strong><small>{alert.estudiante} · {alert.cantidadReportes} reportes. {alert.notas || `Grado ${alert.grado}-${alert.grupo}.`}</small></span>
          <span className="intelligent-alert-meta"><time dateTime={alert.creadoEn}>{formatearActividadReciente(alert.creadoEn)}</time><i /></span>
        </button>;
      }) : <p className="recent-activity-empty">No hay alertas activas en este momento.</p>}
    </div>
  </article>;
}

function tipoReporte(value: string) {
  if (value === 'TIPO_I') return 'Tipo 1';
  if (value === 'TIPO_II') return 'Tipo 2';
  if (value === 'TIPO_III') return 'Tipo 3';
  return value || 'Sin tipo';
}

function formatearHora(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' });
}

function formatearActividadReciente(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Reciente';
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `Hace ${hours} h` : date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
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
}: {
  section: DashboardSection;
  usuario: DashboardUser;
  onCurrentUserUpdated: () => void;
  role: DashboardRole;
}) {
  if (section === 'personas') {
    return <StudentsWorkspace canManage={role === 'coordinador'} />;
  }

  if (section === 'salidas') {
    return <ControlSalidasWorkspace role={role} />;
  }

  if (section === 'comunicaciones') {
    return <CommunicationsWorkspace />;
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

  if (section === 'usuarios') {
    return <UsersWorkspace currentUserId={usuario.id} onCurrentUserUpdated={onCurrentUserUpdated} />;
  }

  if (section === 'configuracion') {
    return <SettingsWorkspace />;
  }

  if (section === 'auditoria') {
    return <AuditWorkspace />;
  }

  return null;
}

type SalidaRegistrada = { id: string; estudiante: string; grado: string; grupo: string; jornada: string; acudiente: string; recogeNombre: string; recogeApellido: string; recogeCedula: string; recogeParentesco: string; estado: string; creadoEn: string; registradoPorNombre: string };

function ControlSalidasWorkspace({ role }: { role: DashboardRole }) {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [salidas, setSalidas] = useState<SalidaRegistrada[]>([]);
  const [estudianteId, setEstudianteId] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [recoge, setRecoge] = useState({ nombre: '', apellido: '', cedula: '', parentesco: '', correo: '' });
  const seleccionado = estudiantes.find((item) => item.id === Number(estudianteId));
  const salidasVisibles = salidas.filter((salida) => [salida.estudiante, salida.grado, salida.grupo, salida.acudiente, salida.recogeNombre, salida.recogeApellido, salida.recogeCedula].join(' ').toLocaleLowerCase('es').includes(busqueda.trim().toLocaleLowerCase('es')));

  const cargar = useCallback(async () => {
    const [estudiantesRespuesta, salidasRespuesta] = await Promise.all([fetch('/api/estudiantes'), fetch('/api/salidas')]);
    if (estudiantesRespuesta.ok) setEstudiantes(await estudiantesRespuesta.json() as Estudiante[]);
    if (salidasRespuesta.ok) setSalidas(await salidasRespuesta.json() as SalidaRegistrada[]);
  }, []);

  useEffect(() => { void Promise.resolve().then(cargar); }, [cargar]);

  async function registrarSalida(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setGuardando(true); setMensaje(null);
    try {
      const response = await fetch('/api/salidas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estudianteId, recogeNombre: recoge.nombre, recogeApellido: recoge.apellido, recogeCedula: recoge.cedula, recogeParentesco: recoge.parentesco, recogeCorreo: recoge.correo }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'No se pudo registrar la salida.');
      setMensaje({ tipo: 'success', texto: data?.correoEnviado ? 'Salida registrada y correo de aviso enviado.' : 'Salida registrada. El correo no se envió porque no hay configuración disponible.' });
      setRecoge({ nombre: '', apellido: '', cedula: '', parentesco: '', correo: '' }); setEstudianteId(''); setMostrarFormulario(false); await cargar();
    } catch (error) { setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo registrar la salida.' }); }
    finally { setGuardando(false); }
  }

  return <section className="workspace-panel exit-control-workspace">
    <div className="exit-page-heading"><div><h2>Salidas</h2><p>{role === 'portero' ? 'Consulta y registra las salidas del turno de hoy.' : 'Consulta el historial institucional y registra nuevas salidas.'}</p></div><button className="exit-register-trigger" type="button" onClick={() => { setMensaje(null); setMostrarFormulario(true); }}>↗ Registrar salida</button></div>
    {mensaje && <p className={`feedback ${mensaje.tipo}`}>{mensaje.texto}</p>}
    <div className="exit-history"><div><div><h3>{role === 'portero' ? 'Salidas de hoy' : 'Historial de salidas'}</h3><p>{salidas.length ? `${salidasVisibles.length} de ${salidas.length} registros` : 'Aún no hay registros'}</p></div><label className="exit-history-search"><span className="sr-only">Buscar salida</span><input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar estudiante, acudiente o documento" /></label></div><div className="exit-table-wrap"><table><thead><tr><th>Estudiante</th><th>Grado</th><th>Jornada</th><th>Acudiente</th><th>Persona que recoge</th><th>Estado</th><th>Fecha y hora</th></tr></thead><tbody>{salidasVisibles.length ? salidasVisibles.map((salida) => <tr key={salida.id}><td><strong>{salida.estudiante}</strong></td><td>{salida.grado} · {salida.grupo}</td><td>{salida.jornada === 'Sin registrar' ? 'Sin registrar' : salida.jornada}</td><td>{salida.acudiente}</td><td><strong>{salida.recogeNombre && salida.recogeApellido ? `${salida.recogeNombre} ${salida.recogeApellido}` : 'Sin registrar'}</strong><small>{salida.recogeParentesco && salida.recogeCedula ? `${salida.recogeParentesco} · ${salida.recogeCedula}` : 'Dato no disponible'}</small></td><td><span className="exit-status">{salida.estado}</span></td><td><strong>{new Date(salida.creadoEn).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</strong><small>Registró: {salida.registradoPorNombre}</small></td></tr>) : <tr><td colSpan={7}>{salidas.length ? 'No hay salidas que coincidan con la búsqueda.' : 'Aún no hay salidas registradas.'}</td></tr>}</tbody></table></div></div>
    {mostrarFormulario && <div className="exit-modal-backdrop" role="presentation" onMouseDown={() => setMostrarFormulario(false)}><form className="exit-modal" role="dialog" aria-modal="true" aria-labelledby="exit-modal-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={registrarSalida}><header><div><span aria-hidden="true">↗</span><h3 id="exit-modal-title">Registrar salida</h3></div><button type="button" aria-label="Cerrar" onClick={() => setMostrarFormulario(false)}>×</button></header><div className="exit-modal-body"><label className="exit-student-select"><span>Estudiante</span><select value={estudianteId} onChange={(event) => setEstudianteId(event.target.value)} required><option value="">Selecciona un estudiante...</option>{estudiantes.map((item) => <option key={item.id} value={item.id}>{item.nombre} · {item.grado} {item.grupo}</option>)}</select></label>{seleccionado && <div className="exit-student-summary"><strong>{seleccionado.nombre}</strong><span>{seleccionado.grado} · Grupo {seleccionado.grupo} · Jornada {seleccionado.jornada}</span><small>Acudiente: {seleccionado.acudiente.nombre}</small></div>}<div className="exit-modal-fields"><UserInput label="Nombre" value={recoge.nombre} onChange={(nombre) => setRecoge({ ...recoge, nombre })} required /><UserInput label="Apellido" value={recoge.apellido} onChange={(apellido) => setRecoge({ ...recoge, apellido })} required /><UserInput label="Cédula" value={recoge.cedula} onChange={(cedula) => setRecoge({ ...recoge, cedula })} required /><UserInput label="Parentesco" value={recoge.parentesco} onChange={(parentesco) => setRecoge({ ...recoge, parentesco })} required /><UserInput label="Correo electrónico" value={recoge.correo} onChange={(correo) => setRecoge({ ...recoge, correo })} type="email" required /></div><p className="exit-notice">Al guardar, se enviará un aviso al acudiente registrado y a la persona que recoge al estudiante.</p></div><footer><button type="button" className="exit-modal-cancel" onClick={() => setMostrarFormulario(false)}>Cancelar</button><button className="exit-modal-submit" type="submit" disabled={guardando}>{guardando ? 'Registrando...' : 'Registrar salida'}</button></footer></form></div>}
  </section>;
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

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="module-title">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}
