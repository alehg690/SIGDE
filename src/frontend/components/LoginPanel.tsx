export default function LoginPanel() {
  const stats = [
    { num: '100%', label: 'Digital' },
    { num: '24/7', label: 'Acceso' },
    { num: 'IA', label: 'Integrada' },
  ];

  return (
    <div style={{ flex: 1, background: '#0a1628', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 56, padding: '48px 72px' }}>

      <div style={{ textAlign: 'center' }}>
        <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 80, fontWeight: 700, letterSpacing: '0.12em', color: '#e8f4fd' }}>
          SI<span style={{ color: '#63b3ed' }}>G</span>DE
        </span>
        <p style={{ color: 'rgba(200,220,240,0.35)', fontSize: 12, letterSpacing: '0.25em', textTransform: 'uppercase', margin: '8px 0 0' }}>
          Sistema de Gestión Digital Escolar
        </p>
      </div>

      <p style={{ color: 'rgba(200,220,240,0.5)', fontSize: 16, lineHeight: 1.7, maxWidth: 380, margin: 0, textAlign: 'center' }}>
        Registro, seguimiento y análisis de convivencia en tiempo real.
      </p>

      <div style={{ display: 'flex', gap: 56 }}>
        {stats.map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <p style={{ color: '#63b3ed', fontSize: 28, fontWeight: 600, margin: '0 0 4px' }}>{s.num}</p>
            <p style={{ color: 'rgba(200,220,240,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}