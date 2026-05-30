export default function LoginPanel() {
  const stats = [
    { num: '100%', label: 'Digital' },
    { num: '24/7', label: 'Acceso' },
    { num: 'IA', label: 'Integrada' },
  ];

  return (
    <aside className="login-panel-left login-panel-desktop" aria-label="Presentación de SIGDE">
      <div className="brand-block">
        <span className="brand-title">
          SI<span>G</span>DE
        </span>
        <p>Sistema de Gestión Digital Escolar</p>
      </div>

      <p className="brand-copy">
        Registro, seguimiento y análisis de convivencia en tiempo real.
      </p>

      <div className="brand-stats" aria-label="Características principales">
        {stats.map((stat) => (
          <div key={stat.label}>
            <strong>{stat.num}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
