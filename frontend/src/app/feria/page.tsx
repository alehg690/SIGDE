import type { Metadata } from 'next';
import FeriaExperience from './FeriaExperience';

const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdAJPT0KhzQ8s0O_twGkqSToFPysDl-UD4Yxm430GCqxwvBjg/viewform';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.sigde.xyz'),
  title: 'Conoce SIGDE | Feria de proyectos 2026',
  description: 'Conoce SIGDE, el proyecto de grado de Alejandro Hurtado, y comparte tu evaluación en la feria de proyectos 2026.',
  openGraph: {
    title: '¡Conoce SIGDE!',
    description: 'Una nueva forma de organizar la información escolar. Descubre el proyecto y evalúalo.',
    type: 'website',
    images: [{ url: '/Logo-login.png', width: 1049, height: 1116, alt: 'Logotipo de SIGDE' }],
  },
  twitter: { card: 'summary', title: '¡Conoce SIGDE!', description: 'Descubre SIGDE en menos de un minuto.' },
};

export default function FeriaPage() {
  return <FeriaExperience formUrl={process.env.FERIA_GOOGLE_FORM_URL || FORM_URL} />;
}
