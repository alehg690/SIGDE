'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { parseReportDate } from '@/lib/report-dates';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { useAutoDismiss } from '@/hooks/useAutoDismiss';
import { coincideBusqueda } from '@/lib/search-normalization';
import ModuleHeader from '@/components/ui/ModuleHeader';
import KpiGrid from '@/components/ui/KpiGrid';
import Skeleton from '@/components/ui/Skeleton';

type RolUsuario = 'Admin' | 'Coordinador' | 'Docente' | 'Porteria';
type Usuario = { id: number; nombre: string; correo: string; rol: RolUsuario; activo: boolean; creadoEn: string; ultimoAcceso: string | null };
type UsuarioForm = { nombre: string; correo: string; rol: RolUsuario; contrasena: string; activo: boolean };
type Feedback = { tipo: 'success' | 'error'; texto: string };

const ROLES: RolUsuario[] = ['Admin', 'Coordinador', 'Docente', 'Porteria'];
const EMPTY_FORM: UsuarioForm = { nombre: '', correo: '', rol: 'Docente', contrasena: '', activo: true };

async function leerError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : fallback;
}

function etiquetaRol(rol: RolUsuario) {
  if (rol === 'Admin') return 'Administrador';
  return rol === 'Porteria' ? 'Portería' : rol;
}

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  return `${partes[0]?.[0] || 'U'}${partes[1]?.[0] || ''}`.toUpperCase();
}

function colorRol(rol: RolUsuario) {
  if (rol === 'Admin' || rol === 'Coordinador') return 'coordinator';
  if (rol === 'Porteria') return 'gatekeeper';
  return 'teacher';
}

function generarContrasena() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const numeros = '23456789';
  const caracteres = letras + numeros;
  const indices = crypto.getRandomValues(new Uint32Array(18));
  const clave = [letras[indices[0] % letras.length], numeros[indices[1] % numeros.length]];
  for (let i = 2; i < indices.length; i++) clave.push(caracteres[indices[i] % caracteres.length]);
  for (let i = clave.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [clave[i], clave[j]] = [clave[j], clave[i]];
  }
  return clave.join('');
}

function fechaAcceso(value: string | null) {
  if (!value) return 'Nunca';
  const fecha = parseReportDate(value);
  if (Number.isNaN(fecha.getTime())) return 'Sin registro';
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' }).format(fecha);
}

function usuarioToForm(usuario: Usuario): UsuarioForm {
  return { nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol, contrasena: '', activo: usuario.activo };
}

function fortalezaContrasena(value: string) {
  let puntos = 0;
  if (value.length >= 8) puntos++;
  if (value.length >= 12) puntos++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) puntos++;
  if (/\d/.test(value)) puntos++;
  if (/[^A-Za-z0-9]/.test(value)) puntos++;
  if (!value) return { nivel: 0, texto: 'Sin contraseña' };
  if (puntos <= 2) return { nivel: 1, texto: 'Débil' };
  if (puntos <= 4) return { nivel: 2, texto: 'Segura' };
  return { nivel: 3, texto: 'Muy segura' };
}

export default function UsersWorkspace({ currentUserId, currentRole }: { currentUserId: number; currentRole: 'admin' | 'coordinador' | 'docente' | 'portero' }) {
  const { cerrarSesion } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<'Todos' | RolUsuario>('Todos');
  const [menuAbiertoId, setMenuAbiertoId] = useState<number | null>(null);
  const [modal, setModal] = useState<'crear' | 'editar' | null>(null);
  const [usuarioEditar, setUsuarioEditar] = useState<Usuario | null>(null);
  const [usuarioEliminar, setUsuarioEliminar] = useState<Usuario | null>(null);
  const rolesDisponibles = currentRole === 'admin' ? ROLES : ROLES.filter((rol) => rol !== 'Admin');
  const [formCrear, setFormCrear] = useState<UsuarioForm>(EMPTY_FORM);
  const [formEditar, setFormEditar] = useState<UsuarioForm>(EMPTY_FORM);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [contrasenaCopiada, setContrasenaCopiada] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  useAutoDismiss(Boolean(feedback), () => setFeedback(null));
  useDialogFocus<HTMLElement>(Boolean(modal || usuarioEliminar), () => {
    if (modal) cerrarModal();
    else setUsuarioEliminar(null);
  }, !guardando);

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
    return usuarios.filter((usuario) => {
      const coincideRol = filtroRol === 'Todos' || usuario.rol === filtroRol;
      const coincideTexto = coincideBusqueda(busqueda, [usuario.nombre, usuario.correo, usuario.rol]);
      return coincideRol && coincideTexto;
    });
  }, [busqueda, filtroRol, usuarios]);
  const activos = usuarios.filter((usuario) => usuario.activo).length;
  const administradores = usuarios.filter((usuario) => usuario.rol === 'Admin' || usuario.rol === 'Coordinador').length;
  const sinAcceso = usuarios.filter((usuario) => !usuario.ultimoAcceso).length;
  const fortalezaCrear = fortalezaContrasena(formCrear.contrasena);
  const fortalezaEditar = fortalezaContrasena(formEditar.contrasena);

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
    setMostrarContrasena(false);
    setMostrarConfirmacion(false);
    setConfirmarContrasena('');
    setFeedback(null);
    setMenuAbiertoId(null);
    setModal('editar');
  }

  function cerrarModal() {
    if (guardando) return;
    setModal(null);
    setUsuarioEditar(null);
    setFormEditar(EMPTY_FORM);
    setConfirmarContrasena('');
    setMostrarContrasena(false);
    setMostrarConfirmacion(false);
  }

  function generarTemporal() {
    setFormCrear((actual) => ({ ...actual, contrasena: generarContrasena() }));
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
    if (formEditar.contrasena !== confirmarContrasena) {
      setFeedback({ tipo: 'error', texto: 'Las contraseñas no coinciden.' });
      return;
    }
    setGuardando(true); setFeedback(null);
    try {
      const response = await fetch(`/api/usuarios/${usuarioEditar.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formEditar) });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo actualizar el usuario.'));
      setModal(null);
      setUsuarioEditar(null);
      setFormEditar(EMPTY_FORM);
      setConfirmarContrasena('');
      setMostrarContrasena(false);
      setMostrarConfirmacion(false);
      if (usuarioEditar.id === currentUserId) {
        // La actualización revoca las sesiones, incluida la de esta cuenta.
        await cerrarSesion('Cuenta actualizada. Inicia sesión con tus credenciales vigentes.');
        return;
      }
      setFeedback({ tipo: 'success', texto: formEditar.contrasena ? 'Usuario y contraseña temporal actualizados. Deberá cambiarla al ingresar; sus sesiones anteriores se cerraron.' : 'Usuario actualizado correctamente.' });
      await cargarUsuarios();
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
    <ModuleHeader icon={<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>} kicker="Administración" title="Usuarios" description="Gestiona cuentas, roles y acceso al sistema desde un solo lugar." action={<button type="button" className="users-create-trigger" onClick={(event) => { event.stopPropagation(); abrirCrear(); }}><span aria-hidden="true">＋</span> Crear usuario</button>} />
    <KpiGrid label="Resumen de usuarios" items={[
      { label: 'Usuarios', value: cargando ? '—' : usuarios.length, detail: 'Cuentas registradas', icon: '01' },
      { label: 'Activos', value: cargando ? '—' : activos, detail: 'Con acceso habilitado', icon: '02' },
      { label: 'Gestores', value: cargando ? '—' : administradores, detail: 'Admin. y coordinadores', icon: '03' },
      { label: 'Primer ingreso', value: cargando ? '—' : sinAcceso, detail: 'Aún no han ingresado', icon: '04' },
    ]} />
    {feedback && !modal && <p className={`feedback ${feedback.tipo}`} role="status">{feedback.texto}</p>}
    <div className="users-directory-section-heading"><div><span>Directorio</span><h3>Equipo institucional</h3><p role="status" aria-live="polite" aria-atomic="true">{cargando ? 'Cargando cuentas…' : `${usuariosFiltrados.length} de ${usuarios.length} usuarios visibles`}</p></div></div>
    <div className="users-directory-toolbar">
      <label><span className="users-search-icon" aria-hidden="true">⌕</span><span className="sr-only">Buscar usuario</span><input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar usuario..." /></label>
      <div className="users-role-filters" aria-label="Filtrar por rol"><button type="button" className={filtroRol === 'Todos' ? 'active' : ''} onClick={() => setFiltroRol('Todos')}>Todos</button>{ROLES.map((rol) => <button type="button" key={rol} className={filtroRol === rol ? 'active' : ''} onClick={() => setFiltroRol(rol)}>{etiquetaRol(rol)}</button>)}</div>
    </div>
    <div className="users-table-card">
      <div className="users-table-scroll" tabIndex={0} role="region" aria-label="Directorio de usuarios">
        <table className="users-directory-table">
          <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>{cargando ? Array.from({ length: 6 }, (_, index) => <tr key={`skeleton-${index}`} className="users-skeleton-row"><td><div className="users-name-cell"><Skeleton width="34px" height="34px" className="users-skeleton-avatar"/><Skeleton width="130px" height="12px"/></div></td><td><Skeleton width="180px" height="12px"/></td><td><Skeleton width="82px" height="24px" className="users-skeleton-pill"/></td><td><Skeleton width="86px" height="30px"/></td><td><Skeleton width="110px" height="12px"/></td><td /></tr>) : usuariosFiltrados.map((usuario) => <tr key={usuario.id}>
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

    {modal === 'crear' && <div className="users-modal-backdrop" role="presentation" onMouseDown={cerrarModal}><form className="users-modal users-modal--wide" role="dialog" aria-modal="true" aria-labelledby="create-user-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={crearUsuario}><header><div><span className="users-modal-kicker">Nueva cuenta</span><h3 id="create-user-title">Crear usuario</h3><p>Define la identidad, el rol y el acceso inicial.</p></div><button type="button" aria-label="Cerrar" onClick={cerrarModal}>×</button></header><div className="users-modal-body">{feedback && <p className={`feedback ${feedback.tipo}`} role="alert">{feedback.texto}</p>}<section className="users-form-section"><div className="users-form-section__heading"><span>01</span><div><strong>Datos del usuario</strong><small>Información visible en el directorio.</small></div></div><div className="users-form-grid"><UserField label="Nombre completo" value={formCrear.nombre} placeholder="Nombre y apellido" onChange={(nombre) => { setFormCrear({ ...formCrear, nombre }); setContrasenaCopiada(false); }} required /><UserField label="Correo electrónico" type="email" value={formCrear.correo} placeholder="correo@institucion.edu.co" onChange={(correo) => setFormCrear({ ...formCrear, correo })} required /><RoleField roles={rolesDisponibles} value={formCrear.rol} onChange={(rol) => setFormCrear({ ...formCrear, rol })} /></div></section><section className="users-form-section"><div className="users-form-section__heading"><span>02</span><div><strong>Acceso temporal</strong><small>Credenciales seguras para el primer ingreso.</small></div></div><label className="users-modal-field"><span>Contraseña temporal</span><div className="users-password-field"><input type={mostrarContrasena ? 'text' : 'password'} value={formCrear.contrasena} minLength={8} maxLength={128} onChange={(event) => { setFormCrear({ ...formCrear, contrasena: event.target.value }); setContrasenaCopiada(false); }} placeholder="Genera o escribe una contraseña" required /><button type="button" onClick={() => setMostrarContrasena((actual) => !actual)}>{mostrarContrasena ? 'Ocultar' : 'Ver'}</button></div><PasswordStrength {...fortalezaCrear}/><div className="users-password-actions"><button type="button" onClick={generarTemporal}>↻ Generar contraseña</button><button type="button" disabled={!formCrear.contrasena} onClick={() => void copiarContrasena()}>{contrasenaCopiada ? '✓ Copiada' : '□ Copiar'}</button></div></label><div className="users-first-login-note"><span aria-hidden="true">i</span><div><strong>Primer ingreso protegido</strong><p>La persona deberá cambiar esta contraseña al iniciar sesión. Compártela únicamente por un canal privado.</p></div></div></section></div><footer><span>Los campos marcados son obligatorios.</span><div><button type="button" onClick={cerrarModal}>Cancelar</button><button type="submit" className="primary" disabled={guardando || !formCrear.contrasena}>{guardando ? 'Creando...' : 'Crear usuario'}</button></div></footer></form></div>}

    {modal === 'editar' && usuarioEditar && <div className="users-modal-backdrop" role="presentation" onMouseDown={cerrarModal}>
      <form className="users-modal" role="dialog" aria-modal="true" aria-labelledby="edit-user-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={actualizarUsuario}>
        <header><div><span className="users-modal-kicker">Cuenta existente</span><h3 id="edit-user-title">Editar usuario</h3><p>Actualiza sus datos, rol o credenciales.</p></div><button type="button" aria-label="Cerrar" onClick={cerrarModal}>×</button></header>
        <div className="users-modal-body">
          {feedback && <p className={`feedback ${feedback.tipo}`} role="alert">{feedback.texto}</p>}
          <div className="users-edit-summary"><span className={`users-avatar users-avatar--${colorRol(usuarioEditar.rol)}`}>{iniciales(usuarioEditar.nombre)}</span><div><strong>{usuarioEditar.nombre}</strong><small>{usuarioEditar.correo} · {etiquetaRol(usuarioEditar.rol)}</small></div></div>
          <div className="users-form-section__heading"><span>01</span><div><strong>Datos y permisos</strong><small>Información actual de la cuenta.</small></div></div>
          <UserField label="Nombre completo" value={formEditar.nombre} onChange={(nombre) => setFormEditar({ ...formEditar, nombre })} required />
          <UserField label="Correo electrónico" type="email" value={formEditar.correo} onChange={(correo) => setFormEditar({ ...formEditar, correo })} required />
          <RoleField roles={rolesDisponibles.includes(formEditar.rol) ? rolesDisponibles : [formEditar.rol, ...rolesDisponibles]} value={formEditar.rol} disabled={usuarioEditar.id === currentUserId || (usuarioEditar.rol === 'Admin' && currentRole !== 'admin')} onChange={(rol) => setFormEditar({ ...formEditar, rol })} />
          {usuarioEditar.id === currentUserId && <p className="users-current-account-note">No puedes cambiar tu rol. Al guardar tendrás que iniciar sesión nuevamente.</p>}
          <div className="users-form-section__heading"><span>02</span><div><strong>Restablecer contraseña</strong><small>Opcional; revocará las sesiones anteriores.</small></div></div>
          <label className="users-modal-field" htmlFor="edit-user-password"><span>Nueva contraseña (opcional)</span></label>
          <div className="users-password-field">
            <input id="edit-user-password" type={mostrarContrasena ? 'text' : 'password'} autoComplete="new-password" value={formEditar.contrasena} minLength={8} maxLength={128} disabled={guardando} aria-describedby="edit-password-help" onChange={(event) => setFormEditar({ ...formEditar, contrasena: event.target.value })} />
            <button type="button" aria-label={mostrarContrasena ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'} aria-pressed={mostrarContrasena} onClick={() => setMostrarContrasena((actual) => !actual)}>{mostrarContrasena ? 'Ocultar' : 'Ver'}</button>
          </div>
          {formEditar.contrasena && <PasswordStrength {...fortalezaEditar}/>}
          <p className="users-current-account-note" id="edit-password-help">Déjala vacía para conservar la actual. Usa entre 8 y 128 caracteres, con letras y números. El cambio cierra las sesiones anteriores del usuario y exige crear una contraseña propia al ingresar.</p>
          <label className="users-modal-field" htmlFor="edit-user-password-confirm"><span>Confirmar nueva contraseña</span></label>
          <div className="users-password-field">
            <input id="edit-user-password-confirm" type={mostrarConfirmacion ? 'text' : 'password'} autoComplete="new-password" value={confirmarContrasena} required={Boolean(formEditar.contrasena)} maxLength={128} disabled={guardando} onChange={(event) => setConfirmarContrasena(event.target.value)} />
            <button type="button" aria-label={mostrarConfirmacion ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'} aria-pressed={mostrarConfirmacion} onClick={() => setMostrarConfirmacion((actual) => !actual)}>{mostrarConfirmacion ? 'Ocultar' : 'Ver'}</button>
          </div>
        </div>
        <footer><span>Los cambios de acceso se aplican de inmediato.</span><div><button type="button" onClick={cerrarModal}>Cancelar</button><button type="submit" className="primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar cambios'}</button></div></footer>
      </form>
    </div>}

    {usuarioEliminar && <div className="users-modal-backdrop" role="presentation" onMouseDown={() => !guardando && setUsuarioEliminar(null)}><div className="users-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-user-title" onMouseDown={(event) => event.stopPropagation()}><span className="users-delete-icon" aria-hidden="true">!</span><h3 id="delete-user-title">¿Eliminar usuario?</h3><p>Se eliminará la cuenta de <strong>{usuarioEliminar.nombre}</strong>. La cuenta desaparecerá del directorio y perderá el acceso. Sus reportes, salidas y registros de auditoría conservarán el nombre del autor; sus grupos quedarán sin director y sus notificaciones se borrarán.</p><div><button type="button" disabled={guardando} onClick={() => setUsuarioEliminar(null)}>Cancelar</button><button type="button" className="danger" disabled={guardando} onClick={() => void eliminarUsuario()}>{guardando ? 'Eliminando...' : 'Eliminar usuario'}</button></div></div></div>}
  </section>;
}

function UserField({ label, value, onChange, type = 'text', placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return <label className="users-modal-field"><span>{label}</span><input type={type} value={value} placeholder={placeholder} required={required} onChange={(event) => onChange(event.target.value)} /></label>;
}

function RoleField({ roles, value, onChange, disabled = false }: { roles: RolUsuario[]; value: RolUsuario; onChange: (value: RolUsuario) => void; disabled?: boolean }) {
  return <label className="users-modal-field"><span>Rol</span><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as RolUsuario)}>{roles.map((rol) => <option key={rol} value={rol}>{etiquetaRol(rol)}</option>)}</select></label>;
}

function PasswordStrength({ nivel, texto }: { nivel: number; texto: string }) {
  return <div className={`users-password-strength users-password-strength--${nivel}`}><div aria-hidden="true"><i/><i/><i/></div><span>{texto}</span></div>;
}
