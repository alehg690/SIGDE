import type { Metadata } from 'next';
import ExpoStandalone from '@/components/dashboard/ExpoStandalone';

export const metadata: Metadata = {
  title: 'Modo Expo | SIGDE',
  description: 'Recorrido interactivo y seguro para descubrir cómo funciona SIGDE.',
};

export default function ExpoPage() {
  return <ExpoStandalone />;
}
