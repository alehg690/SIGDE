export type Rol = 'Docente' | 'Coordinador' | 'Porteria';

export type Usuario = {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
};

export type Vista = 'login' | 'recuperar' | 'codigo' | 'nueva-contrasena';
