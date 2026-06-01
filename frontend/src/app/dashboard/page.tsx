import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import DashboardExperience from '@/components/dashboard/DashboardExperience';
import type { Rol, Usuario } from '@/types/auth';

type TokenPayload = {
  id: number;
  correo: string;
  rol: Rol;
  nombre?: string;
};

function getRolValido(rol: unknown): Rol {
  if (rol === 'Admin' || rol === 'Coordinador' || rol === 'Docente' || rol === 'Porteria') return rol;
  return 'Docente';
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) redirect('/');

  let payload: TokenPayload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
  } catch {
    redirect('/');
  }

  const usuario: Usuario = {
    id: Number(payload.id),
    nombre: payload.nombre || payload.correo.split('@')[0],
    correo: payload.correo,
    rol: getRolValido(payload.rol),
  };

  return <DashboardExperience usuario={usuario} />;
}
