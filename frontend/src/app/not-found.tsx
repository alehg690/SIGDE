import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="not-found-page">
      <span className="not-found-orb not-found-orb--one" />
      <span className="not-found-orb not-found-orb--two" />
      <span className="not-found-orb not-found-orb--three" />
      <span className="not-found-star not-found-star--one">✦</span>
      <span className="not-found-star not-found-star--two">•</span>
      <section className="not-found-shell">
        <div className="not-found-code" aria-hidden="true">404</div>
        <h1>Esta página no está disponible</h1>
        <p className="not-found-description">La dirección que buscas no existe o fue movida dentro del sistema.</p>
        <div className="not-found-actions">
          <Link className="not-found-home-button" href="/">Ir al inicio</Link>
        </div>
        <small className="not-found-footer">Sistema de Gestión Digital Escolar · SIGDE</small>
      </section>
    </main>
  );
}
