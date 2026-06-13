'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const MIN_VISIBLE_MS = 700;

export default function RouteLoadingOverlay() {
  const pathname = usePathname();
  return <RouteLoadingFrame key={pathname} />;
}

function RouteLoadingFrame() {
  const [pendingRequests, setPendingRequests] = useState(0);
  const [routeVisible, setRouteVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setRouteVisible(false), MIN_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args) => {
      setPendingRequests((count) => count + 1);
      try {
        return await originalFetch(...args);
      } finally {
        setPendingRequests((count) => Math.max(0, count - 1));
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const visible = routeVisible || pendingRequests > 0;

  return (
    <div className={`route-loading ${visible ? 'route-loading--visible' : ''}`} aria-hidden={!visible}>
      <div className="route-loading__card">
        <div className="route-loading__spinner" aria-hidden="true">
          <span className="route-loading__spinner-ring route-loading__spinner-ring--outer" />
          <span className="route-loading__spinner-ring route-loading__spinner-ring--middle" />
          <span className="route-loading__spinner-ring route-loading__spinner-ring--inner" />
          <span className="route-loading__spinner-core">
            <Image src="/Logo-login.png" alt="" width={28} height={32} />
          </span>
        </div>
        <p className="route-loading__label">SIGDE</p>
        <p className="route-loading__text">Cargando...</p>
      </div>
    </div>
  );
}
