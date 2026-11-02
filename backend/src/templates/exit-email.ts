type ExitEmailInput = {
  estudiante: string;
  grado: string;
  grupo: string;
  jornada: string;
  recogeNombre: string;
  recogeApellido: string;
  recogeParentesco: string;
  recogeTipoDocumento: string;
  recogeDocumento: string;
  registradoPor: string;
  registradoEn: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);
}

function formatDateTime(value: string) {
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(date);
}

function maskDocument(value: string) {
  const visible = value.slice(-4);
  return `${'•'.repeat(Math.max(4, value.length - visible.length))}${visible}`;
}

function detail(label: string, value: string) {
  return `<strong style="display:block;margin-bottom:4px;color:#0b4f91;font-size:12px;line-height:18px;letter-spacing:.45px;">${label}</strong><span style="color:#101828;font-size:14px;line-height:21px;">${escapeHtml(value)}</span>`;
}

export function crearCorreoSalida(input: ExitEmailInput) {
  const personaRecoge = `${input.recogeNombre} ${input.recogeApellido}`.trim();
  const grupo = `${input.grado}-${input.grupo}`;
  const fecha = formatDateTime(input.registradoEn);
  const documento = `${input.recogeTipoDocumento} ${maskDocument(input.recogeDocumento)}`;
  const subject = `Salida registrada - ${input.estudiante}`;
  const text = `SIGDE — Sistema de Gestión Digital Escolar

SALIDA REGISTRADA

Se registró correctamente la salida de ${input.estudiante}.

ESTUDIANTE
${input.estudiante}
GRUPO
${grupo}
JORNADA
${input.jornada}
FECHA Y HORA
${fecha}

PERSONA QUE RECOGE
${personaRecoge}
PARENTESCO
${input.recogeParentesco}
DOCUMENTO VERIFICADO
${documento}
REGISTRADO POR
${input.registradoPor}

Este correo confirma el registro realizado en portería. Si no reconoce esta salida o requiere ampliar la información, comuníquese de inmediato con la institución.

SIGDE · Institución Educativa Técnica Industrial Rafael Navia Varón`;

  return {
    subject,
    text,
    html: `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head><body style="margin:0;padding:0;background:#eaf3fb;font-family:Arial,Helvetica,sans-serif;color:#101828;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">Confirmación de salida de ${escapeHtml(input.estudiante)}.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eaf3fb;"><tr><td align="center" style="padding:28px 12px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px;background:#fff;border-radius:20px;box-shadow:0 12px 34px rgba(10,22,40,.14);overflow:hidden;"><tr><td style="padding:20px 28px;background:#0a1628;color:#fff;"><span style="font-size:27px;font-weight:800;letter-spacing:3px;">SI<span style="color:#43c6e8;">G</span>DE</span><span style="margin-left:18px;padding-left:18px;border-left:1px solid #718096;font-size:13px;color:#d8e7f4;">Sistema de Gestión Digital Escolar</span></td></tr><tr><td align="center" style="padding:30px 22px;background:#16865f;color:#fff;"><h1 style="margin:0;font-size:34px;line-height:40px;">SALIDA REGISTRADA</h1><p style="display:inline-block;margin:12px 0 0;padding:7px 15px;border-radius:999px;background:#fff;color:#116149;font-size:13px;font-weight:800;letter-spacing:.5px;">REGISTRO COMPLETADO</p></td></tr><tr><td style="padding:28px 28px 18px;"><p style="margin:0 0 7px;font-size:22px;font-weight:800;color:#0a1628;">Confirmación de salida</p><p style="margin:0;font-size:15px;line-height:23px;color:#667085;">Se registró correctamente la salida de <strong style="color:#344054;">${escapeHtml(input.estudiante)}</strong>.</p></td></tr><tr><td style="padding:0 28px 14px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fbfcfe;border:1px solid #b8ddcf;border-radius:14px;"><tr><td width="50%" valign="top" style="padding:18px 12px 18px 19px;">${detail('ESTUDIANTE', input.estudiante)}<br><br>${detail('GRUPO', grupo)}<br><br>${detail('JORNADA', input.jornada)}</td><td width="50%" valign="top" style="padding:18px 19px 18px 12px;">${detail('FECHA Y HORA', fecha)}<br><br>${detail('REGISTRADO POR', input.registradoPor)}</td></tr></table></td></tr><tr><td style="padding:0 28px 14px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1faf6;border:1px solid #cce7dc;border-radius:14px;"><tr><td style="padding:17px 19px;"><p style="margin:0 0 12px;font-size:12px;line-height:18px;font-weight:800;letter-spacing:.5px;color:#116149;">PERSONA QUE RECOGE</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td width="50%" valign="top" style="padding-right:12px;">${detail('NOMBRE', personaRecoge)}<br><br>${detail('PARENTESCO', input.recogeParentesco)}</td><td width="50%" valign="top" style="padding-left:12px;">${detail('DOCUMENTO VERIFICADO', documento)}</td></tr></table></td></tr></table></td></tr><tr><td style="padding:10px 28px 28px;"><p style="margin:0;padding-top:18px;border-top:1px solid #d6dfeb;font-size:12px;line-height:19px;color:#667085;">Este correo confirma el registro realizado en portería. Si no reconoce esta salida o requiere ampliar la información, comuníquese de inmediato con la institución.</p><p style="margin:18px 0 0;text-align:center;font-size:12px;line-height:19px;color:#667085;"><strong style="color:#0b4f91;">SIGDE</strong> · Institución Educativa Técnica Industrial Rafael Navia Varón</p></td></tr></table></td></tr></table></body></html>`,
  };
}
