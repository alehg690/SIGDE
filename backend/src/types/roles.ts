export type RolUsuario = 'Coordinador' | 'Docente' | 'Porteria';

export type SesionUsuario = {
  id: number;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  versionSesion: number;
};

const ROLES_VALIDOS: RolUsuario[] = ['Coordinador', 'Docente', 'Porteria'];

export function normalizarRol(rol: string): RolUsuario | null {
  const valor = rol.trim().toLowerCase();

  // Compatibilidad temporal con sesiones emitidas antes de eliminar el rol Admin.
  // Las cuentas en la base ya se migran a Coordinador.
  if (valor === 'admin' || valor === 'administrador') return 'Coordinador';
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
