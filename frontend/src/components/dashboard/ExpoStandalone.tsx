'use client';

import { useEffect } from 'react';
import ExpoMode from '@/components/dashboard/ExpoMode';

const EXPO_METRICS = {
  estudiantes: 914,
  reportes: 5,
  alertas: 5,
  pendientes: 1,
};

export default function ExpoStandalone() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/expo-sw.js', { scope: '/expo' });
  }, []);

  return <ExpoMode metrics={EXPO_METRICS} />;
}
