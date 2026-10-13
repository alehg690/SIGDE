import type { Observador } from '@backend/types/observador';

const ORDEN_DIA_ITEMS = [
  { label: 'Presentación del caso', placeholder: 'Describe cómo se presentará el caso.' },
  { label: 'Escucha de las partes', placeholder: 'Registra los temas que se abordarán con las partes.' },
  { label: 'Acuerdos', placeholder: 'Indica los acuerdos o compromisos que se propondrán.' },
] as const;

function separarOrdenDia(value: string) {
  if (!value) return ['', '', ''];
  const sections = value.match(/^1\.\s*([\s\S]*?)\n2\.\s*([\s\S]*?)\n3\.\s*([\s\S]*)$/);
  return sections ? sections.slice(1) : [value, '', ''];
}

function unirOrdenDia(items: string[]) {
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

export function observadorVacio(): Observador {
  const now = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return { fecha: now, horaInicio: '', horaFinal: '', sede: '', jornada: '', grupo: '', acudiente: '', cedulaAcudiente: '', motivo: '', tipoSituacion: '1', situacionAcademica: '', ordenDia: '', desarrollo: '', documentoReferencia: '', referenciaNormativa: '' };
}

export default function ObservadorFields({ value, onChange, estudiante }: { value: Observador; onChange: (value: Observador) => void; estudiante?: React.ReactNode }) {
  const change = (key: keyof Observador, next: string) => onChange({ ...value, [key]: next });
  const ordenDia = separarOrdenDia(value.ordenDia);
  const changeOrdenDia = (index: number, next: string) => {
    const updated = [...ordenDia];
    updated[index] = next;
    change('ordenDia', unirOrdenDia(updated));
  };
  return <>
    <fieldset className="report-form-section"><legend><span>1</span> Estudiante y motivo de la citación</legend><div className="report-form-grid">
      {estudiante}
      <label className="report-description-field"><span>Motivo de la citación *</span><textarea value={value.motivo} minLength={3} maxLength={2000} onChange={e => change('motivo', e.target.value)} required /></label>
      <label><span>Situación o condición tipo *</span><select value={value.tipoSituacion} onChange={e => change('tipoSituacion', e.target.value)} required><option value="1">Tipo I</option><option value="2">Tipo II</option><option value="3">Tipo III</option><option value="0">No aplica · Caso únicamente académico</option></select></label>
      <label className="report-description-field"><span>Situación académica {value.tipoSituacion === '0' ? '*' : '(si aplica)'}</span><textarea value={value.situacionAcademica} minLength={3} maxLength={2000} onChange={e => change('situacionAcademica', e.target.value)} placeholder="Explica qué pasó en la situación académica." required={value.tipoSituacion === '0'} /></label>
    </div></fieldset>
    <fieldset className="report-form-section"><legend><span>2</span> Orden del día</legend><div className="report-agenda-fields">
      {ORDEN_DIA_ITEMS.map((item, index) => <label key={item.label}><span><b>{index + 1}.</b> {item.label} *</span><textarea value={ordenDia[index]} minLength={3} maxLength={300} onChange={e => changeOrdenDia(index, e.target.value)} placeholder={item.placeholder} required /></label>)}
    </div></fieldset>
    <fieldset className="report-form-section"><legend><span>3</span> Desarrollo de la reunión</legend><div className="report-form-grid">
      <label className="report-description-field"><span>Desarrollo de la reunión *</span><textarea value={value.desarrollo} minLength={20} maxLength={2000} onChange={e => change('desarrollo', e.target.value)} placeholder="Describe lo conversado y los acuerdos alcanzados." required /></label>
    </div></fieldset>
  </>;
}

export function ObservadorDetalle({ value }: { value: Observador }) {
  const ordenDia = separarOrdenDia(value.ordenDia);
  const datos = [
    ['Fecha', value.fecha], ['Hora de inicio', value.horaInicio], ['Sede', value.sede], ['Jornada', value.jornada], ['Grupo', value.grupo], ['Acudiente legal', value.acudiente], ['Documento', value.cedulaAcudiente],
  ];
  return <section className="report-observer-detail" aria-label="Acta del observador">
    <header><span>Acta del observador</span><h4>Información de la reunión</h4></header>
    <dl className="report-observer-facts">{datos.map(([label, text]) => <div key={label}><dt>{label}</dt><dd>{text || 'Sin registrar'}</dd></div>)}</dl>
    <section className="report-observer-block"><span>Motivo de la citación</span><p>{value.motivo || 'Sin registrar'}</p></section>
    {value.situacionAcademica && <section className="report-observer-block"><span>Situación académica</span><p>{value.situacionAcademica}</p></section>}
    <section className="report-observer-agenda"><header><span>Orden del día</span><small>3 puntos</small></header><ol>{ORDEN_DIA_ITEMS.map((item, index) => <li key={item.label}><b>{index + 1}</b><div><strong>{item.label}</strong><p>{ordenDia[index] || 'Sin registrar'}</p></div></li>)}</ol></section>
    <section className="report-observer-block report-observer-development"><span>Desarrollo de la reunión</span><p>{value.desarrollo || 'Sin registrar'}</p></section>
    {(value.documentoReferencia || value.referenciaNormativa) && <section className="report-observer-reference"><span>Referencia institucional</span><p>{[value.documentoReferencia, value.referenciaNormativa].filter(Boolean).join(': ')}</p></section>}
  </section>;
}
