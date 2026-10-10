type ProfileUser = { nombre: string; correo: string; rol: string };

export default function ProfileWorkspace({ usuario }: { usuario: ProfileUser }) {
  const rol = usuario.rol === 'Porteria' ? 'Portería' : usuario.rol;
  const mostrarAvisoCuenta = !['Admin', 'Coordinador'].includes(usuario.rol);

  return <section className="workspace-panel settings-workspace profile-workspace">
    <header className="module-page-heading">
      <div className="module-title">
        <h2>Mi perfil</h2>
        <p>Consulta los datos asociados a tu cuenta institucional.</p>
      </div>
      <span className="profile-status"><i aria-hidden="true" /> Cuenta activa</span>
    </header>

    <div className="profile-summary" aria-label="Resumen de la cuenta">
      <span className="profile-summary-avatar" aria-hidden="true">{usuario.nombre.slice(0, 1).toUpperCase()}</span>
      <div><strong>{usuario.nombre}</strong><span>{usuario.correo}</span></div>
      <span className="profile-role-badge">{rol}</span>
    </div>

    <section className="settings-form profile-section-form" aria-labelledby="profile-information-title">
      <div className="settings-card">
        <div className="settings-card-heading">
          <span>01</span>
          <div>
            <h3 id="profile-information-title">Información de la cuenta</h3>
            <p>Estos datos identifican tus registros y acciones dentro de SIGDE.</p>
          </div>
        </div>
        <div className="profile-card-content">
          <dl className="profile-list">
            <div><dt>Nombre completo</dt><dd>{usuario.nombre}</dd></div>
            <div><dt>Correo institucional</dt><dd>{usuario.correo}</dd></div>
            <div><dt>Rol asignado</dt><dd>{rol}</dd></div>
            <div><dt>Estado</dt><dd>Activa</dd></div>
          </dl>
          {mostrarAvisoCuenta && <p className="profile-help">El correo y el rol solo pueden ser modificados desde una cuenta autorizada.</p>}
        </div>
      </div>
    </section>
  </section>;
}
