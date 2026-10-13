import type { Observador } from '@backend/types/observador';

type ObserverEmailInput = {
  numero: number;
  acudiente: string;
  estudiante: string;
  grado: string;
  grupo: string;
  docente: string;
  observador: Observador;
};

const SEVERITIES = {
  '0': { label: 'CASO ACADÉMICO', background: '#eaf3fb', accent: '#1f6fb8', foreground: '#ffffff', badgeText: '#1f6fb8', border: '#bed8ef' },
  '1': { label: 'SITUACIÓN TIPO I', background: '#fff7cc', accent: '#f4c430', foreground: '#3d2f00', badgeText: '#6b4f00', border: '#e5c44f' },
  '2': { label: 'SITUACIÓN TIPO II', background: '#fff0df', accent: '#f57c00', foreground: '#ffffff', badgeText: '#c8520a', border: '#f2aa62' },
  '3': { label: 'SITUACIÓN TIPO III', background: '#ffe8e8', accent: '#d92d3a', foreground: '#ffffff', badgeText: '#b4232d', border: '#ed8a91' },
} as const;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);
}

function lines(value: string) {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00-05:00`);
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' }).format(date);
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' })
    .format(new Date(Date.UTC(2026, 0, 1, hours + 5, minutes)));
}

function section(title: string, content: string, tint = '#f7faff') {
  return `<tr><td style="padding:0 28px 12px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${tint};border:1px solid #dce7f1;border-radius:14px;"><tr><td style="padding:17px 19px;"><p style="margin:0 0 7px;font-size:12px;line-height:18px;font-weight:800;letter-spacing:.5px;color:#0b4f91;">${title}</p><div style="font-size:14px;line-height:22px;color:#344054;">${content}</div></td></tr></table></td></tr>`;
}

export function crearCorreoObservador(input: ObserverEmailInput) {
  const { observador } = input;
  const severity = SEVERITIES[observador.tipoSituacion];
  const number = String(input.numero).padStart(2, '0');
  const schedule = observador.horaFinal
    ? `${formatTime(observador.horaInicio)} – ${formatTime(observador.horaFinal)}`
    : formatTime(observador.horaInicio);
  const agenda = observador.ordenDia.split('\n').filter(Boolean).map(item => `<li style="margin:0 0 7px;">${lines(item)}</li>`).join('');
  const academicHtml = observador.tipoSituacion === '0' && observador.situacionAcademica
    ? section('SITUACIÓN ACADÉMICA', lines(observador.situacionAcademica))
    : '';
  const academicText = observador.tipoSituacion === '0' && observador.situacionAcademica
    ? `\n\nSITUACIÓN ACADÉMICA\n${observador.situacionAcademica}`
    : '';
  const title = `Observador #${number} - ${input.estudiante}`;
  const text = `SIGDE — Sistema de Gestión Digital Escolar\n\nOBSERVADOR #${number}\n${severity.label}\n\nHola, ${input.acudiente}.\nSe ha registrado una nueva anotación en el observador de ${input.estudiante}.\n\nESTUDIANTE\n${input.estudiante}\nGRUPO\n${input.grado}-${input.grupo}\nFECHA\n${formatDate(observador.fecha)}\nHORARIO\n${schedule}\nSEDE\n${observador.sede}\nJORNADA\n${observador.jornada}\nDOCENTE\n${input.docente}\n\nMOTIVO DEL OBSERVADOR\n${observador.motivo}${academicText}\n\nORDEN DEL DÍA\n${observador.ordenDia}\n\nDESARROLLO DE LA REUNIÓN\n${observador.desarrollo}\n\nEste correo es informativo. Si requiere ampliar la información, comuníquese con la institución.\n\nSIGDE · Institución Educativa Técnica Industrial Rafael Navia Varón`;

  return {
    subject: title,
    text,
    html: `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="margin:0;padding:0;background:${severity.background};font-family:Arial,Helvetica,sans-serif;color:#101828;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">Observador #${number} para ${escapeHtml(input.estudiante)}.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${severity.background};"><tr><td align="center" style="padding:28px 12px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px;background:#fff;border-radius:20px;box-shadow:0 12px 34px rgba(10,22,40,.14);overflow:hidden;"><tr><td style="padding:20px 28px;background:#0a1628;color:#fff;"><span style="font-size:27px;font-weight:800;letter-spacing:3px;">SI<span style="color:#43c6e8;">G</span>DE</span><span style="margin-left:18px;padding-left:18px;border-left:1px solid #718096;font-size:13px;color:#d8e7f4;">Sistema de Gestión Digital Escolar</span></td></tr><tr><td align="center" style="padding:30px 22px;background:${severity.accent};color:${severity.foreground};"><h1 style="margin:0;font-size:36px;line-height:42px;">OBSERVADOR #${number}</h1><p style="display:inline-block;margin:12px 0 0;padding:7px 15px;border-radius:999px;background:#fff;color:${severity.badgeText};font-size:13px;font-weight:800;letter-spacing:.5px;">${severity.label}</p></td></tr><tr><td style="padding:28px 28px 18px;"><p style="margin:0 0 7px;font-size:22px;font-weight:800;color:#0a1628;">Hola, ${escapeHtml(input.acudiente)}</p><p style="margin:0;font-size:15px;line-height:23px;color:#667085;">Se ha registrado una nueva anotación en el observador de <strong style="color:#344054;">${escapeHtml(input.estudiante)}</strong>.</p></td></tr><tr><td style="padding:0 28px 14px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fbfcfe;border:1px solid ${severity.border};border-radius:14px;"><tr><td width="50%" valign="top" style="padding:18px 12px 18px 19px;font-size:13px;line-height:20px;color:#667085;"><strong style="color:#0b4f91;">ESTUDIANTE</strong><br><span style="font-size:15px;color:#101828;">${escapeHtml(input.estudiante)}</span><br><br><strong style="color:#0b4f91;">GRUPO</strong><br><span style="color:#101828;">${escapeHtml(input.grado)}-${escapeHtml(input.grupo)}</span><br><br><strong style="color:#0b4f91;">FECHA</strong><br><span style="color:#101828;">${formatDate(observador.fecha)}</span><br><br><strong style="color:#0b4f91;">HORARIO</strong><br><span style="color:#101828;">${schedule}</span></td><td width="50%" valign="top" style="padding:18px 19px 18px 12px;font-size:13px;line-height:20px;color:#667085;"><strong style="color:#0b4f91;">SEDE</strong><br><span style="color:#101828;">${escapeHtml(observador.sede)}</span><br><br><strong style="color:#0b4f91;">JORNADA</strong><br><span style="color:#101828;">${escapeHtml(observador.jornada)}</span><br><br><strong style="color:#0b4f91;">DOCENTE</strong><br><span style="color:#101828;">${escapeHtml(input.docente)}</span></td></tr></table></td></tr>${section('MOTIVO DEL OBSERVADOR', lines(observador.motivo), severity.background)}${academicHtml}${section('ORDEN DEL DÍA', `<ol style="margin:0;padding-left:22px;">${agenda}</ol>`)}${section('DESARROLLO DE LA REUNIÓN', lines(observador.desarrollo))}<tr><td style="padding:10px 28px 28px;"><p style="margin:0;padding-top:18px;border-top:1px solid #d6dfeb;font-size:12px;line-height:19px;color:#667085;">Este correo es informativo. Si requiere ampliar la información, comuníquese con la institución.</p><p style="margin:18px 0 0;text-align:center;font-size:12px;line-height:19px;color:#667085;"><strong style="color:#0b4f91;">SIGDE</strong> · Institución Educativa Técnica Industrial Rafael Navia Varón</p></td></tr></table></td></tr></table></body></html>`,
  };
}
