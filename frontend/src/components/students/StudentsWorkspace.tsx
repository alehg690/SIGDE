"use client";

import ReportsWorkspace from "@/components/reports/ReportsWorkspace";
import ModuleHeader from "@/components/ui/ModuleHeader";
import KpiGrid from "@/components/ui/KpiGrid";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  etiquetaGrupoAcademico,
  GRUPOS_ACADEMICOS,
} from "@/lib/academic-groups";
import type { Estudiante, EstudianteFormData } from "@/types/students";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { DOCUMENT_TYPES, RELATIONSHIPS } from "@/lib/identity-options";
import { coincideBusqueda } from "@/lib/search-normalization";

type Feedback = { tipo: "success" | "error"; texto: string };
const ESTADOS = ["Activo", "Desescolarizado", "Egresado", "Retirado/a"];
const PAGE_SIZE = 25;
const EMPTY_FORM: EstudianteFormData = {
  primerNombre: "",
  segundoNombre: "",
  primerApellido: "",
  segundoApellido: "",
  tipoDocumento: "TI",
  documento: "",
  correo: "",
  grado: "",
  grupo: "",
  jornada: "",
  estado: "Activo",
  activo: true,
  acudientePrimerNombre: "",
  acudienteSegundoNombre: "",
  acudientePrimerApellido: "",
  acudienteSegundoApellido: "",
  acudienteTipoDocumento: "CC",
  acudienteDocumento: "",
  acudienteParentesco: "",
  acudienteTelefono: "",
  acudienteCorreo: "",
};

async function apiError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : fallback;
}

function dividirNombre(nombre: string) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length >= 4)
    return {
      primerNombre: partes[0],
      segundoNombre: partes.slice(1, -2).join(" "),
      primerApellido: partes.at(-2) || "",
      segundoApellido: partes.at(-1) || "",
    };
  if (partes.length === 3)
    return {
      primerNombre: partes[0],
      segundoNombre: "",
      primerApellido: partes[1],
      segundoApellido: partes[2],
    };
  return {
    primerNombre: partes[0] || "",
    segundoNombre: "",
    primerApellido: partes[1] || "",
    segundoApellido: "",
  };
}

function studentToForm(estudiante: Estudiante): EstudianteFormData {
  const estudianteNombre = estudiante.primerNombre
    ? {
        primerNombre: estudiante.primerNombre,
        segundoNombre: estudiante.segundoNombre || "",
        primerApellido: estudiante.primerApellido || "",
        segundoApellido: estudiante.segundoApellido || "",
      }
    : dividirNombre(estudiante.nombre);
  const acudienteNombre = estudiante.acudiente.primerNombre
    ? {
        primerNombre: estudiante.acudiente.primerNombre,
        segundoNombre: estudiante.acudiente.segundoNombre || "",
        primerApellido: estudiante.acudiente.primerApellido || "",
        segundoApellido: estudiante.acudiente.segundoApellido || "",
      }
    : dividirNombre(estudiante.acudiente.nombre);
  return {
    ...estudianteNombre,
    tipoDocumento: estudiante.tipoDocumento || "TI",
    documento: estudiante.documento || "",
    correo: estudiante.correo || "",
    grado: estudiante.grado.replace("°", ""),
    grupo: estudiante.grupo,
    jornada: estudiante.jornada,
    estado: ESTADOS.includes(estudiante.estado)
      ? estudiante.estado
      : estudiante.activo
        ? "Activo"
        : "Desescolarizado",
    activo: estudiante.activo,
    acudientePrimerNombre: acudienteNombre.primerNombre,
    acudienteSegundoNombre: acudienteNombre.segundoNombre,
    acudientePrimerApellido: acudienteNombre.primerApellido,
    acudienteSegundoApellido: acudienteNombre.segundoApellido,
    acudienteTipoDocumento: estudiante.acudiente.tipoDocumento || "CC",
    acudienteDocumento: estudiante.acudiente.documento || "",
    acudienteParentesco: estudiante.acudiente.parentesco || "",
    acudienteTelefono: estudiante.acudiente.telefono || "",
    acudienteCorreo: estudiante.acudiente.correo || "",
  };
}

function iniciales(nombre: string) {
  const partes = nombre.split(/\s+/).filter(Boolean);
  const apellido = partes.length > 2 ? partes.at(-2) : partes.at(-1);
  return `${partes[0]?.[0] || "E"}${apellido?.[0] || ""}`.toUpperCase();
}

export default function StudentsWorkspace({
  canManage,
  currentUserId,
}: {
  canManage: boolean;
  currentUserId: number;
}) {
  const [historial, setHistorial] = useState<Estudiante | null>(null);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroGrado, setFiltroGrado] = useState("Todos");
  const [filtroGrupo, setFiltroGrupo] = useState("Todos");
  const [filtroJornada, setFiltroJornada] = useState("Todas");
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState<"crear" | "editar" | null>(null);
  const [form, setForm] = useState<EstudianteFormData>(EMPTY_FORM);
  const [editando, setEditando] = useState<Estudiante | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [archivar, setArchivar] = useState<Estudiante | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<Feedback | null>(null);
  const formularioInicial = useRef("");
  useDialogFocus<HTMLElement>(Boolean(modal || archivar), () => {
    if (modal) cerrarModal();
    else setArchivar(null);
  }, !guardando);

  async function cargar() {
    const response = await fetch("/api/estudiantes", { cache: "no-store" });
    if (!response.ok)
      throw new Error(
        await apiError(response, "No se pudieron cargar los estudiantes."),
      );
    setEstudiantes((await response.json()) as Estudiante[]);
  }

  useEffect(() => {
    let activo = true;
    const timer = window.setTimeout(() => {
      void cargar()
        .catch((error) => {
          if (activo)
            setMensaje({
              tipo: "error",
              texto:
                error instanceof Error
                  ? error.message
                  : "No se pudo abrir el módulo.",
            });
        })
        .finally(() => {
          if (activo) setCargando(false);
        });
    }, 0);
    return () => {
      activo = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (mensaje?.tipo !== "success" || modal) return;
    const timer = window.setTimeout(() => {
      setMensaje((actual) => actual?.tipo === "success" ? null : actual);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [mensaje, modal]);

  const filtrados = useMemo(() => {
    return estudiantes.filter((item) => {
      const grupo = etiquetaGrupoAcademico(item.grado, item.grupo);
      return (
        (filtroEstado === "Todos" || item.estado === filtroEstado) &&
        (filtroGrado === "Todos" || item.grado.replace("°", "") === filtroGrado) &&
        (filtroGrupo === "Todos" || grupo === filtroGrupo) &&
        (filtroJornada === "Todas" || item.jornada === filtroJornada) &&
        coincideBusqueda(busqueda, [item.nombre, item.correo, item.documento, grupo])
      );
    });
  }, [busqueda, estudiantes, filtroEstado, filtroGrado, filtroGrupo, filtroJornada]);

  const resumen = useMemo(() => ({
    total: estudiantes.length,
    activos: estudiantes.filter((item) => item.estado === "Activo").length,
    desescolarizados: estudiantes.filter((item) => item.estado === "Desescolarizado").length,
    otros: estudiantes.filter((item) => !["Activo", "Desescolarizado"].includes(item.estado)).length,
  }), [estudiantes]);

  const gruposDisponibles = useMemo(() => GRUPOS_ACADEMICOS.filter((item) =>
    filtroGrado === "Todos" || item.grado === filtroGrado
  ), [filtroGrado]);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const estudiantesVisibles = filtrados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  function abrirCrear() {
    setForm(EMPTY_FORM);
    formularioInicial.current = JSON.stringify(EMPTY_FORM);
    setEditando(null);
    setMensaje(null);
    setModal("crear");
  }
  function abrirEditar(estudiante: Estudiante) {
    const siguienteFormulario = studentToForm(estudiante);
    setForm(siguienteFormulario);
    formularioInicial.current = JSON.stringify(siguienteFormulario);
    setEditando(estudiante);
    setMenuId(null);
    setMensaje(null);
    setModal("editar");
  }
  function cerrarModal() {
    if (!guardando) {
      const tieneCambios = JSON.stringify(form) !== formularioInicial.current;
      if (tieneCambios && !window.confirm("Hay cambios sin guardar. ¿Quieres cerrar el formulario?")) return;
      setModal(null);
      setEditando(null);
    }
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const response = await fetch(
        editando ? `/api/estudiantes/${editando.id}` : "/api/estudiantes",
        {
          method: editando ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      if (!response.ok)
        throw new Error(
          await apiError(response, "No se pudo guardar el estudiante."),
        );
      await cargar();
      setModal(null);
      setEditando(null);
      setMensaje({
        tipo: "success",
        texto: editando
          ? "Estudiante y acudiente actualizados correctamente."
          : "Estudiante y acudiente registrados correctamente.",
      });
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          error instanceof Error
            ? error.message
            : "No se pudo guardar el estudiante.",
      });
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarArchivo() {
    if (!archivar) return;
    setGuardando(true);
    setMensaje(null);
    try {
      const response = await fetch(`/api/estudiantes/${archivar.id}`, {
        method: "DELETE",
      });
      if (!response.ok)
        throw new Error(
          await apiError(response, "No se pudo archivar el estudiante."),
        );
      await cargar();
      setMensaje({
        tipo: "success",
        texto: `${archivar.nombre} fue archivado correctamente.`,
      });
      setArchivar(null);
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          error instanceof Error
            ? error.message
            : "No se pudo archivar el estudiante.",
      });
    } finally {
      setGuardando(false);
    }
  }

  if (historial) return <section className="student-history-workspace ui-workspace">
    <ModuleHeader
      kicker="Expediente del estudiante"
      title={historial.nombre}
      description={`${etiquetaGrupoAcademico(historial.grado, historial.grupo)} · Jornada ${historial.jornada} · ${historial.estado}`}
      icon={<span className="student-history-avatar">{iniciales(historial.nombre)}</span>}
      action={<button type="button" className="ui-button ui-button--secondary" onClick={() => setHistorial(null)}>← Volver al directorio</button>}
    />
    <ReportsWorkspace key={historial.id} currentUserId={currentUserId} canManage={canManage} estudianteId={historial.id} />
  </section>;

  return (
    <section
      className="students-directory-workspace ui-workspace"
      onClick={() => setMenuId(null)}
    >
      <ModuleHeader
        kicker="Gestión académica"
        title="Directorio de estudiantes"
        description="Consulta la información académica, el estado y el historial institucional de cada estudiante."
        icon={<svg viewBox="0 0 24 24"><path d="m3 9 9-5 9 5-9 5z"/><path d="M7 11.2V16c2.8 2 7.2 2 10 0v-4.8M21 9v6"/></svg>}
        action={canManage ? (
          <button
            type="button"
            className="ui-button ui-button--primary students-create-action"
            onClick={(event) => {
              event.stopPropagation();
              abrirCrear();
            }}
          >
            <span aria-hidden="true">＋</span> Nuevo estudiante
          </button>
        ) : undefined}
      />
      <KpiGrid label="Resumen de estudiantes" items={[
        { label: "Total", value: cargando ? "—" : resumen.total, detail: "En el directorio actual", icon: <svg viewBox="0 0 24 24"><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20"/><circle cx="10" cy="8" r="4"/><path d="M17 11a3 3 0 0 1 3 3v1"/></svg> },
        { label: "Activos", value: cargando ? "—" : resumen.activos, detail: "Con matrícula activa", icon: <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg> },
        { label: "Desescolarizados", value: cargando ? "—" : resumen.desescolarizados, detail: "Requieren seguimiento", icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/></svg> },
        { label: "Otros estados", value: cargando ? "—" : resumen.otros, detail: "Egresados o retirados", icon: <svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8m-8 4h8m-8 4h5"/></svg> },
      ]} />
      {mensaje && !modal && (
        <p className={`feedback ${mensaje.tipo}`} role="status">
          {mensaje.texto}
        </p>
      )}
      <div className="students-directory-toolbar">
        <label className="students-search-field">
          <span aria-hidden="true">⌕</span>
          <span className="sr-only">Buscar estudiante</span>
          <input
            type="search"
            value={busqueda}
            onChange={(event) => { setBusqueda(event.target.value); setPagina(1); }}
            placeholder={canManage ? "Buscar por nombre o documento..." : "Buscar por nombre o grupo..."}
          />
        </label>
        <label>
          <span className="students-filter-label">Estado</span>
          <select value={filtroEstado} onChange={(event) => { setFiltroEstado(event.target.value); setPagina(1); }}>
            <option value="Todos">Todos</option>
            {ESTADOS.map((estado) => <option key={estado}>{estado}</option>)}
          </select>
        </label>
        <label>
          <span className="students-filter-label">Grado</span>
          <select value={filtroGrado} onChange={(event) => { setFiltroGrado(event.target.value); setFiltroGrupo("Todos"); setPagina(1); }}>
            <option value="Todos">Todos</option>
            {["6", "7", "8", "9", "10", "11"].map((grado) => <option key={grado}>{grado}°</option>)}
          </select>
        </label>
        <label>
          <span className="students-filter-label">Grupo</span>
          <span className="sr-only">Filtrar por grupo</span>
          <select
            value={filtroGrupo}
            onChange={(event) => { setFiltroGrupo(event.target.value); setPagina(1); }}
          >
            <option value="Todos">Todos</option>
            {gruposDisponibles.map((grupo) => (
              <option key={grupo.etiqueta}>{grupo.etiqueta}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="students-filter-label">Jornada</span>
          <select value={filtroJornada} onChange={(event) => { setFiltroJornada(event.target.value); setPagina(1); }}>
            <option value="Todas">Todas</option>
            <option>Mañana</option>
            <option>Tarde</option>
          </select>
        </label>
      </div>
      <div className="students-table-card">
        <div className="students-table-scroll" tabIndex={0} role="region" aria-label="Directorio de estudiantes">
          <table className="students-directory-table">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Documento</th>
                <th>Grupo</th>
                <th>Estado</th>
                <th>Novedades</th>
                <th>Salidas</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {cargando && Array.from({ length: 5 }, (_, index) => (
                <tr className="students-loading-row" key={`loading-${index}`} aria-hidden="true">
                  <td><span /></td><td><span /></td><td><span /></td><td><span /></td><td><span /></td><td><span /></td><td /></tr>
              ))}
              {estudiantesVisibles.map((estudiante) => (
                <tr key={estudiante.id}>
                  <td>
                    <div className="students-name-cell">
                      <span>{iniciales(estudiante.nombre)}</span>
                      <div>
                        <strong>{estudiante.nombre}</strong>
                        <small>{canManage ? estudiante.correo || "Correo pendiente" : "Información personal restringida"}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    {canManage ? <><small>{estudiante.tipoDocumento || "—"}</small>{" "}{estudiante.documento || "Sin registrar"}</> : "Restringido"}
                  </td>
                  <td>
                    <span className="students-group-badge">
                      {etiquetaGrupoAcademico(estudiante.grado, estudiante.grupo)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`students-state students-state--${estudiante.estado.toLocaleLowerCase("es")}`}
                    >
                      <i />
                      {estudiante.estado}
                    </span>
                  </td>
                  <td>{estudiante.novedades}</td>
                  <td>{estudiante.salidas}</td>
                  <td className="students-actions-cell">
                    <button
                      type="button"
                      aria-label={`Acciones de ${estudiante.nombre}`}
                      aria-expanded={menuId === estudiante.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        setMenuId(
                          menuId === estudiante.id ? null : estudiante.id,
                        );
                      }}
                    >
                      •••
                    </button>
                    {menuId === estudiante.id && (
                      <div
                        className="students-row-menu"
                        role="menu"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button type="button" role="menuitem" onClick={() => { setHistorial(estudiante); setMenuId(null); }}>
                          Ver historial de reportes
                        </button>
                        {canManage && <>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => abrirEditar(estudiante)}
                        >
                          ✎ Editar
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="danger"
                          onClick={() => {
                            setArchivar(estudiante);
                            setMenuId(null);
                          }}
                        >
                          ⌫ Archivar
                        </button>
                        </>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!cargando && filtrados.length === 0 && (
            <div className="students-directory-empty">
              <span className="students-empty-icon" aria-hidden="true">⌕</span>
              <strong>No hay estudiantes para mostrar</strong>
              <p>Prueba otra búsqueda o selecciona un grupo diferente.</p>
            </div>
          )}
        </div>
        {!cargando && filtrados.length > 0 && <footer className="students-table-footer">
          <span>Mostrando {(pagina - 1) * PAGE_SIZE + 1}–{Math.min(pagina * PAGE_SIZE, filtrados.length)} de {filtrados.length}</span>
          <div>
            <button type="button" disabled={pagina === 1} onClick={() => setPagina((actual) => Math.max(1, actual - 1))}>← Anterior</button>
            <strong>{pagina} / {totalPaginas}</strong>
            <button type="button" disabled={pagina === totalPaginas} onClick={() => setPagina((actual) => Math.min(totalPaginas, actual + 1))}>Siguiente →</button>
          </div>
        </footer>}
      </div>

      {modal && (
        <div
          className="students-modal-backdrop"
          role="presentation"
          onMouseDown={cerrarModal}
        >
          <form
            className="students-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={guardar}
          >
            <header>
              <div className="students-modal-heading">
                <span aria-hidden="true">{modal === "crear" ? "+" : "✎"}</span>
                <div>
                <h3 id="student-modal-title">
                  {modal === "crear"
                    ? "Registrar estudiante"
                    : "Editar estudiante"}
                </h3>
                <p>
                  {modal === "crear" ? "Completa la información académica y del acudiente principal." : `Actualiza la información de ${editando?.nombre || "este estudiante"}.`}
                </p>
                </div>
              </div>
              <button type="button" aria-label="Cerrar" onClick={cerrarModal}>
                ×
              </button>
            </header>
            <div className="students-modal-body">
              {mensaje?.tipo === "error" && (
                <p className="feedback error" role="alert">
                  {mensaje.texto}
                </p>
              )}
              <StudentFormFields form={form} setForm={setForm} />
            </div>
            <footer>
              <p><strong>{modal === "crear" ? "Nuevo registro" : "Edición de estudiante"}</strong><span>Los campos marcados son obligatorios.</span></p>
              <button type="button" onClick={cerrarModal}>
                Cancelar
              </button>
              <button type="submit" className="primary" disabled={guardando}>
                {guardando
                  ? "Guardando..."
                  : modal === "crear"
                    ? "✓  Registrar estudiante"
                    : "✓  Guardar cambios"}
              </button>
            </footer>
          </form>
        </div>
      )}

      {archivar && (
        <div
          className="students-modal-backdrop"
          role="presentation"
          onMouseDown={() => !guardando && setArchivar(null)}
        >
          <div
            className="students-archive-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="archive-student-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span aria-hidden="true">!</span>
            <h3 id="archive-student-title">¿Archivar estudiante?</h3>
            <p>
              <strong>{archivar.nombre}</strong> dejará de aparecer en los
              directorios, pero se conservarán sus reportes y salidas.
            </p>
            <div>
              <button type="button" onClick={() => setArchivar(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="danger"
                disabled={guardando}
                onClick={() => void confirmarArchivo()}
              >
                {guardando ? "Archivando..." : "Archivar estudiante"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StudentFormFields({
  form,
  setForm,
}: {
  form: EstudianteFormData;
  setForm: (form: EstudianteFormData) => void;
}) {
  const update = <K extends keyof EstudianteFormData>(
    key: K,
    value: EstudianteFormData[K],
  ) => setForm({ ...form, [key]: value });
  const grupoSeleccionado =
    form.grado && form.grupo
      ? etiquetaGrupoAcademico(form.grado, form.grupo)
      : "";
  function seleccionarGrupo(etiqueta: string) {
    const grupo = GRUPOS_ACADEMICOS.find((item) => item.etiqueta === etiqueta);
    if (grupo)
      setForm({
        ...form,
        grado: grupo.grado,
        grupo: grupo.grupo,
        jornada: grupo.jornada,
      });
  }
  return (
    <>
      <fieldset>
        <legend>
          <span>1</span><div>Información personal<small>Identificación y datos de contacto</small></div>
        </legend>
        <div className="students-fields-grid">
          <Field
            label="Primer nombre"
            value={form.primerNombre}
            onChange={(value) => update("primerNombre", value)}
            required
          />
          <Field
            label="Segundo nombre"
            value={form.segundoNombre}
            onChange={(value) => update("segundoNombre", value)}
            optional
          />
          <Field
            label="Primer apellido"
            value={form.primerApellido}
            onChange={(value) => update("primerApellido", value)}
            required
          />
          <Field
            label="Segundo apellido"
            value={form.segundoApellido}
            onChange={(value) => update("segundoApellido", value)}
            required
          />
          <SelectField
            label="Tipo de documento"
            value={form.tipoDocumento}
            onChange={(value) => update("tipoDocumento", value)}
            options={DOCUMENT_TYPES.map((item) => [...item])}
            required
          />
          <Field
            label="Documento"
            value={form.documento}
            onChange={(value) => update("documento", value)}
            inputMode="numeric"
            required
          />
          <Field
            label="Correo institucional"
            value={form.correo}
            onChange={(value) => update("correo", value)}
            type="email"
            required
          />
        </div>
      </fieldset>
      <fieldset>
        <legend>
          <span>2</span><div>Información académica<small>Grupo, jornada y estado actual</small></div>
        </legend>
        <div className="students-fields-grid students-fields-grid--academic">
          <SelectField
            label="Grupo"
            value={grupoSeleccionado}
            onChange={seleccionarGrupo}
            options={GRUPOS_ACADEMICOS.map((item) => [
              item.etiqueta,
              item.etiqueta,
            ])}
            placeholder="Selecciona el grupo"
            required
          />
          <label className="students-modal-field">
            <span>
              Jornada <small>Automática</small>
            </span>
            <input
              value={form.jornada}
              placeholder="Se completa al seleccionar el grupo"
              readOnly
            />
          </label>
          <SelectField
            label="Estado"
            value={form.estado}
            onChange={(value) => {
              update("estado", value);
            }}
            options={ESTADOS.map((item) => [item, item])}
            required
          />
        </div>
      </fieldset>
      <fieldset>
        <legend>
          <span>3</span><div>Acudiente principal<small>Responsable y datos de contacto</small></div>
        </legend>
        <div className="students-fields-grid">
          <Field
            label="Primer nombre"
            value={form.acudientePrimerNombre}
            onChange={(value) => update("acudientePrimerNombre", value)}
            required
          />
          <Field
            label="Segundo nombre"
            value={form.acudienteSegundoNombre}
            onChange={(value) => update("acudienteSegundoNombre", value)}
            optional
          />
          <Field
            label="Primer apellido"
            value={form.acudientePrimerApellido}
            onChange={(value) => update("acudientePrimerApellido", value)}
            required
          />
          <Field
            label="Segundo apellido"
            value={form.acudienteSegundoApellido}
            onChange={(value) => update("acudienteSegundoApellido", value)}
            required
          />
          <SelectField
            label="Tipo de documento"
            value={form.acudienteTipoDocumento}
            onChange={(value) => update("acudienteTipoDocumento", value)}
            options={DOCUMENT_TYPES.map((item) => [...item])}
            required
          />
          <Field
            label="Documento"
            value={form.acudienteDocumento}
            onChange={(value) => update("acudienteDocumento", value)}
            inputMode="numeric"
            required
          />
          <SelectField
            label="Parentesco"
            value={form.acudienteParentesco}
            onChange={(value) => update("acudienteParentesco", value)}
            options={RELATIONSHIPS.map((item) => [item, item])}
            placeholder="Selecciona el parentesco"
            required
          />
          <Field
            label="Correo electrónico"
            value={form.acudienteCorreo}
            onChange={(value) => update("acudienteCorreo", value)}
            type="email"
            required
          />
          <Field
            label="Número de teléfono"
            value={form.acudienteTelefono}
            onChange={(value) => update("acudienteTelefono", value)}
            inputMode="tel"
            required
          />
        </div>
      </fieldset>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
  optional = false,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  optional?: boolean;
  type?: string;
  inputMode?: "numeric" | "tel";
}) {
  return (
    <label className="students-modal-field">
      <span>
        {label}
        {optional && <small>Opcional</small>}
      </span>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        required={required}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="students-modal-field">
      <span>{label}</span>
      <select
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(([valueOption, labelOption]) => (
          <option key={valueOption} value={valueOption}>
            {labelOption}
          </option>
        ))}
      </select>
    </label>
  );
}
