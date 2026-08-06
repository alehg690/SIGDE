import { LegalPage } from '@/components/legal/LegalPage';

export const metadata = {
  title: 'Política de Tratamiento de Datos | SIGDE',
  description: 'Política de tratamiento de datos personales de SIGDE.',
};

export default function PoliticaDatosPage() {
  return <LegalPage title="Política de Tratamiento de Datos" kind="datos" />;
}
