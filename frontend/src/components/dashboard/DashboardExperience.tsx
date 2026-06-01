'use client';

import { useMemo, useState } from 'react';
import {
  exitRules,
  getResponsibleArea,
  getRequiredNotification,
  manualProcessSteps,
  manualSituationRules,
  shouldRegisterInSiuce,
} from '@/services/manualConvivencia.rules';
import type { Rol, Usuario } from '@/types/auth';

type MenuItem = {
  id: string;
  label: string;
  icon: string;
  roles: Rol[];
  badge?: string;
};

type Metric = {
  label: string;
  value: string;
  helper: string;
  tone: 'blue' | 'green' | 'yellow' | 'red';
};

type CaseItem = {
  estudiante: string;
  grado: string;
  evento: string;
  tipo: 'Tipo 1' | 'Tipo 2' | 'Tipo 3';
  etapa: string;
  roles: Rol[];
};

type ExitRequest = {
  estudiante: string;
  motivo: string;
  estado: string;
  firmas: Array<'ok' | 'pending' | 'urgent'>;
};

const roleLabels: Record<Rol, string> = {
  Admin: 'Administrador',
  Coordinador: 'Coordinador',
  Docente: 'Docente',
  Porteria: 'Portería',
};

const menuItems: MenuItem[] = [
  { id: 'inicio', label: 'Centro de control', icon: '⌂', roles: ['Admin', 'Coordinador', 'Docente', 'Porteria'] },
  { id: 'observador', label: 'Observador digital', icon: '▣', roles: ['Admin', 'Coordinador', 'Docente'] },
  { id: 'coordinacion', label: 'Coordinación', icon: '◇', roles: ['Admin', 'Coordinador'] },
  { id: 'familias', label: 'Acudientes', icon: '●', roles: ['Admin', 'Coordinador'] },
  { id: 'ia', label: 'IA convivencia', icon: '✦', roles: ['Admin', 'Coordinador'] },
  { id: 'salidas', label: 'Salidas', icon: '⇥', roles: ['Admin', 'Coordinador', 'Porteria'], badge: '4' },
  { id: 'historial', label: 'Historial estudiante', icon: '◉', roles: ['Admin', 'Coordinador', 'Docente'] },
  { id: 'reportes', label: 'Informes', icon: '▥', roles: ['Admin', 'Coordinador'] },
  { id: 'usuarios', label: 'Usuarios y permisos', icon: '⚙', roles: ['Admin'] },
];

const allCases: CaseItem[] = [
  {
    estudiante: 'Carlos Suárez',
    grado: '9B',
    evento: 'Agresión verbal y empujón durante cambio de clase',
    tipo: 'Tipo 2',
    etapa: 'Coordinación revisando',
    roles: ['Admin', 'Coordinador', 'Docente'],
  },
  {
    estudiante: 'Andrés Martínez',
    grado: '8A',
    evento: 'Cinco reportes por agresión en distintas asignaturas',
    tipo: 'Tipo 2',
    etapa: 'Ruta sugerida por IA',
    roles: ['Admin', 'Coordinador'],
  },
  {
    estudiante: 'Valentina López',
    grado: '7C',
    evento: 'Firma de observador por uso reiterado del celular',
    tipo: 'Tipo 1',
    etapa: 'Observador firmado',
    roles: ['Admin', 'Coordinador', 'Docente'],
  },
  {
    estudiante: 'Miguel Herrera',
    grado: '10A',
    evento: 'Somnolencia frecuente en clase y bajo seguimiento académico',
    tipo: 'Tipo 1',
    etapa: 'Seguimiento docente',
    roles: ['Admin', 'Coordinador', 'Docente'],
  },
];

const exitRequests: ExitRequest[] = [
  {
    estudiante: 'Juan Salcedo',
    motivo: 'Urgencia médica con acudiente presente',
    estado: 'Salida urgente aprobada',
    firmas: ['ok', 'urgent', 'ok', 'ok'],
  },
  {
    estudiante: 'Andrea Morales',
    motivo: 'Cita médica programada',
    estado: 'Falta coordinación',
    firmas: ['ok', 'ok', 'pending', 'ok'],
  },
  {
    estudiante: 'Roberto Castro',
    motivo: 'Retiro anticipado solicitado por acudiente',
    estado: 'Esperando acudiente',
    firmas: ['ok', 'ok', 'ok', 'pending'],
  },
];

function getRoleCopy(rol: Rol) {
  if (rol === 'Admin') {
    return {
      eyebrow: 'Control institucional completo',
      title: 'Estado general de convivencia, notificaciones y salidas',
      body: 'Supervisa el proceso desde el reporte docente hasta la notificación familiar, la intervención de coordinación y la auditoría institucional.',
      cta: 'Configurar manual de convivencia',
    };
  }

  if (rol === 'Coordinador') {
    return {
      eyebrow: 'Gestión de convivencia',
      title: 'Casos activos, rutas sugeridas y seguimiento a familias',
      body: 'Prioriza reportes, activa rutas, registra observaciones y verifica que el acudiente quede informado cuando se firma observador.',
      cta: 'Revisar casos pendientes',
    };
  }

  if (rol === 'Porteria') {
    return {
      eyebrow: 'Control de salida institucional',
      title: 'Salidas autorizadas, urgencias y trazabilidad de firmas',
      body: 'Registra retiros con acudiente, deja evidencia digital y notifica a coordinación, docente de clase y director de grupo.',
      cta: 'Registrar salida urgente',
    };
  }

  return {
    eyebrow: 'Aula y observador digital',
    title: 'Registra conductas y consulta antecedentes antes de reportar',
    body: 'Crea reportes tipo 1, 2 o 3, revisa el historial permitido del estudiante y deja evidencia para coordinación y acudientes.',
    cta: 'Crear observador',
  };
}

function getMetrics(rol: Rol): Metric[] {
  if (rol === 'Porteria') {
    return [
      { label: 'Salidas hoy', value: '7', helper: '4 completas · 3 en proceso', tone: 'blue' },
      { label: 'Urgencias atendidas', value: '2', helper: 'Notificación inmediata enviada', tone: 'red' },
      { label: 'Firmas validadas', value: '84%', helper: 'Director, clase, coordinación, acudiente', tone: 'green' },
      { label: 'Espera promedio', value: '6m', helper: 'Antes era manual y lento', tone: 'yellow' },
    ];
  }

  if (rol === 'Docente') {
    return [
      { label: 'Mis observadores', value: '6', helper: '2 editables dentro de 24h', tone: 'blue' },
      { label: 'Acudientes notificados', value: '4', helper: 'Al firmar observador', tone: 'green' },
      { label: 'Estudiantes en seguimiento', value: '12', helper: 'Historial visible por grupo', tone: 'yellow' },
      { label: 'Pendientes coordinación', value: '1', helper: 'Caso tipo 2 escalado', tone: 'red' },
    ];
  }

  if (rol === 'Coordinador') {
    return [
      { label: 'Reportes por revisar', value: '18', helper: 'Tipo 2 y 3 priorizados', tone: 'blue' },
      { label: 'Familias notificadas', value: '38', helper: '91% con lectura confirmada', tone: 'green' },
      { label: 'Alertas IA abiertas', value: '9', helper: 'Reincidencia y patrones', tone: 'red' },
      { label: 'Salidas pendientes', value: '3', helper: 'Requieren firma o soporte', tone: 'yellow' },
    ];
  }

  return [
    { label: 'Observadores firmados', value: '47', helper: 'Este mes en toda la institución', tone: 'blue' },
    { label: 'Acudientes notificados', value: '38', helper: '95% entregadas correctamente', tone: 'green' },
    { label: 'Casos en coordinación', value: '12', helper: '5 requieren ruta activa', tone: 'yellow' },
    { label: 'Alertas IA críticas', value: '5', helper: 'Riesgo por reincidencia', tone: 'red' },
  ];
}

function getVisibleCases(rol: Rol) {
  if (rol === 'Porteria') return [];
  return allCases.filter((item) => item.roles.includes(rol));
}

export default function DashboardExperience({ usuario }: { usuario: Usuario }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const roleCopy = useMemo(() => getRoleCopy(usuario.rol), [usuario.rol]);
  const metrics = useMemo(() => getMetrics(usuario.rol), [usuario.rol]);
  const visibleMenu = menuItems.filter((item) => item.roles.includes(usuario.rol));
  const visibleCases = getVisibleCases(usuario.rol);
  const canSeeIa = usuario.rol === 'Admin' || usuario.rol === 'Coordinador';
  const canSeeExitControl = usuario.rol === 'Admin' || usuario.rol === 'Coordinador' || usuario.rol === 'Porteria';

  async function cerrarSesion() {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'logout' }),
    });
    window.location.href = '/';
  }

  return (
    <main className="school-shell">
      <aside className={`school-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="school-brand">
          <span>SD</span>
          <div>
            <strong>SIGDE</strong>
            <small>Sistema de gestión digital escolar</small>
          </div>
        </div>

        <nav className="school-nav" aria-label="Módulos SIGDE">
          <small>Proceso escolar</small>
          {visibleMenu.map((item) => (
            <button className={item.id === 'inicio' ? 'active' : ''} key={item.id} type="button">
              <span>{item.icon}</span>
              <b>{item.label}</b>
              {item.badge && <em>{item.badge}</em>}
            </button>
          ))}
        </nav>

        <div className="school-user">
          <span>{getInitials(usuario.nombre)}</span>
          <div>
            <strong>{usuario.nombre}</strong>
            <small>{roleLabels[usuario.rol]}</small>
          </div>
          <button type="button" onClick={cerrarSesion} aria-label="Cerrar sesión">
            ×
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button className="school-backdrop" type="button" aria-label="Cerrar menú" onClick={() => setSidebarOpen(false)} />
      )}

      <section className="school-main">
        <header className="school-topbar">
          <button className="school-menu-button" type="button" onClick={() => setSidebarOpen(true)}>
            ☰
          </button>
          <div>
            <span>{roleCopy.eyebrow}</span>
            <h1>Centro de convivencia escolar</h1>
          </div>
          <label className="school-search">
            <span>⌕</span>
            <input placeholder="Buscar estudiante, grado o acudiente..." />
          </label>
        </header>

        <section className="school-hero">
          <div className="hero-copy">
            <span>{roleLabels[usuario.rol]}</span>
            <h2>{roleCopy.title}</h2>
            <p>{roleCopy.body}</p>
            <div className="hero-actions">
              <button type="button">{roleCopy.cta}</button>
              <button type="button">Ver historial</button>
            </div>
          </div>

          <div className="process-card" aria-label="Flujo del proceso disciplinario">
            {manualProcessSteps.slice(0, 4).map((step) => (
              <div className="process-step" key={step.nombre}>
                <span>{step.paso}</span>
                <strong>{step.nombre}</strong>
                <small>{step.documento}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="school-metrics" aria-label="Indicadores principales">
          {metrics.map((metric) => (
            <article className={`school-metric ${metric.tone}`} key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <p>{metric.helper}</p>
            </article>
          ))}
        </section>

        <section className="school-grid">
          {usuario.rol !== 'Porteria' && (
            <article className="school-panel cases-panel">
              <PanelHeader
                title={usuario.rol === 'Docente' ? 'Mis casos y observadores' : 'Casos activos de convivencia'}
                subtitle={
                  usuario.rol === 'Docente'
                    ? 'Reportes propios e historial permitido por grupo'
                    : 'Seguimiento desde aula, coordinación y familia'
                }
                action={`${visibleCases.length} abiertos`}
              />
              <div className="case-list">
                {visibleCases.map((item) => (
                  <div className="case-row" key={`${item.estudiante}-${item.evento}`}>
                    <div>
                      <strong>{item.estudiante}</strong>
                      <small>Grado {item.grado}</small>
                    </div>
                    <p>{item.evento}</p>
                    <span className={item.tipo.replace(' ', '').toLowerCase()}>{item.tipo}</span>
                    <em>{item.etapa}</em>
                    <b>{getRequiredNotification(item.tipo)}</b>
                  </div>
                ))}
              </div>
            </article>
          )}

          {canSeeIa && (
            <article className="school-panel ia-panel">
              <PanelHeader title="Análisis predictivo IA" subtitle="Patrones de convivencia detectados" action="En vivo" />
              <div className="ia-card">
                <span>Riesgo alto</span>
                <h3>Conducta agresiva recurrente</h3>
                <p>
                  Andrés Martínez registra reportes de agresión en cinco clases distintas. Según el manual, el sistema
                  sugiere escalar a {getResponsibleArea('Tipo 2')} y dejar soporte PR-01 con notificación al acudiente.
                </p>
              </div>
              <div className="ia-signals">
                <span>5 reportes similares</span>
                <span>4 docentes involucrados</span>
                <span>3 meses de recurrencia</span>
              </div>
            </article>
          )}

          {usuario.rol === 'Docente' && (
            <article className="school-panel teacher-panel">
              <PanelHeader title="Acciones del docente" subtitle="Rápidas, claras y con trazabilidad" action="Aula" />
              <button type="button">Crear observador tipo 1, 2 o 3</button>
              <button type="button">Consultar historial antes de reportar</button>
              <button type="button">Adjuntar evidencia y firma digital</button>
              <p>El docente solo ve estudiantes/reportes permitidos para su rol.</p>
            </article>
          )}

          {canSeeExitControl && (
            <article className={`school-panel exits-panel ${usuario.rol === 'Porteria' ? 'wide' : ''}`}>
              <PanelHeader
                title="Revisión de salidas"
                subtitle={exitRules.firmasRequeridas.join(' · ')}
                action="Urgencias"
              />
              <div className="exit-list">
                {exitRequests.map((request) => (
                  <div className="exit-case" key={request.estudiante}>
                    <div>
                      <strong>{request.estudiante}</strong>
                      <small>{request.motivo}</small>
                    </div>
                    <div className="signature-strip" aria-label="Estado de firmas">
                      {request.firmas.map((firma, index) => (
                        <span className={firma} key={`${request.estudiante}-${index}`}>
                          {index + 1}
                        </span>
                      ))}
                    </div>
                    <b>{request.estado}</b>
                  </div>
                ))}
              </div>
            </article>
          )}

          <article className="school-panel notification-panel">
            <PanelHeader title="Notificación familiar" subtitle="El acudiente se entera aunque no haya citación" action="95%" />
            <div className="notification-flow">
              {manualSituationRules.map((rule) => (
                <div key={rule.tipo}>
                  <strong>{rule.nombre}</strong>
                  <small>
                    {rule.accion} {shouldRegisterInSiuce(rule.tipo) ? 'Requiere SIUCE.' : 'No requiere SIUCE inicial.'}
                  </small>
                </div>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

function PanelHeader({ title, subtitle, action }: { title: string; subtitle: string; action: string }) {
  return (
    <header className="panel-header">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <span>{action}</span>
    </header>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
