import type { Observador } from '@backend/types/observador';

export function validarObservador(value: unknown): { data: Observador } | { error: string; status: 400 } {
  const fail = (error: string) => ({ error, status: 400 as const });
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('Completa las tres secciones del observador.');
  const raw = value as Record<string, unknown>;
  const fields = ['fecha', 'horaInicio', 'horaFinal', 'sede', 'jornada', 'grupo', 'acudiente', 'cedulaAcudiente', 'motivo', 'tipoSituacion', 'ordenDia', 'desarrollo', 'documentoReferencia', 'referenciaNormativa'] as const;
  const labels: Record<string, string> = { fecha: 'Fecha', horaInicio: 'Hora de inicio', horaFinal: 'Hora final', sede: 'Sede', jornada: 'Jornada', grupo: 'Grupo', acudiente: 'Padre de familia o acudiente legal', cedulaAcudiente: 'CC del acudiente', motivo: 'Motivo de la citación', tipoSituacion: 'Situación o condición tipo', ordenDia: 'Orden del día', desarrollo: 'Desarrollo de la reunión', documentoReferencia: 'Documento de referencia', referenciaNormativa: 'Artículo, numeral y/o literal' };
  const data = {} as Observador;
  for (const field of fields) {
    if (typeof raw[field] !== 'string' || !raw[field].trim()) return fail(`Completa el campo obligatorio: ${labels[field]}.`);
    Object.assign(data, { [field]: raw[field].trim() });
  }
  data.situacionAcademica = typeof raw.situacionAcademica === 'string' ? raw.situacionAcademica.trim() : '';
  if (data.situacionAcademica.length > 2000 || (data.tipoSituacion === '0' && data.situacionAcademica.length < 3)) return fail('Explica qué pasó en la situación académica (máximo 2000 caracteres).');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.fecha)) return fail('Indica una fecha válida.');
  const day = new Date(`${data.fecha}T12:00:00Z`);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== data.fecha) return fail('Indica una fecha válida.');
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!time.test(data.horaInicio) || !time.test(data.horaFinal) || data.horaFinal <= data.horaInicio) return fail('La hora final debe ser posterior a la hora de inicio, en la misma fecha.');
  if (!['0', '1', '2', '3'].includes(data.tipoSituacion)) return fail('Selecciona el tipo de situación.');
  if (!['Manual de Convivencia', 'SIEE'].includes(data.documentoReferencia)) return fail('Selecciona el Manual de Convivencia o el SIEE.');
  if (data.referenciaNormativa.length < 3 || data.referenciaNormativa.length > 300) return fail('Indica el artículo, numeral y/o literal de referencia (3 a 300 caracteres).');
  if (!/^\d{5,12}$/.test(data.cedulaAcudiente)) return fail('La CC del acudiente debe contener entre 5 y 12 dígitos.');
  for (const field of ['sede', 'jornada', 'grupo', 'acudiente'] as const) {
    if (data[field].length > 120 || data[field].toLowerCase().includes('pendiente de registrar')) return fail(`Revisa el campo ${field}; debe contener datos reales y máximo 120 caracteres.`);
  }
  if (data.motivo.length < 3 || data.motivo.length > 2000) return fail('El motivo debe tener entre 3 y 2000 caracteres.');
  if (data.ordenDia.length < 3 || data.ordenDia.length > 1000) return fail('El orden del día debe tener entre 3 y 1000 caracteres.');
  if (data.desarrollo.length < 20 || data.desarrollo.length > 2000) return fail('El desarrollo debe tener entre 20 y 2000 caracteres.');
  return { data };
}

export function datosReporteObservador(data: Observador) {
  return {
    tipoFalta: Number(data.tipoSituacion),
    fechaHecho: new Date(`${data.fecha}T${data.horaInicio}:00-05:00`).toISOString(),
    lugar: data.sede,
    situacion: data.tipoSituacion === '0' ? 'Situación académica' : `Situación tipo ${['', 'I', 'II', 'III'][Number(data.tipoSituacion)]}`,
    descripcion: data.desarrollo,
    actuacionInicial: data.ordenDia,
  };
}
