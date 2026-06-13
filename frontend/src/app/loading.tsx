import Image from 'next/image';

export default function Loading() {
  return (
    <main className="sigde-loading sigde-loading--visible" aria-busy="true" aria-live="polite">
      <div className="sigde-loading__card">
        <div className="sigde-loading__spinner" aria-hidden="true">
          <span className="sigde-loading__spinner-ring sigde-loading__spinner-ring--outer" />
          <span className="sigde-loading__spinner-ring sigde-loading__spinner-ring--middle" />
          <span className="sigde-loading__spinner-ring sigde-loading__spinner-ring--inner" />
          <span className="sigde-loading__spinner-core">
            <Image src="/Logo-login.png" alt="" width={28} height={32} />
          </span>
        </div>
        <p className="sigde-loading__label">SIGDE</p>
        <p className="sigde-loading__text">Cargando experiencia segura...</p>
      </div>
    </main>
  );
}
