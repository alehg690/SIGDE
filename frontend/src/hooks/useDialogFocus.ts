'use client';

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useDialogFocus<T extends HTMLElement>(
  abierto: boolean,
  cerrar: () => void,
  puedeCerrar = true
): RefObject<T | null> {
  const dialogRef = useRef<T>(null);
  const cerrarRef = useRef(cerrar);
  const puedeCerrarRef = useRef(puedeCerrar);

  useEffect(() => {
    cerrarRef.current = cerrar;
    puedeCerrarRef.current = puedeCerrar;
  }, [cerrar, puedeCerrar]);

  useEffect(() => {
    if (!abierto) return;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialogo = dialogRef.current
      || document.querySelector<T>('[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]');
    const frame = window.requestAnimationFrame(() => {
      const primero = dialogo?.querySelector<HTMLElement>('[autofocus], [data-dialog-initial-focus]')
        || dialogo?.querySelector<HTMLElement>('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])')
        || dialogo?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (primero || dialogo)?.focus();
    });

    function manejarTeclado(event: KeyboardEvent) {
      if (event.key === 'Escape' && puedeCerrarRef.current) {
        event.preventDefault();
        cerrarRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogo) return;
      const elementos = [...dialogo.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
        .filter((elemento) => elemento.offsetParent !== null);
      if (!elementos.length) {
        event.preventDefault();
        dialogo.focus();
        return;
      }
      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      if (event.shiftKey && document.activeElement === primero) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener('keydown', manejarTeclado);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', manejarTeclado);
      if (anterior?.isConnected) anterior.focus();
    };
  }, [abierto]);

  return dialogRef;
}
