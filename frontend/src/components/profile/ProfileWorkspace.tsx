import ModuleHeader from '@/components/ui/ModuleHeader';
import KpiGrid from '@/components/ui/KpiGrid';

type ProfileUser = { id: number; nombre: string; correo: string; rol: string };

function nombreRol(rol: string) {
  if (rol === 'Admin') return 'Administrador';
  if (rol === 'Porteria') return 'Portería';
  return rol;
}

export default function ProfileWorkspace({ usuario }: { usuario: ProfileUser }) {
  const rol = nombreRol(usuario.rol);
  const inicial = usuario.nombre.trim().slice(0, 1).toUpperCase() || 'U';

  return <section className="profile-workspace ui-workspace" aria-label="Perfil de usuario">
    <ModuleHeader
      icon={<span className="profile-header-initial">{inicial}</span>}
      kicker="Mi perfil"
      title={usuario.nombre}
      description={usuario.correo}
      action={<div className="profile-header-meta"><span className="profile-role-badge">{rol}</span><span className="profile-status"><i aria-hidden="true" /> Cuenta activa</span></div>}
    />

    <KpiGrid
      label="Resumen de la cuenta"
      items={[
        { label: 'Identificador', value: `#${usuario.id}`, detail: 'Código único de la cuenta' },
        { label: 'Rol asignado', value: rol, detail: 'Nivel de acceso institucional' },
        { label: 'Estado', value: 'Activa', detail: 'Cuenta habilitada para ingresar' },
      ]}
    />

    <section className="profile-account-card" aria-labelledby="profile-information-title">
      <header className="settings-card-heading">
        <span>01</span>
        <div>
          <small>Información de cuenta</small>
          <h3 id="profile-information-title">Datos institucionales</h3>
          <p>Estos datos identifican tus registros y acciones dentro de SIGDE.</p>
        </div>
        <em>Solo lectura</em>
      </header>

      <dl className="profile-readonly-fields">
        <div><dt>Nombre completo</dt><dd>{usuario.nombre}</dd></div>
        <div><dt>Correo institucional</dt><dd>{usuario.correo}</dd></div>
        <div><dt>Rol asignado</dt><dd>{rol}</dd></div>
        <div><dt>Estado de la cuenta</dt><dd><span className="profile-inline-status"><i aria-hidden="true" /> Activa</span></dd></div>
      </dl>

      <aside className="profile-account-help">
        <span aria-hidden="true">i</span>
        <div><strong>¿Necesitas corregir un dato?</strong><p>Solicita la actualización a un administrador autorizado. Desde este perfil la información institucional no puede modificarse.</p></div>
      </aside>
    </section>
  </section>;
}
