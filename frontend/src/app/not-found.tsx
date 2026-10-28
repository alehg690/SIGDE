import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <main className="not-found-page">
      <section className="not-found-shell">
        <Image className="not-found-logo" src="/Logo-login.png" alt="SIGDE" width={76} height={88} priority />
        <p className="not-found-kicker">PÁGINA NO ENCONTRADA</p>
        <div className="not-found-code" aria-hidden="true">404</div>
        <h1>Esta página no está disponible</h1>
        <p className="not-found-description">La dirección que buscas no existe, cambió de ubicación o ya no está disponible.</p>
        <div className="not-found-actions">
          <Link className="not-found-home-button" href="/">Ir al inicio</Link>
        </div>
        <small className="not-found-footer">Sistema de Gestión Digital Escolar · SIGDE</small>
      </section>
    </main>
  );
}
