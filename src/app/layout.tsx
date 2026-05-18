import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'SIGDE - Sistema de Gestión Digital Escolar',
  description: 'Sistema de gestión de convivencia escolar',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" style={{ height: '100%', margin: 0, padding: 0 }}>
      <body style={{ height: '100%', margin: 0, padding: 0, overflow: 'hidden' }} className={inter.className}>
        {children}
      </body>
    </html>
  );
}