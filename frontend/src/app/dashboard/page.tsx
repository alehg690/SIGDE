import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardExperience, { type DashboardUser } from '@/components/dashboard/DashboardExperience';
import { autorizarRoles, esErrorAutorizacion } from '@backend/middleware/rol.middleware';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    redirect('/');
  }

  let usuario: DashboardUser;

  try {
    const auth = await autorizarRoles(token);
    if (esErrorAutorizacion(auth)) redirect('/');

    usuario = {
      id: auth.usuario.id,
      nombre: auth.usuario.nombre,
      correo: auth.usuario.correo,
      rol: auth.usuario.rol,
    };
  } catch {
    redirect('/');
  }

  return <DashboardExperience usuario={usuario} />;
}
