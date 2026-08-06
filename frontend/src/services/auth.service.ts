import { apiRequest } from '@/services/api';

export type SessionUser = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
};

export type SessionResponse = {
  autenticado: boolean;
  usuario?: SessionUser;
  expiraEn?: number | null;
};

export async function getSession() {
  return apiRequest<SessionResponse>('/api/auth', { cache: 'no-store' });
}

export async function logout() {
  return apiRequest<{ mensaje: string }>('/api/auth', {
    method: 'POST',
    body: JSON.stringify({ accion: 'logout' }),
  });
}
