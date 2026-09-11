'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';

export default function MobileNavigation({ children, roleLabel }: { children: ReactNode; roleLabel: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousOverflow = useRef('');
  const previousRootOverflow = useRef('');
  const [open, setOpen] = useState(false);

  function close() { dialog.current?.close(); }
  function restoreScroll() {
    document.body.style.overflow = previousOverflow.current;
    document.documentElement.style.overflow = previousRootOverflow.current;
    setOpen(false);
  }
  function show() {
    if (!dialog.current || dialog.current.open) return;
    previousOverflow.current = document.body.style.overflow;
    previousRootOverflow.current = document.documentElement.style.overflow;
    dialog.current.showModal();
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    setOpen(true);
  }
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1024px)');
    const onResize = () => { if (wide.matches) dialog.current?.close(); };
    const element = dialog.current;
    wide.addEventListener('change', onResize);
    return () => {
      wide.removeEventListener('change', onResize);
      if (element?.open) {
        element.close();
        document.body.style.overflow = previousOverflow.current;
        document.documentElement.style.overflow = previousRootOverflow.current;
      }
    };
  }, []);

  return <>
    <button type="button" className="mobile-menu-trigger" aria-label="Abrir menú de navegación" aria-haspopup="dialog" aria-controls="mobile-navigation" aria-expanded={open} onClick={show}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg><span>Menú</span>
    </button>
    <dialog ref={dialog} id="mobile-navigation" className="mobile-navigation" aria-labelledby="mobile-navigation-title" onClose={restoreScroll} onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    }}>
      <header><div><strong id="mobile-navigation-title">SIGDE</strong><span>{roleLabel}</span></div><button type="button" aria-label="Cerrar menú de navegación" onClick={close}>×</button></header>
      <div className="mobile-navigation-content" onClick={(event) => { if ((event.target as HTMLElement).closest('.app-nav-item')) close(); }}>{children}</div>
    </dialog>
  </>;
}
