'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type RolUsuario = 'Coordinador' | 'Docente' | 'Porteria';
type Usuario = { id: number; nombre: string; correo: string; rol: RolUsuario; activo: boolean; creadoEn: string; ultimoAcceso: string | null };
type UsuarioForm = { nombre: string; correo: string; rol: RolUsuario; contrasena: string; activo: boolean };
type Feedback = { tipo: 'success' | 'error'; texto: string };

const ROLES: RolUsuario[] = ['Coordinador', 'Docente', 'Porteria'];
const EMPTY_FORM: UsuarioForm = { nombre: '', correo: '', rol: 'Docente', contrasena: '', activo: true };

async function leerError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : fallback;
}

function etiquetaRol(rol: RolUsuario) {
  return rol === 'Porteria' ? 'Portería' : rol;
}

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return `${partes[0]?.[0] || 'U'}${partes[1]?.[0] || ''}`.toUpperCase();
}

function colorRol(rol: RolUsuario) {
  if (rol === 'Coordinador') return 'coordinator';
  if (rol === 'Porteria') return 'gatekeeper';
  return 'teacher';
}

function generarContrasena(nombre: string) {
  const partes = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 ]/g, '').trim().split(/\s+/).filter(Boolean);
  let base = `${partes[0] || 'Usuario'}${partes[1]?.[0] || ''}`;
  if (base.length < 4) base = `${base}Sigde`;
  base = `${base[0]?.toUpperCase() || 'U'}${base.slice(1).toLowerCase()}`;
  const numero = crypto.getRandomValues(new Uint32Array(1))[0] % 9000 + 1000;
  return `${base}${numero}`;
}

function fechaAcceso(value: string | null) {
  if (!value) return 'Nunca';
  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return 'Sin registro';
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' }).format(fecha);
}

function usuarioToForm(usuario: Usuario): UsuarioForm {
  return { nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol, contrasena: '', activo: usuario.activo };
}

export default function UsersWorkspace({ currentUserId, onCurrentUserUpdated }: { currentUserId: number; onCurrentUserUpdated: () => void }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<'Todos' | RolUsuario>('Todos');
  const [menuAbiertoId, setMenuAbiertoId] = useState<number | null>(null);
  const [modal, setModal] = useState<'crear' | 'editar' | null>(null);
  const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);
  const [usuarioEliminar, setUsuarioEliminar] = useState<Usuario | null>(null);
  const [formCrear, setFormCrear] = useState<UsuarioForm>(EMPTY_FORM);
  const [formEditar, setFormEditar] = useState<UsuarioForm>(EMPTY_FORM);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [contrasenaCopiada, setContrasenaCopiada] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const cargarUsuarios = useCallback(async () => {
    const response = await fetch('/api/usuarios', { cache: 'no-store' });
    if (!response.ok) throw new Error(await leerError(response, 'No se pudieron cargar los usuarios.'));
    const data = await response.json();
    setUsuarios(Array.isArray(data) ? data as Usuario[] : []);
  }, []);

  useEffect(() => {
    let activa = true;
    const timer = window.setTimeout(() => {
      void cargarUsuarios().catch((error) => {
        if (activa) setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo abrir el módulo.' });
      }).finally(() => { if (activa) setCargando(false); });
    }, 0);
    return () => { activa = false; window.clearTimeout(timer); };
  }, [cargarUsuarios]);

  const usuariosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    return usuarios.filter((usuario) => {
      const coincideRol = filtroRol === 'Todos' || usuario.rol === filtroRol;
      const coincideTexto = !termino || `${usuario.nombre} ${usuario.correo} ${usuario.rol}`.toLocaleLowerCase('es').includes(termino);
      return coincideRol && coincideTexto;
    });
  }, [busqueda, filtroRol, usuarios]);

  function abrirCrear() {
    setFormCrear(EMPTY_FORM);
    setMostrarContrasena(false);
    setContrasenaCopiada(false);
    setFeedback(null);
    setMenuAbiertoId(null);
    setModal('crear');
  }

  function abrirEditar(usuario: Usuario) {
    setUsuarioEditar(usuario);
    setFormEditar(usuarioToForm(usuario));
    setFeedback(null);
    setMenuAbiertoId(null);
    setModal('editar');
  }

  function cerrarModal() {
    if (guardando) return;
    setModal(null);
    setUsuarioEditar(null);
  }

  function generarTemporal() {
    if (!formCrear.nombre.trim()) return;
    setFormCrear((actual) => ({ ...actual, contrasena: generarContrasena(actual.nombre) }));
    setMostrarContrasena(true);
    setContrasenaCopiada(false);
  }

  async function copiarContrasena() {
    if (!formCrear.contrasena) return;
    try {
      await navigator.clipboard.writeText(formCrear.contrasena);
      setContrasenaCopiada(true);
    } catch {
      setContrasenaCopiada(false);
    }
  }

  async function crearUsuario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuardando(true); setFeedback(null);
    try {
      const response = await fetch('/api/usuarios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formCrear) });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo crear el usuario.'));
      await cargarUsuarios();
      setModal(null);
      setFormCrear(EMPTY_FORM);
      setFeedback({ tipo: 'success', texto: 'Usuario creado correctamente.' });
    } catch (error) {
      setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo crear el usuario.' });
    } finally { setGuardando(false); }
  }

  async function actualizarUsuario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!usuarioEditar) return;
    setGuardando(true); setFeedback(null);
    try {
      const response = await fetch(`/api/usuarios/${usuarioEditar.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formEditar) });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo actualizar el usuario.'));
      await cargarUsuarios();
      setModal(null);
      if (usuarioEditar.id === currentUserId) onCurrentUserUpdated();
      setUsuarioEditar(null);
      setFeedback({ tipo: 'success', texto: 'Usuario actualizado correctamente.' });
    } catch (error) {
      setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo actualizar el usuario.' });
    } finally { setGuardando(false); }
  }

  async function cambiarEstado(usuario: Usuario) {
    setGuardando(true); setFeedback(null); setMenuAbiertoId(null);
    try {
      const response = await fetch(`/api/usuarios/${usuario.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ activo: !usuario.activo }) });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo cambiar el estado.'));
      await cargarUsuarios();
      setFeedback({ tipo: 'success', texto: usuario.activo ? 'Usuario desactivado.' : 'Usuario activado.' });
    } catch (error) {
      setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo cambiar el estado.' });
    } finally { setGuardando(false); }
  }

  async function eliminarUsuario() {
    if (!usuarioEliminar) return;
    setGuardando(true); setFeedback(null);
    try {
      const response = await fetch(`/api/usuarios/${usuarioEliminar.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo eliminar el usuario.'));
      await cargarUsuarios();
      setUsuarioEliminar(null);
      setFeedback({ tipo: 'success', texto: 'Usuario eliminado correctamente.' });
    } catch (error) {
      setUsuarioEliminar(null);
      setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo eliminar el usuario.' });
    } finally { setGuardando(false); }
  }

  return <section className="workspace-panel users-directory-workspace" onClick={() => setMenuAbiertoId(null)}>
    <header className="users-directory-heading"><div><h2>Usuarios</h2><p>{cargando ? 'Cargando usuarios...' : `${usuarios.length} usuarios registrados en el sistema`}</p></div><button type="button" className="users-create-trigger" onClick={(event) => { event.stopPropagation(); abrirCrear(); }}><span aria-hidden="true">＋</span> Crear usuario</button></header>
    {feedback && <p className={`feedback ${feedback.tipo}`} role="status">{feedback.texto}</p>}
    <div className="users-directory-toolbar">
      <label><span className="users-search-icon" aria-hidden="true">⌕</span><span className="sr-only">Buscar usuario</span><input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar usuario..." /></label>
      <div className="users-role-filters" aria-label="Filtrar por rol"><button type="button" className={filtroRol === 'Todos' ? 'active' : ''} onClick={() => setFiltroRol('Todos')}>Todos</button>{ROLES.map((rol) => <button type="button" key={rol} className={filtroRol === rol ? 'active' : ''} onClick={() => setFiltroRol(rol)}>{etiquetaRol(rol)}</button>)}</div>
    </div>
    <div className="users-table-card">
      <div className="users-table-scroll">
        <table className="users-directory-table">
          <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>{usuariosFiltrados.map((usuario) => <tr key={usuario.id}>
            <td><div className="users-name-cell"><span className={`users-avatar users-avatar--${colorRol(usuario.rol)}`}>{iniciales(usuario.nombre)}</span><strong>{usuario.nombre}</strong></div></td>
            <td>{usuario.correo}</td>
            <td><span className={`users-role-badge users-role-badge--${colorRol(usuario.rol)}`}>{etiquetaRol(usuario.rol)}</span></td>
            <td><button type="button" className={usuario.activo ? 'users-status-toggle users-status-toggle--active' : 'users-status-toggle users-status-toggle--inactive'} disabled={usuario.id === currentUserId || guardando} onClick={() => void cambiarEstado(usuario)} title={usuario.id === currentUserId ? 'No puedes desactivar la cuenta en uso' : usuario.activo ? 'Desactivar usuario' : 'Activar usuario'}><span><i />{usuario.activo ? 'Activo' : 'Inactivo'}</span><small>{usuario.id === currentUserId ? 'Cuenta en uso' : usuario.activo ? 'Desactivar' : 'Activar'}</small></button></td>
            <td><time dateTime={usuario.ultimoAcceso || undefined}>{fechaAcceso(usuario.ultimoAcceso)}</time></td>
            <td className="users-actions-cell"><button type="button" aria-label={`Acciones de ${usuario.nombre}`} aria-expanded={menuAbiertoId === usuario.id} onClick={(event) => { event.stopPropagation(); setMenuAbiertoId((actual) => actual === usuario.id ? null : usuario.id); }}>•••</button>{menuAbiertoId === usuario.id && <div className="users-row-menu" role="menu" onClick={(event) => event.stopPropagation()}><button type="button" role="menuitem" onClick={() => abrirEditar(usuario)}><span aria-hidden="true">✎</span> Editar</button><button type="button" role="menuitem" disabled={usuario.id === currentUserId || guardando} onClick={() => void cambiarEstado(usuario)}><span aria-hidden="true">♢</span> {usuario.activo ? 'Desactivar' : 'Activar'}</button><button type="button" role="menuitem" className="danger" disabled={usuario.id === currentUserId || guardando} onClick={() => { setUsuarioEliminar(usuario); setMenuAbiertoId(null); }}><span aria-hidden="true">♲</span> Eliminar</button></div>}</td>
          </tr>)}</tbody>
        </table>
        {!cargando && usuariosFiltrados.length === 0 && <div className="users-directory-empty"><strong>No hay usuarios para mostrar</strong><p>Prueba otra búsqueda o selecciona un rol diferente.</p></div>}
      </div>
    </div>

    {modal === 'crear' && <div className="users-modal-backdrop" role="presentation" onMouseDown={cerrarModal}><form className="users-modal" role="dialog" aria-modal="true" aria-labelledby="create-user-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={crearUsuario}><header><h3 id="create-user-title">Crear usuario</h3><button type="button" aria-label="Cerrar" onClick={cerrarModal}>×</button></header><div className="users-modal-body"><UserField label="Nombre completo" value={formCrear.nombre} placeholder="Nombre y apellido" onChange={(nombre) => { setFormCrear({ ...formCrear, nombre }); setContrasenaCopiada(false); }} required /><UserField label="Correo electrónico" type="email" value={formCrear.correo} placeholder="correo@institucion.edu.co" onChange={(correo) => setFormCrear({ ...formCrear, correo })} required /><RoleField value={formCrear.rol} onChange={(rol) => setFormCrear({ ...formCrear, rol })} /><label className="users-modal-field"><span>Contraseña temporal</span><div className="users-password-field"><input type={mostrarContrasena ? 'text' : 'password'} value={formCrear.contrasena} minLength={8} maxLength={128} onChange={(event) => { setFormCrear({ ...formCrear, contrasena: event.target.value }); setContrasenaCopiada(false); }} placeholder="Genera o escribe una contraseña" required /><button type="button" onClick={() => setMostrarContrasena((actual) => !actual)}>{mostrarContrasena ? 'Ocultar' : 'Ver'}</button></div><div className="users-password-actions"><button type="button" disabled={!formCrear.nombre.trim()} onClick={generarTemporal}>Generar con el nombre</button><button type="button" disabled={!formCrear.contrasena} onClick={() => void copiarContrasena()}>{contrasenaCopiada ? 'Copiada' : 'Copiar'}</button></div><small>Combina el nombre con números aleatorios y cumple la política mínima de seguridad.</small></label></div><footer><button type="button" onClick={cerrarModal}>Cancelar</button><button type="submit" className="primary" disabled={guardando || !formCrear.contrasena}>{guardando ? 'Creando...' : '✓  Crear usuario'}</button></footer></form></div>}

    {modal === 'editar' && usuarioEditar && <div className="users-modal-backdrop" role="presentation" onMouseDown={cerrarModal}><form className="users-modal" role="dialog" aria-modal="true" aria-labelledby="edit-user-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={actualizarUsuario}><header><h3 id="edit-user-title">Editar usuario</h3><button type="button" aria-label="Cerrar" onClick={cerrarModal}>×</button></header><div className="users-modal-body"><UserField label="Nombre completo" value={formEditar.nombre} onChange={(nombre) => setFormEditar({ ...formEditar, nombre })} required /><UserField label="Correo electrónico" type="email" value={formEditar.correo} onChange={(correo) => setFormEditar({ ...formEditar, correo })} required /><RoleField value={formEditar.rol} disabled={usuarioEditar.id === currentUserId} onChange={(rol) => setFormEditar({ ...formEditar, rol })} />{usuarioEditar.id === currentUserId && <p className="users-current-account-note">Por seguridad no puedes cambiar el rol de la cuenta en uso.</p>}</div><footer><button type="button" onClick={cerrarModal}>Cancelar</button><button type="submit" className="primary" disabled={guardando}>{guardando ? 'Guardando...' : '✓  Guardar cambios'}</button></footer></form></div>}

    {usuarioEliminar && <div className="users-modal-backdrop" role="presentation" onMouseDown={() => !guardando && setUsuarioEliminar(null)}><div className="users-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-user-title" onMouseDown={(event) => event.stopPropagation()}><span className="users-delete-icon" aria-hidden="true">!</span><h3 id="delete-user-title">¿Eliminar usuario?</h3><p>Se eliminará la cuenta de <strong>{usuarioEliminar.nombre}</strong>. Si tiene reportes, salidas o registros de auditoría, SIGDE conservará la cuenta y te pedirá desactivarla.</p><div><button type="button" disabled={guardando} onClick={() => setUsuarioEliminar(null)}>Cancelar</button><button type="button" className="danger" disabled={guardando} onClick={() => void eliminarUsuario()}>{guardando ? 'Eliminando...' : 'Eliminar usuario'}</button></div></div></div>}
  </section>;
}

function UserField({ label, value, onChange, type = 'text', placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return <label className="users-modal-field"><span>{label}</span><input type={type} value={value} placeholder={placeholder} required={required} onChange={(event) => onChange(event.target.value)} /></label>;
}

function RoleField({ value, onChange, disabled = false }: { value: RolUsuario; onChange: (value: RolUsuario) => void; disabled?: boolean }) {
  return <label className="users-modal-field"><span>Rol</span><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as RolUsuario)}>{ROLES.map((rol) => <option key={rol} value={rol}>{etiquetaRol(rol)}</option>)}</select></label>;
}
