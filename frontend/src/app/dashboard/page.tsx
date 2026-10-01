import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardExperience, { type DashboardUser } from '@/components/dashboard/DashboardExperience';
import FirstPasswordChange from '@/components/auth/FirstPasswordChange';
import { autorizarRoles, esErrorAutorizacion } from '@backend/middleware/rol.middleware';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    redirect('/');
  }

  let usuario: DashboardUser;
  let requiereCambio = false;

  try {
    const auth = await autorizarRoles(token, undefined, true);
    if (esErrorAutorizacion(auth)) redirect('/');

    requiereCambio = auth.usuario.requiereCambioContrasena;

    usuario = {
      id: auth.usuario.id,
      nombre: auth.usuario.nombre,
      correo: auth.usuario.correo,
      rol: auth.usuario.rol,
    };
  } catch {
    redirect('/');
  }

  if (requiereCambio) return <FirstPasswordChange nombre={usuario.nombre} />;

  return <DashboardExperience usuario={usuario} />;
}
