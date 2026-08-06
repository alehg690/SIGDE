import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardExperience, { type DashboardUser } from '@/components/dashboard/DashboardExperience';
import { obtenerUsuarioPorId } from '@backend/services/usuarios.service';
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
    const usuarioActual = await obtenerUsuarioPorId(Number(payload.id));

    if (!usuarioActual || !usuarioActual.activo) {
      redirect('/');
    }

    usuario = {
      id: usuarioActual.id,
      nombre: usuarioActual.nombre,
      correo: usuarioActual.correo,
      rol: usuarioActual.rol,
    };
  } catch {
    redirect('/');
  }

  return <DashboardExperience usuario={usuario} />;
}
