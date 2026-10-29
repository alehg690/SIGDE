'use client';

import { useEffect, useRef } from 'react';

export function useAutoDismiss(active: boolean, dismiss: () => void, delay = 7_000) {
  const dismissRef = useRef(dismiss);

  useEffect(() => { dismissRef.current = dismiss; }, [dismiss]);
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => dismissRef.current(), delay);
    return () => window.clearTimeout(timer);
  }, [active, delay]);
}
