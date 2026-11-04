import type { NextRequest } from 'next/server';

function primeraDireccion(value: string | null) {
  return value?.split(',')[0]?.trim() || null;
}

function ultimaDireccion(value: string | null) {
  const addresses = value?.split(',').map((address) => address.trim()).filter(Boolean);
  return addresses?.at(-1) || null;
}

export function obtenerIpCliente(request: NextRequest) {
  const provider = process.env.HOSTING_PROVIDER?.trim().toLowerCase();

  if (process.env.NODE_ENV === 'production') {
    if (provider === 'hostinger') {
      return request.headers.get('x-real-ip')?.trim()
        || ultimaDireccion(request.headers.get('x-forwarded-for'));
    }

    // Conserva compatibilidad con el despliegue anterior en Vercel cuando la
    // variable todavía no esté configurada durante una transición.
    return primeraDireccion(request.headers.get('x-vercel-forwarded-for'));
  }

  return request.headers.get('x-real-ip')?.trim()
    || primeraDireccion(request.headers.get('x-vercel-forwarded-for'))
    || primeraDireccion(request.headers.get('x-forwarded-for'));
}

export function obtenerIdentificadorCliente(request: NextRequest) {
  const ip = obtenerIpCliente(request);
  return (ip || `sin-ip:${request.headers.get('user-agent') || 'desconocido'}`).slice(0, 256);
}
