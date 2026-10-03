'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch('/api/monitoring/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message.slice(0, 300),
        digest: error.digest || null,
        path: window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [error]);

  return (
    <main className="not-found-page not-found-page--runtime-error">
      <section className="not-found-shell">
        <p className="not-found-kicker">ERROR DEL SISTEMA</p>
        <div className="not-found-code" aria-hidden="true">500</div>
        <h1>No pudimos cargar esta vista</h1>
        <p className="not-found-description">Inténtalo de nuevo. Si el problema continúa, contacta a la institución.</p>
        <div className="not-found-actions"><button className="not-found-home-button" type="button" onClick={() => reset()}>Intentar de nuevo</button><Link className="not-found-home-button" href="/">Volver al inicio</Link></div>
        <small className="not-found-footer">Sistema de Gestión Digital Escolar · SIGDE</small>
      </section>
    </main>
  );
}
