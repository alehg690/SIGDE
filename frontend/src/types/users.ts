export type RolUsuario = 'Coordinador' | 'Docente' | 'Porteria';

export type UsuarioSistema = {
  id: number;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  activo: boolean;
  creadoEn: string;
};

export type Porteria = UsuarioSistema & {
  rol: 'Porteria';
};
