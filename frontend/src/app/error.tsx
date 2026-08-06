'use client';

import Link from 'next/link';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <main className="not-found-page not-found-page--runtime-error">
      <section className="not-found-shell">
        <p className="not-found-kicker">ERROR DE NAVEGACIÓN</p>
        <div className="not-found-code" aria-hidden="true">404</div>
        <h1>Esta página no existe</h1>
        <p className="not-found-description">La vista no pudo cargarse o la dirección que buscas no está disponible.</p>
        <div className="not-found-actions"><button className="not-found-home-button" type="button" onClick={() => reset()}>Intentar de nuevo</button><Link className="not-found-home-button" href="/">Volver al inicio</Link></div>
        <small className="not-found-footer">Sistema de Gestión Digital Escolar · SIGDE</small>
      </section>
    </main>
  );
}
