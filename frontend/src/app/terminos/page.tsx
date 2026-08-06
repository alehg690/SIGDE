import { LegalPage } from '@/components/legal/LegalPage';

export const metadata = {
  title: 'Términos y Condiciones | SIGDE',
  description: 'Términos y condiciones de uso de SIGDE.',
};

export default function TerminosPage() {
  return <LegalPage title="Términos y Condiciones" kind="terminos" />;
}
