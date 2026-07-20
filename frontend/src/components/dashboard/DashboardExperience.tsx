'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

export type DashboardUser = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

type DashboardRole = 'administrador' | 'coordinador' | 'docente' | 'portero';
type DashboardSection = 'inicio' | 'personas' | 'seguimiento' | 'reportes' | 'perfil';

const ROLE_LABELS: Record<DashboardRole, string> = {
  administrador: 'Administrador',
  coordinador: 'Coordinador',
  docente: 'Docente',
  portero: 'Portero',
};

const ROLE_CONFIG: Record<DashboardRole, {
  headline: string;
  summary: string;
  metrics: Array<{ label: string; value: string }>;
  actions: string[];
}> = {
  administrador: {
    headline: 'Vista general institucional',
    summary: 'Control de usuarios, módulos, reportes y configuración del sistema.',
    metrics: [
      { label: 'Usuarios activos', value: '4' },
      { label: 'Roles configurados', value: '4' },
      { label: 'Módulos', value: '5' },
    ],
    actions: ['Crear usuario', 'Asignar roles', 'Auditar actividad'],
  },
  coordinador: {
    headline: 'Seguimiento de convivencia',
    summary: 'Priorización de casos, alertas académicas y acompañamiento escolar.',
    metrics: [
      { label: 'Casos abiertos', value: '0' },
      { label: 'Alertas nuevas', value: '0' },
      { label: 'Reportes del mes', value: '0' },
    ],
    actions: ['Revisar casos', 'Generar reporte', 'Programar seguimiento'],
  },
  docente: {
    headline: 'Registro docente',
    summary: 'Acceso rápido para registrar novedades y consultar estudiantes asignados.',
    metrics: [
      { label: 'Cursos asignados', value: '0' },
      { label: 'Novedades', value: '0' },
      { label: 'Pendientes', value: '0' },
    ],
    actions: ['Registrar novedad', 'Consultar estudiante', 'Ver historial'],
  },
  portero: {
    headline: 'Control de ingreso',
    summary: 'Herramientas para registrar entradas, salidas y novedades de portería.',
    metrics: [
      { label: 'Ingresos hoy', value: '0' },
      { label: 'Salidas hoy', value: '0' },
      { label: 'Visitantes', value: '0' },
    ],
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

export default function DashboardExperience({ usuario }: { usuario: DashboardUser }) {
  const router = useRouter();
  const [section, setSection] = useState<DashboardSection>('inicio');
  const [closing, setClosing] = useState(false);
  const role = useMemo(() => normalizeRole(usuario.rol), [usuario.rol]);
  const config = ROLE_CONFIG[role];

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

        <DashboardContent section={section} usuario={usuario} role={role} config={config} />
      </section>
    </main>
  );
}

function DashboardContent({
  section,
  usuario,
  role,
  config,
}: {
  section: DashboardSection;
  usuario: DashboardUser;
  role: DashboardRole;
  config: typeof ROLE_CONFIG[DashboardRole];
}) {
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
        <SectionTitle title="Personas" subtitle="Acceso según el rol a usuarios, estudiantes o visitantes." />
        <div className="table-preview">
          {role === 'administrador' && <Row title="Usuarios del sistema" text="Crear, editar y activar cuentas." />}
          {role === 'coordinador' && <Row title="Estudiantes en seguimiento" text="Consultar casos activos por curso." />}
          {role === 'docente' && <Row title="Mis estudiantes" text="Vista de grupo asignado y novedades." />}
          {role === 'portero' && <Row title="Visitantes" text="Registro rápido de ingreso y salida." />}
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
      </section>
    );
  }

  if (section === 'reportes') {
    return (
      <section className="workspace-panel">
        <SectionTitle title="Reportes" subtitle="Indicadores listos para conectar con datos reales." />
        <div className="metric-grid">
          {config.metrics.map((metric) => <Metric key={metric.label} {...metric} />)}
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-panel">
      <SectionTitle title="Inicio" subtitle="Resumen de trabajo y accesos rápidos." />
      <div className="metric-grid">
        {config.metrics.map((metric) => <Metric key={metric.label} {...metric} />)}
      </div>
      <div className="activity-list">
        <span>Sesión iniciada como {ROLE_LABELS[role]}.</span>
        <span>Dashboard preparado para personalizar permisos y módulos por rol.</span>
      </div>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini-metric">
      <strong>{value}</strong>
      <span>{label}</span>
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
