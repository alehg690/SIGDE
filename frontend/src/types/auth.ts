export type Rol = 'Admin' | 'Docente' | 'Coordinador';

export type Usuario = {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
};

export type Vista = 'login' | 'recuperar' | 'codigo' | 'nueva-contrasena';
