import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'SIGDE - Sistema de Gestión Digital Escolar',
  description: 'Sistema de gestión de convivencia escolar',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', margin: 0, padding: 0 }}>
        <div style={{ flex: 1 }}>
          {children}
        </div>
        <footer style={{
  background: '#0a1628',
  borderTop: '1px solid rgba(99,179,237,0.15)',
}}>
  {/* Sección principal */}
  <div style={{
    maxWidth: 1200,
    margin: '0 auto',
    padding: '48px 32px 32px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 40,
  }}>
    {/* Logo y descripción */}
    <div>
      <div style={{ marginBottom: 16}}>
        <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: '0.1em', color: '#e8f4fd'}}>
          SI<span style={{ color: '#63b3ed'}}>G</span>DE
        </span>
      </div>
      <p style={{ color: 'rgba(200,220,240,0.5)', fontSize: 13, lineHeight: 1.7, margin: '0 0 16px', maxWidth: 240}}>
        Sistema de Gestión Digital Escolar para el control y seguimiento de la convivencia escolar.
      </p>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#63b3ed', fontWeight: 700, fontSize: 18 }}>100%</p>
          <p style={{ margin: 0, fontSize: 10, color: 'rgba(200,220,240,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Digital</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#63b3ed', fontWeight: 700, fontSize: 18 }}>24/7</p>
          <p style={{ margin: 0, fontSize: 10, color: 'rgba(200,220,240,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Acceso</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#63b3ed', fontWeight: 700, fontSize: 18 }}>IA</p>
          <p style={{ margin: 0, fontSize: 10, color: 'rgba(200,220,240,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Integrada</p>
        </div>
      </div>
    </div>

    {/* Módulos */}
    <div>
      <p style={{ color: '#e8f4fd', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>Módulos</p>
      {['Dashboard', 'Registro Disciplinario', 'Historial Estudiante', 'Gestión de Salidas', 'Notificaciones'].map(item => (
        <p key={item} style={{ color: 'rgba(200,220,240,0.5)', fontSize: 13, margin: '0 0 10px' }}>{item}</p>
      ))}
    </div>

    {/* Roles */}
    <div>
      <p style={{ color: '#e8f4fd', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>Perfiles</p>
      {[
        { rol: 'Administrador', desc: 'Acceso total al sistema' },
        { rol: 'Coordinador', desc: 'Gestión y seguimiento' },
        { rol: 'Docente', desc: 'Registro de reportes' },
      ].map(item => (
        <div key={item.rol} style={{ marginBottom: 12 }}>
          <p style={{ color: 'rgba(200,220,240,0.8)', fontSize: 13, margin: '0 0 2px', fontWeight: 500 }}>{item.rol}</p>
          <p style={{ color: 'rgba(200,220,240,0.4)', fontSize: 11, margin: 0 }}>{item.desc}</p>
        </div>
      ))}
    </div>

    {/* Tecnología */}
    <div>
      <p style={{ color: '#e8f4fd', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>Tecnología</p>
      {[
        { tech: 'Next.js 16', desc: 'Framework Frontend' },
        { tech: 'Prisma 7', desc: 'ORM Base de Datos' },
        { tech: 'Turso', desc: 'SQLite en la nube' },
        { tech: 'Nodemailer', desc: 'Notificaciones email' },
      ].map(item => (
        <div key={item.tech} style={{ marginBottom: 12 }}>
          <p style={{ color: 'rgba(200,220,240,0.8)', fontSize: 13, margin: '0 0 2px', fontWeight: 500 }}>{item.tech}</p>
          <p style={{ color: 'rgba(200,220,240,0.4)', fontSize: 11, margin: 0 }}>{item.desc}</p>
        </div>
      ))}
    </div>
  </div>

  {/* Línea separadora */}
  <div style={{ borderTop: '1px solid rgba(99,179,237,0.1)', maxWidth: 1200, margin: '0 auto' }} />

  {/* Copyright */}
  <div style={{
    maxWidth: 1200,
    margin: '0 auto',
    padding: '20px 32px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  }}>
    <p style={{ color: 'rgba(200,220,240,0.3)', fontSize: 12, margin: 0 }}>
      © 2026 SIGDE · Todos los derechos reservados
    </p>
    <p style={{ color: 'rgba(200,220,240,0.3)', fontSize: 12, margin: 0 }}>
      Desarrollado por <span style={{ color: '#63b3ed' }}>Alejandro Hurtado</span> · Grado 11-2
    </p>
  </div>
</footer>
      </body>
    </html>
  );
}