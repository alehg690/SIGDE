'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { Estudiante, EstudianteFormData } from '@/types/students';

const EMPTY_FORM: EstudianteFormData = {
  nombre: '',
  documento: '',
  grado: '',
  grupo: '',
  estado: 'Activo',
  activo: true,
  acudienteNombre: '',
  acudienteDocumento: '',
  acudienteTelefono: '',
  acudienteCorreo: '',
};

type Feedback = { tipo: 'success' | 'error'; texto: string };

async function apiError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : fallback;
}

function studentToForm(estudiante: Estudiante): EstudianteFormData {
  return {
    nombre: estudiante.nombre,
    documento: estudiante.documento ?? '',
    grado: estudiante.grado,
    grupo: estudiante.grupo,
    estado: estudiante.estado,
    activo: estudiante.activo,
    acudienteNombre: estudiante.acudiente.nombre,
    acudienteDocumento: estudiante.acudiente.documento ?? '',
    acudienteTelefono: estudiante.acudiente.telefono ?? '',
    acudienteCorreo: estudiante.acudiente.correo ?? '',
  };
}

export default function StudentsWorkspace({ canManage }: { canManage: boolean }) {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);
  const [formCrear, setFormCrear] = useState<EstudianteFormData>(EMPTY_FORM);
  const [formEditar, setFormEditar] = useState<EstudianteFormData>(EMPTY_FORM);
  const [busqueda, setBusqueda] = useState('');
  const [filtroGrado, setFiltroGrado] = useState('Todos');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [confirmandoArchivo, setConfirmandoArchivo] = useState(false);
  const [mensaje, setMensaje] = useState<Feedback | null>(null);

  const seleccionado = estudiantes.find((item) => item.id === seleccionadoId) ?? estudiantes[0] ?? null;
  const grados = useMemo(
    () => [...new Set(estudiantes.map((item) => item.grado))].sort((a, b) => a.localeCompare(b, 'es')),
    [estudiantes]
  );
  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    return estudiantes.filter((item) => {
      const coincideGrado = filtroGrado === 'Todos' || item.grado === filtroGrado;
      const contenido = [
        item.nombre,
        item.documento,
        item.grado,
        item.grupo,
        item.acudiente.nombre,
        item.acudiente.documento,
        item.acudiente.telefono,
        item.acudiente.correo,
      ].filter(Boolean).join(' ').toLocaleLowerCase('es');
      return coincideGrado && contenido.includes(termino);
    });
  }, [busqueda, estudiantes, filtroGrado]);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const response = await fetch('/api/estudiantes', { cache: 'no-store' });
        if (!response.ok) throw new Error(await apiError(response, 'No se pudieron cargar los estudiantes.'));
        const data = await response.json() as Estudiante[];
        if (!activo) return;
        setEstudiantes(data);
        setSeleccionadoId(data[0]?.id ?? null);
        if (data[0]) setFormEditar(studentToForm(data[0]));
      } catch (error) {
        if (activo) setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudieron cargar los estudiantes.' });
      } finally {
        if (activo) setCargando(false);
      }
    }

    void cargar();
    return () => { activo = false; };
  }, []);

  function seleccionar(estudiante: Estudiante) {
    setSeleccionadoId(estudiante.id);
    setFormEditar(studentToForm(estudiante));
    setConfirmandoArchivo(false);
    setMensaje(null);
  }

  async function recargar(preferredId?: number) {
    const response = await fetch('/api/estudiantes', { cache: 'no-store' });
    if (!response.ok) throw new Error(await apiError(response, 'No se pudo actualizar el directorio.'));
    const data = await response.json() as Estudiante[];
    const targetId = preferredId ?? seleccionadoId ?? data[0]?.id ?? null;
    const target = data.find((item) => item.id === targetId) ?? data[0] ?? null;
    setEstudiantes(data);
    setSeleccionadoId(target?.id ?? null);
    setFormEditar(target ? studentToForm(target) : EMPTY_FORM);
  }

  function validarContacto(form: EstudianteFormData) {
    if (form.acudienteTelefono.trim() || form.acudienteCorreo.trim()) return true;
    setMensaje({ tipo: 'error', texto: 'Registra al menos el teléfono o el correo del acudiente.' });
    return false;
  }

  async function crear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !validarContacto(formCrear)) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const response = await fetch('/api/estudiantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCrear),
      });
      if (!response.ok) throw new Error(await apiError(response, 'No se pudo crear el registro.'));
      const created = await response.json() as Estudiante;
      setFormCrear(EMPTY_FORM);
      await recargar(created.id);
      setMensaje({ tipo: 'success', texto: 'Estudiante y acudiente registrados correctamente.' });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo crear el registro.' });
    } finally {
      setGuardando(false);
    }
  }

  async function actualizar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !seleccionado || !validarContacto(formEditar)) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const response = await fetch(`/api/estudiantes/${seleccionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formEditar),
      });
      if (!response.ok) throw new Error(await apiError(response, 'No se pudo actualizar el registro.'));
      const updated = await response.json() as Estudiante;
      await recargar(updated.id);
      setMensaje({ tipo: 'success', texto: 'Estudiante y acudiente actualizados correctamente.' });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo actualizar el registro.' });
    } finally {
      setGuardando(false);
    }
  }

  async function archivar() {
    if (!canManage || !seleccionado) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const response = await fetch(`/api/estudiantes/${seleccionado.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await apiError(response, 'No se pudo archivar el estudiante.'));
      const nombre = seleccionado.nombre;
      setConfirmandoArchivo(false);
      setSeleccionadoId(null);
      await recargar();
      setMensaje({ tipo: 'success', texto: `${nombre} fue archivado correctamente.` });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo archivar el estudiante.' });
    } finally {
      setGuardando(false);
    }
  }

  const acudientesContactables = estudiantes.filter((item) => item.acudiente.telefono || item.acudiente.correo).length;

  return (
    <section className="workspace-panel students-users-style">
      <div className="module-title"><h2>Estudiantes y acudientes</h2><p>Administración del directorio estudiantil y sus contactos responsables.</p></div>
      {mensaje && <p className={`feedback ${mensaje.tipo}`} role="status">{mensaje.texto}</p>}

      <div className="user-summary-grid students-summary-grid" aria-label="Resumen del directorio">
        <div className="user-role-card"><strong>{estudiantes.length}</strong><span>Estudiantes</span></div>
        <div className="user-role-card"><strong>{estudiantes.length}</strong><span>Acudientes</span></div>
        <div className="user-role-card"><strong>{grados.length}</strong><span>Grados</span></div>
        <div className="user-role-card user-role-card--active"><strong>{acudientesContactables}</strong><span>Contactables</span></div>
      </div>

      <div className="users-workspace-grid students-management-grid">
        <div className="user-list-panel">
          <div className="user-toolbar students-user-toolbar">
            <label><span>Buscar estudiante o acudiente</span><input type="search" value={busqueda} placeholder="Nombre, documento, curso o contacto" onChange={(event) => setBusqueda(event.target.value)} /></label>
            <label><span>Grado</span><select value={filtroGrado} onChange={(event) => setFiltroGrado(event.target.value)}><option>Todos</option>{grados.map((grado) => <option key={grado}>{grado}</option>)}</select></label>
            <small>{cargando ? 'Cargando...' : `${filtrados.length} registros`}</small>
          </div>
          <div className="user-list" aria-live="polite">
            {!cargando && filtrados.length === 0 && <span className="empty-inline">No hay estudiantes para mostrar.</span>}
            {filtrados.map((item) => (
              <article className={seleccionado?.id === item.id ? 'student-list-row student-list-row--active' : 'student-list-row'} key={item.id}>
                <button type="button" onClick={() => seleccionar(item)}><strong>{item.nombre}</strong><span>{item.documento || 'Documento no registrado'}</span></button>
                <span><strong>{item.grado} - {item.grupo}</strong><small>Curso</small></span>
                <span><strong>{item.acudiente.nombre}</strong><small>{item.acudiente.telefono || item.acudiente.correo || 'Sin contacto'}</small></span>
                <button type="button" onClick={() => seleccionar(item)}>{canManage ? 'Gestionar' : 'Consultar'}</button>
              </article>
            ))}
          </div>
        </div>

        <form className="user-form-panel student-manage-panel" onSubmit={actualizar}>
          <div className="module-title"><h2>Gestionar estudiante</h2><p>Edita sus datos y la información del acudiente.</p></div>
          {seleccionado ? <>
            <StudentFields form={formEditar} setForm={setFormEditar} prefix="edit" compact />
            <button className="primary-button" type="submit" disabled={!canManage || guardando}>{guardando ? 'Guardando...' : 'Guardar cambios'}</button>
            {canManage && (confirmandoArchivo ? <div className="archive-confirm"><p>¿Archivar a {seleccionado.nombre}?</p><button type="button" onClick={() => setConfirmandoArchivo(false)}>Cancelar</button><button type="button" disabled={guardando} onClick={() => void archivar()}>Confirmar</button></div> : <button className="archive-button" type="button" onClick={() => setConfirmandoArchivo(true)}>Archivar estudiante</button>)}
          </> : <p className="empty-inline">Selecciona un estudiante para gestionarlo.</p>}
          {!canManage && <p className="readonly-note">Tu rol permite consultar el directorio, pero solo Coordinación puede modificarlo.</p>}
        </form>
      </div>

      {canManage && <form className="user-form-panel user-form-panel--create student-create-panel" onSubmit={crear}>
        <div className="module-title"><h2>Crear estudiante y acudiente</h2><p>Registra ambos perfiles y deja su vínculo listo desde el inicio.</p></div>
        <StudentFields form={formCrear} setForm={setFormCrear} prefix="create" />
        <button className="secondary-button" type="submit" disabled={guardando}>{guardando ? 'Creando...' : 'Crear estudiante'}</button>
      </form>}
    </section>
  );
}

function StudentFields({ form, setForm, prefix, compact = false }: {
  form: EstudianteFormData;
  setForm: (form: EstudianteFormData) => void;
  prefix: string;
  compact?: boolean;
}) {
  const update = <K extends keyof EstudianteFormData>(key: K, value: EstudianteFormData[K]) => setForm({ ...form, [key]: value });
  return <div className={compact ? 'student-fields student-fields--compact' : 'student-fields'}>
    <fieldset><legend>Estudiante</legend><div>
      <StudentInput id={`${prefix}-student-name`} label="Nombre" value={form.nombre} onChange={(value) => update('nombre', value)} required />
      <StudentInput id={`${prefix}-student-document`} label="Documento" value={form.documento} onChange={(value) => update('documento', value)} inputMode="numeric" />
      <StudentInput id={`${prefix}-student-grade`} label="Grado" value={form.grado} onChange={(value) => update('grado', value)} required />
      <StudentInput id={`${prefix}-student-group`} label="Grupo" value={form.grupo} onChange={(value) => update('grupo', value)} required />
      <label htmlFor={`${prefix}-student-state`}><span>Estado</span><select id={`${prefix}-student-state`} value={form.estado} onChange={(event) => update('estado', event.target.value)}><option>Activo</option><option>En seguimiento</option><option>Retirado</option></select></label>
    </div></fieldset>
    <fieldset><legend>Acudiente</legend><div>
      <StudentInput id={`${prefix}-guardian-name`} label="Nombre" value={form.acudienteNombre} onChange={(value) => update('acudienteNombre', value)} required />
      <StudentInput id={`${prefix}-guardian-document`} label="Documento" value={form.acudienteDocumento} onChange={(value) => update('acudienteDocumento', value)} inputMode="numeric" />
      <StudentInput id={`${prefix}-guardian-phone`} label="Teléfono" value={form.acudienteTelefono} onChange={(value) => update('acudienteTelefono', value)} inputMode="tel" />
      <StudentInput id={`${prefix}-guardian-email`} label="Correo" value={form.acudienteCorreo} onChange={(value) => update('acudienteCorreo', value)} type="email" />
    </div></fieldset>
  </div>;
}

function StudentInput({ id, label, value, onChange, required = false, type = 'text', inputMode }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  inputMode?: 'numeric' | 'tel';
}) {
  return <label htmlFor={id}><span>{label}</span><input id={id} type={type} inputMode={inputMode} value={value} onChange={(event) => onChange(event.target.value)} required={required} autoComplete="off" /></label>;
}
