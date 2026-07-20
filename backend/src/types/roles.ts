export type RolUsuario = 'Admin' | 'Coordinador' | 'Docente' | 'Porteria';

export type SesionUsuario = {
  id: number;
  nombre: string;
  correo: string;
  rol: RolUsuario;
};

const ROLES_VALIDOS: RolUsuario[] = ['Admin', 'Coordinador', 'Docente', 'Porteria'];

export function normalizarRol(rol: string): RolUsuario | null {
  const valor = rol.trim().toLowerCase();

  if (valor === 'admin' || valor === 'administrador') return 'Admin';
  if (valor === 'coordinador' || valor === 'coordinadora') return 'Coordinador';
  if (valor === 'docente' || valor === 'profesor' || valor === 'maestro') return 'Docente';
  if (valor === 'porteria' || valor === 'portería' || valor === 'portero') return 'Porteria';

  return null;
}

export function esRolValido(rol: string): rol is RolUsuario {
  return ROLES_VALIDOS.includes(rol as RolUsuario);
}

export function tieneRol(usuario: SesionUsuario, roles: RolUsuario[]) {
  return roles.includes(usuario.rol);
}
