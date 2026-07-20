import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardExperience, { type DashboardUser } from '@/components/dashboard/DashboardExperience';
import { verificarToken } from '@backend/utils/jwt';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    redirect('/');
  }

  let usuario: DashboardUser;

  try {
    const payload = await verificarToken(token);
    usuario = {
      id: Number(payload.id),
      nombre: String(payload.nombre || 'Usuario SIGDE'),
      correo: String(payload.correo || ''),
      rol: String(payload.rol || 'Usuario'),
    };
  } catch {
    redirect('/');
  }

  return <DashboardExperience usuario={usuario} />;
}
