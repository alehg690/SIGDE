import type { Observador } from '@backend/types/observador';

export function observadorVacio(): Observador {
  const now = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return { fecha: now, horaInicio: '', horaFinal: '', sede: '', jornada: '', grupo: '', acudiente: '', cedulaAcudiente: '', motivo: '', tipoSituacion: '1', situacionAcademica: '', ordenDia: '', desarrollo: '', documentoReferencia: 'Manual de Convivencia', referenciaNormativa: '' };
}

export default function ObservadorFields({ value, onChange, estudiante }: { value: Observador; onChange: (value: Observador) => void; estudiante?: React.ReactNode }) {
  const change = (key: keyof Observador, next: string) => onChange({ ...value, [key]: next });
  return <>
    <fieldset className="report-form-section"><legend><span>1</span> Datos y motivo de la citación</legend><div className="report-form-grid">
      <label><span>Fecha *</span><input type="date" value={value.fecha} onChange={e => change('fecha', e.target.value)} required /></label>
      <label><span>Hora de inicio *</span><input type="time" value={value.horaInicio} onChange={e => change('horaInicio', e.target.value)} required /></label>
      <label><span>Hora final *</span><input type="time" value={value.horaFinal} min={value.horaInicio} onChange={e => change('horaFinal', e.target.value)} required /></label>
      {estudiante}
      <label><span>Sede *</span><input value={value.sede} minLength={3} maxLength={120} onChange={e => change('sede', e.target.value)} required /></label>
      <label><span>Jornada *</span><input value={value.jornada} maxLength={120} onChange={e => change('jornada', e.target.value)} required /></label>
      <label><span>Grupo *</span><input value={value.grupo} maxLength={120} onChange={e => change('grupo', e.target.value)} required /></label>
      <label><span>Padre de familia o acudiente legal *</span><input value={value.acudiente} maxLength={120} onChange={e => change('acudiente', e.target.value)} required /></label>
      <label><span>CC del acudiente *</span><input inputMode="numeric" pattern="[0-9]{5,12}" value={value.cedulaAcudiente} maxLength={12} onChange={e => change('cedulaAcudiente', e.target.value)} required /></label>
      <label className="report-description-field"><span>Motivo de la citación *</span><textarea value={value.motivo} minLength={3} maxLength={2000} onChange={e => change('motivo', e.target.value)} required /></label>
      <label><span>Situación o condición tipo *</span><select value={value.tipoSituacion} onChange={e => change('tipoSituacion', e.target.value)} required><option value="1">Tipo I</option><option value="2">Tipo II</option><option value="3">Tipo III</option><option value="0">No aplica · Caso únicamente académico</option></select></label>
      <label className="report-description-field"><span>Situación académica {value.tipoSituacion === '0' ? '*' : '(si aplica)'}</span><textarea value={value.situacionAcademica} minLength={3} maxLength={2000} onChange={e => change('situacionAcademica', e.target.value)} placeholder="Explica qué pasó en la situación académica." required={value.tipoSituacion === '0'} /></label>
    </div></fieldset>
    <fieldset className="report-form-section"><legend><span>2</span> Orden del día</legend><div className="report-form-grid"><label className="report-description-field"><span>Temas que se tratarán *</span><textarea value={value.ordenDia} minLength={3} maxLength={1000} onChange={e => change('ordenDia', e.target.value)} placeholder="1. Presentación del caso. 2. Escucha de las partes. 3. Acuerdos." required /></label></div></fieldset>
    <fieldset className="report-form-section"><legend><span>3</span> Desarrollo de la reunión</legend><div className="report-form-grid">
      <p className="report-description-field">Quien presida la reunión debe relacionar la situación o condición que motiva el caso con el Manual de Convivencia o el SIEE, indicando artículo, numeral y/o literal.</p>
      <label><span>Documento de referencia *</span><select value={value.documentoReferencia} onChange={e => change('documentoReferencia', e.target.value)}><option>Manual de Convivencia</option><option>SIEE</option></select></label>
      <label><span>Artículo, numeral y/o literal *</span><input value={value.referenciaNormativa} minLength={3} maxLength={300} onChange={e => change('referenciaNormativa', e.target.value)} placeholder="Indica la referencia del documento institucional" required /></label>
      <label className="report-description-field"><span>Desarrollo de la reunión *</span><textarea value={value.desarrollo} minLength={20} maxLength={2000} onChange={e => change('desarrollo', e.target.value)} placeholder="Describe lo conversado, su relación con la referencia citada y los acuerdos." required /></label>
    </div></fieldset>
  </>;
}

export function ObservadorDetalle({ value }: { value: Observador }) {
  const fields: [string, string][] = [
    ['Fecha', value.fecha], ['Hora de inicio', value.horaInicio], ['Hora final', value.horaFinal], ['Sede', value.sede], ['Jornada', value.jornada], ['Grupo', value.grupo], ['Padre de familia o acudiente legal', value.acudiente], ['CC', value.cedulaAcudiente], ['Motivo de la citación', value.motivo], ['Situación académica', value.situacionAcademica || 'No aplica'],
    ['2. Orden del día', value.ordenDia], ['3. Desarrollo de la reunión', value.desarrollo], ['Referencia obligatoria', `${value.documentoReferencia}: ${value.referenciaNormativa}`],
  ];
  return <section aria-label="Acta del observador"><h4>1. Datos y motivo de la citación</h4>{fields.map(([label, text]) => <div className="report-detail-copy" key={label}><span>{label}</span><p style={{ whiteSpace: 'pre-wrap' }}>{text}</p></div>)}</section>;
}
