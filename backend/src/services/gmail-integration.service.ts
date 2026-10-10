import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { db } from '@backend/config/database';
import { getGmailIntegrationConfig, getJwtSecret } from '@backend/config/env';
import { crearComunicacion, type ArchivoComunicacionInput } from '@backend/services/comunicaciones.service';
import { crearEvento } from '@backend/services/eventos.service';
import { registrarAccion } from '@backend/services/auditoria.service';
import { actualizarHorarioDesdeGmail } from '@backend/services/horario.service';
import type { RolUsuario, SesionUsuario } from '@backend/types/roles';

const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const OAUTH_AUDIENCE = 'sigde-gmail-oauth';
const ALLOWED_ATTACHMENTS = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const COMMUNICATION_ATTACHMENTS = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

type GmailPart = {
  mimeType?: string;
  filename?: string;
  headers?: Array<{ name?: string; value?: string }>;
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GmailPart[];
};

type GmailMessage = {
  id: string;
  threadId?: string;
  internalDate?: string;
  payload?: GmailPart;
};

function oauthRedirectUri(origin: string) {
  return `${origin}/api/integraciones/gmail/callback`;
}

function tokenKey() {
  return createHash('sha256').update(`sigde:gmail:${getJwtSecret()}`).digest();
}

function encryptToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', tokenKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

function decryptToken(value: string) {
  const [version, iv, tag, encrypted] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !encrypted) throw new Error('El token de Gmail almacenado no es válido.');
  const decipher = createDecipheriv('aes-256-gcm', tokenKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8');
}

function decodeBase64Url(value?: string) {
  return value ? Buffer.from(value, 'base64url') : Buffer.alloc(0);
}

function decodeHeader(value: string) {
  return value.replace(/=\?([^?]+)\?([bqBQ])\?([^?]+)\?=/g, (_match, charset: string, encoding: string, data: string) => {
    try {
      if (encoding.toLowerCase() === 'b') return Buffer.from(data, 'base64').toString(charset.toLowerCase() === 'iso-8859-1' ? 'latin1' : 'utf8');
      const bytes = data.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (_m: string, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
      return Buffer.from(bytes, 'binary').toString(charset.toLowerCase() === 'iso-8859-1' ? 'latin1' : 'utf8');
    } catch {
      return data;
    }
  });
}

function header(part: GmailPart | undefined, name: string) {
  const value = part?.headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value || '';
  return decodeHeader(value).trim();
}

function cleanHtml(html: string) {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

function collectParts(part: GmailPart | undefined, output: GmailPart[] = []) {
  if (!part) return output;
  output.push(part);
  for (const child of part.parts || []) collectParts(child, output);
  return output;
}

function messageText(message: GmailMessage) {
  const parts = collectParts(message.payload);
  const plain = parts.find((part) => part.mimeType === 'text/plain' && part.body?.data);
  if (plain?.body?.data) return decodeBase64Url(plain.body.data).toString('utf8').trim();
  const html = parts.find((part) => part.mimeType === 'text/html' && part.body?.data);
  return html?.body?.data ? cleanHtml(decodeBase64Url(html.body.data).toString('utf8')) : '';
}

async function gmailFetch<T>(accessToken: string, path: string): Promise<T> {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Gmail respondió ${response.status}.`);
  return response.json() as Promise<T>;
}

async function getAttachments(accessToken: string, message: GmailMessage) {
  const attachments: ArchivoComunicacionInput[] = [];
  for (const part of collectParts(message.payload)) {
    const filename = (part.filename || '').trim();
    const mimeType = part.mimeType || '';
    if (!filename || !ALLOWED_ATTACHMENTS.has(mimeType) || Number(part.body?.size || 0) > MAX_ATTACHMENT_BYTES) continue;
    let data = part.body?.data;
    if (!data && part.body?.attachmentId) {
      const attachment = await gmailFetch<{ data?: string; size?: number }>(accessToken, `messages/${encodeURIComponent(message.id)}/attachments/${encodeURIComponent(part.body.attachmentId)}`);
      if (Number(attachment.size || 0) > MAX_ATTACHMENT_BYTES) continue;
      data = attachment.data;
    }
    const content = decodeBase64Url(data);
    if (!content.length || content.length > MAX_ATTACHMENT_BYTES) continue;
    attachments.push({ nombre: filename.slice(0, 160), mimeType, tamano: content.length, contenido: content });
    if (attachments.length === 5) break;
  }
  return attachments;
}

function communicationType(subject: string) {
  const text = subject.toLocaleLowerCase('es');
  if (/citaci[oó]n/.test(text)) return 'Citación';
  if (/circular/.test(text)) return 'Circular';
  if (/aviso/.test(text)) return 'Aviso';
  return 'Comunicado';
}

function eventType(text: string) {
  const normalized = text.toLocaleLowerCase('es');
  if (/reuni[oó]n/.test(normalized)) return 'Reunión';
  if (/capacitaci[oó]n|taller/.test(normalized)) return 'Capacitación';
  if (/citaci[oó]n/.test(normalized)) return 'Citación';
  if (/salud|vacun/.test(normalized)) return 'Salud';
  if (/acad[eé]mic|evaluaci[oó]n|examen|horario/.test(normalized)) return 'Académico';
  return 'Evento';
}

function senderEmail(value: string) {
  const bracketed = value.match(/<([^<>\s]+@[^<>\s]+)>/);
  const plain = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return (bracketed?.[1] || plain?.[0] || '').toLowerCase();
}

function detectPeriod(text: string) {
  const match = text.match(/\b(primer|primero|segundo|tercer|tercero|cuarto|[1-6](?:er|do|ro|to)?)\s+periodo\b/i);
  return match ? match[0] : null;
}

function classifyMessage(subject: string, body: string) {
  const text = `${subject}\n${body}`.toLocaleLowerCase('es');
  if (/\bhorario(?:s)?\b|cambio\s+de\s+jornada/.test(text)) return 'horario' as const;
  const dates = extractDates(text);
  if (dates.length && /jean[ -]?day|d[ií]a\s+de\s+jean|actividad|evento|reuni[oó]n|capacitaci[oó]n|taller|citaci[oó]n|jornada\s+(?:pedag[oó]gica|cultural|deportiva)/.test(text)) return 'evento' as const;
  return 'comunicacion' as const;
}

const MONTHS: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

function validEventDate(year: number, month: number, day: number, hour: number, minute: number) {
  if (year < 2020 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-05:00`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function extractDates(text: string) {
  const found = new Map<string, { date: Date; allDay: boolean }>();
  const numeric = /\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})(?:\s+(?:a\s+las\s+)?(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)?)?/gi;
  for (const match of text.matchAll(numeric)) {
    let hour = Number(match[4] || 0);
    const meridiem = (match[6] || '').replace(/[.\s]/g, '').toLowerCase();
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    const date = validEventDate(Number(match[3]), Number(match[2]), Number(match[1]), hour, Number(match[5] || 0));
    if (date) found.set(date.toISOString(), { date, allDay: !match[4] });
  }
  const words = /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(20\d{2})(?:\s+(?:a\s+las\s+)?(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?)?)?/gi;
  for (const match of text.matchAll(words)) {
    let hour = Number(match[4] || 0);
    const meridiem = (match[6] || '').replace(/[.\s]/g, '').toLowerCase();
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    const date = validEventDate(Number(match[3]), MONTHS[match[2].toLowerCase()], Number(match[1]), hour, Number(match[5] || 0));
    if (date) found.set(date.toISOString(), { date, allDay: !match[4] });
  }
  const earliest = Date.now() - 24 * 60 * 60 * 1000;
  const latest = Date.now() + 2 * 366 * 24 * 60 * 60 * 1000;
  return [...found.values()].filter(({ date }) => date.getTime() >= earliest && date.getTime() <= latest).slice(0, 10);
}

async function refreshAccessToken(refreshToken: string) {
  const config = getGmailIntegrationConfig();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });
  const data = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error_description || 'Google no renovó el acceso a Gmail.');
  return data.access_token;
}

export async function gmailStatus() {
  const config = getGmailIntegrationConfig();
  if (!config.configured) return { configured: false, connected: false, account: config.account || null, importQuery: config.importQuery, allowedSenders: config.allowedSenders };
  const result = await db.execute({
    sql: 'SELECT correo, conectadoEn, ultimaSincronizacionEn, ultimoError, activo FROM GmailIntegration WHERE correo = ? LIMIT 1',
    args: [config.account],
  });
  const row = result.rows[0];
  return {
    configured: true,
    connected: Boolean(row?.activo),
    account: config.account,
    importQuery: config.importQuery,
    allowedSenders: config.allowedSenders,
    connectedAt: row?.conectadoEn || null,
    lastSyncAt: row?.ultimaSincronizacionEn || null,
    lastError: row?.ultimoError || null,
  };
}

export async function gmailAuthorizationUrl(origin: string, user: SesionUsuario) {
  const config = getGmailIntegrationConfig();
  if (!config.configured) return { error: 'La integración de Gmail aún no tiene credenciales de Google configuradas.', status: 503 } as const;
  const secret = new TextEncoder().encode(getJwtSecret());
  const state = await new SignJWT({ userId: user.id, account: config.account })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(OAUTH_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(secret);
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: oauthRedirectUri(origin),
    response_type: 'code',
    scope: GMAIL_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    login_hint: config.account,
    state,
  }).toString();
  return { data: { url: url.toString() } } as const;
}

export async function completeGmailAuthorization(origin: string, code: string, state: string, user: SesionUsuario) {
  const config = getGmailIntegrationConfig();
  if (!config.configured) return { error: 'La integración de Gmail no está configurada.', status: 503 } as const;
  try {
    const verified = await jwtVerify(state, new TextEncoder().encode(getJwtSecret()), { audience: OAUTH_AUDIENCE });
    if (Number(verified.payload.userId) !== user.id || verified.payload.account !== config.account) throw new Error('state');
  } catch {
    return { error: 'La autorización de Google expiró o no corresponde a esta sesión.', status: 400 } as const;
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: oauthRedirectUri(origin),
      grant_type: 'authorization_code',
    }),
    cache: 'no-store',
  });
  const tokens = await response.json() as { access_token?: string; refresh_token?: string; error_description?: string };
  if (!response.ok || !tokens.access_token) return { error: tokens.error_description || 'Google no completó la autorización.', status: 400 } as const;

  const profileResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: 'no-store',
  });
  const profile = await profileResponse.json() as { emailAddress?: string };
  if (!profileResponse.ok || profile.emailAddress?.toLowerCase() !== config.account) {
    return { error: `Debes autorizar exactamente la cuenta ${config.account}.`, status: 403 } as const;
  }

  const existing = await db.execute({ sql: 'SELECT refreshTokenCifrado FROM GmailIntegration WHERE correo = ? LIMIT 1', args: [config.account] });
  const encrypted = tokens.refresh_token ? encryptToken(tokens.refresh_token) : String(existing.rows[0]?.refreshTokenCifrado || '');
  if (!encrypted) return { error: 'Google no entregó acceso permanente. Revoca el acceso anterior e inténtalo nuevamente.', status: 400 } as const;
  await db.execute({
    sql: `INSERT INTO GmailIntegration (correo, refreshTokenCifrado, conectadoPorId, conectadoEn, activo, ultimoError)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1, NULL)
      ON CONFLICT(correo) DO UPDATE SET refreshTokenCifrado = excluded.refreshTokenCifrado, conectadoPorId = excluded.conectadoPorId,
        conectadoEn = CURRENT_TIMESTAMP, activo = 1, ultimoError = NULL`,
    args: [config.account, encrypted, user.id],
  });
  await registrarAccion({ usuarioId: user.id, accion: 'conectar_gmail', entidad: 'GmailIntegration', detalle: { correo: config.account, scope: GMAIL_SCOPE } });
  return { data: { connected: true } } as const;
}

async function integrationUser(userId: number): Promise<SesionUsuario> {
  const result = await db.execute({
    sql: 'SELECT id, nombre, correo, rol, versionSesion, requiereCambioContrasena FROM Usuario WHERE id = ? AND activo = 1 AND eliminadoEn IS NULL LIMIT 1',
    args: [userId],
  });
  const row = result.rows[0];
  if (!row) throw new Error('El usuario que conectó Gmail ya no está activo.');
  if (!['Admin', 'Coordinador'].includes(String(row.rol))) throw new Error('La cuenta que conectó Gmail ya no tiene permisos de coordinación.');
  return {
    id: Number(row.id), nombre: String(row.nombre), correo: String(row.correo), rol: String(row.rol) as RolUsuario,
    versionSesion: Number(row.versionSesion), requiereCambioContrasena: Boolean(row.requiereCambioContrasena),
  };
}

async function processMessage(accessToken: string, message: GmailMessage, user: SesionUsuario) {
  const subject = header(message.payload, 'Subject').slice(0, 160) || 'Comunicación recibida por Gmail';
  const from = header(message.payload, 'From');
  const sender = senderEmail(from);
  const body = messageText(message).slice(0, 9000);
  const config = getGmailIntegrationConfig();
  const action = config.allowedSenders.includes(sender) ? classifyMessage(subject, body) : 'ignorado';
  const claimed = await db.execute({
    sql: 'INSERT OR IGNORE INTO GmailProcessedMessage (messageId, threadId, asunto, accion) VALUES (?, ?, ?, ?)',
    args: [message.id, message.threadId || null, subject, action],
  });
  if (claimed.rowsAffected === 0) return { action: 'duplicado' as const, events: 0 };
  if (action === 'ignorado') return { action, events: 0 };
  try {
    const sentAt = header(message.payload, 'Date');
    const sourceNote = [`Origen: Gmail institucional`, from && `Remitente: ${from}`, sentAt && `Fecha del mensaje: ${sentAt}`].filter(Boolean).join('\n');
    const content = `${body || 'El mensaje no contiene texto; revisa los archivos adjuntos.'}\n\n---\n${sourceNote}`.slice(0, 10_000);
    const attachments = await getAttachments(accessToken, message);
    let communicationId: number | null = null;
    const eventIds: number[] = [];
    if (action === 'horario') {
      await actualizarHorarioDesdeGmail({ titulo: subject, contenido: content, periodo: detectPeriod(`${subject}\n${body}`), messageId: message.id, archivos: attachments }, user);
    } else if (action === 'evento') {
      for (const extracted of extractDates(`${subject}\n${body}`)) {
        const event = await crearEvento({
          titulo: subject.slice(0, 120),
          iniciaEn: extracted.date.toISOString(),
          descripcion: `${body.slice(0, 850)}\n\nCreado automáticamente desde un correo de ${sender}.`.slice(0, 1000),
          tipo: eventType(`${subject} ${body}`),
          color: 'azul',
          todoElDia: extracted.allDay,
        }, user);
        if (!('error' in event)) eventIds.push(Number((event.data as unknown as { id: unknown }).id));
      }
    } else {
      const communication = await crearComunicacion({
        titulo: subject,
        tipo: communicationType(subject),
        destinatarios: 'Toda la comunidad',
        contenido: content,
        estado: 'Publicado',
        archivos: attachments.filter((file) => COMMUNICATION_ATTACHMENTS.has(file.mimeType)),
      }, user);
      if ('error' in communication) throw new Error(communication.error);
      communicationId = Number((communication.data as { id: unknown }).id);
    }
    await db.execute({
      sql: 'UPDATE GmailProcessedMessage SET comunicacionId = ?, eventosJson = ?, accion = ? WHERE messageId = ?',
      args: [communicationId, JSON.stringify(eventIds), action, message.id],
    });
    return { action, events: eventIds.length };
  } catch (error) {
    await db.execute({ sql: 'DELETE FROM GmailProcessedMessage WHERE messageId = ? AND comunicacionId IS NULL', args: [message.id] });
    throw error;
  }
}

export async function syncGmail() {
  const config = getGmailIntegrationConfig();
  if (!config.configured) return { error: 'La integración de Gmail no está configurada.', status: 503 } as const;
  const result = await db.execute({
    sql: 'SELECT refreshTokenCifrado, conectadoPorId FROM GmailIntegration WHERE correo = ? AND activo = 1 LIMIT 1',
    args: [config.account],
  });
  const integration = result.rows[0];
  if (!integration) return { error: 'La cuenta de Gmail aún no está conectada.', status: 409 } as const;
  try {
    const accessToken = await refreshAccessToken(decryptToken(String(integration.refreshTokenCifrado)));
    const user = await integrationUser(Number(integration.conectadoPorId));
    const list = await gmailFetch<{ messages?: Array<{ id: string }> }>(accessToken, `messages?maxResults=50&q=${encodeURIComponent(config.importQuery)}`);
    let communications = 0;
    let schedules = 0;
    let ignored = 0;
    let events = 0;
    for (const item of [...(list.messages || [])].reverse()) {
      const message = await gmailFetch<GmailMessage>(accessToken, `messages/${encodeURIComponent(item.id)}?format=full`);
      const processed = await processMessage(accessToken, message, user);
      if (processed.action === 'comunicacion') communications += 1;
      if (processed.action === 'horario') schedules += 1;
      if (processed.action === 'ignorado') ignored += 1;
      events += processed.events;
    }
    await db.execute({
      sql: 'UPDATE GmailIntegration SET ultimaSincronizacionEn = CURRENT_TIMESTAMP, ultimoError = NULL WHERE correo = ?',
      args: [config.account],
    });
    return { data: { communications, schedules, events, ignored, checked: list.messages?.length || 0 } } as const;
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : 'Error desconocido al sincronizar Gmail.';
    await db.execute({ sql: 'UPDATE GmailIntegration SET ultimoError = ? WHERE correo = ?', args: [message, config.account] });
    return { error: message, status: 502 } as const;
  }
}

export async function disconnectGmail(user: SesionUsuario) {
  const config = getGmailIntegrationConfig();
  const result = await db.execute({ sql: 'SELECT refreshTokenCifrado FROM GmailIntegration WHERE correo = ? LIMIT 1', args: [config.account] });
  const encrypted = result.rows[0]?.refreshTokenCifrado;
  if (encrypted) {
    try {
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: decryptToken(String(encrypted)) }),
        cache: 'no-store',
      });
    } catch {
      // Local removal still prevents further access if Google's revocation endpoint is temporarily unavailable.
    }
  }
  await db.execute({ sql: 'DELETE FROM GmailIntegration WHERE correo = ?', args: [config.account] });
  await registrarAccion({ usuarioId: user.id, accion: 'desconectar_gmail', entidad: 'GmailIntegration', detalle: { correo: config.account } });
  return { data: { connected: false } } as const;
}
