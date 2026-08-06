import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ClientProviders from '@/components/ui/ClientProviders';
import RouteLoadingOverlay from '@/components/ui/RouteLoadingOverlay';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'SIGDE - Sistema de Gestión Digital Escolar',
  description: 'Sistema de gestión de convivencia escolar',
  icons: {
    icon: '/Logo-login.png',
    shortcut: '/Logo-login.png',
    apple: '/Logo-login.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <ClientProviders>
          <RouteLoadingOverlay />
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
