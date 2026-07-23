import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = 'C:/Users/edits/sistema-escolar';
const docs = path.join(root, 'docs');
const outPng = path.join(docs, 'sigde-flujo-proyecto.png');
const outSvg = path.join(docs, 'sigde-flujo-proyecto.svg');

function b64(file) {
  return fs.readFile(file).then((buf) => `data:image/png;base64,${buf.toString('base64')}`);
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function lines(text, max = 24) {
  const words = String(text).split(/\s+/);
  const out = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      out.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) out.push(line);
  return out;
}

function multiline(text, x, y, opts = {}) {
  const {
    size = 14,
    color = '#111827',
    weight = 700,
    anchor = 'start',
    leading = 1.2,
    maxChars = 28,
  } = opts;
  const arr = Array.isArray(text) ? text : lines(text, maxChars);
  const dy = size * leading;
  return `
    <text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Arial, Helvetica, sans-serif"
          font-size="${size}" font-weight="${weight}" fill="${color}">
      ${arr.map((t, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : dy}">${esc(t)}</tspan>`).join('')}
    </text>
  `;
}

function rect(x, y, w, h, fill, stroke = 'none', sw = 1, rx = 18, extra = '') {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
}

function circle(cx, cy, r, fill, stroke = 'none', sw = 1) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" />`;
}

function image(href, x, y, w, h, preserve = 'xMidYMid slice') {
  return `<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${preserve}" />`;
}

function phoneFrame(x, y, w, h, screenMarkup, opts = {}) {
  const { dark = false, dashed = false, title = '' } = opts;
  const fill = dark ? '#0b1a2c' : '#ffffff';
  const stroke = dashed ? 'rgba(117,84,242,0.35)' : '#dce4f0';
  const innerX = x + 10;
  const innerY = y + 10;
  const innerW = w - 20;
  const innerH = h - 20;
  return `
    ${rect(x, y, w, h, fill, stroke, 1.4, 24)}
    ${rect(x + 9, y + 7, 64, 4, dark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)', 'none', 0, 999)}
    ${screenMarkup(innerX, innerY, innerW, innerH)}
    ${title ? multiline(title, x + w / 2, y + h + 16, { size: 10, color: '#6b7280', weight: 600, anchor: 'middle', maxChars: 30 }) : ''}
  `;
}

function futureDashboardScreen(x, y, w, h) {
  return `
    ${rect(x, y, w, h, 'url(#lightGrad)', '#e4eaf5', 1, 18)}
    ${rect(x, y, w, 30, 'url(#purpleGrad)', 'none', 0, 18)}
    <text x="${x + 12}" y="${y + 20}" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" fill="#ffffff">Hola, Usuario</text>
    ${rect(x + 11, y + 42, w - 22, 60, '#ffffff', '#d9e2f1', 1, 14)}
    <text x="${x + 23}" y="${y + 61}" font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="700" fill="#1f2d55">Resumen general</text>
    <text x="${x + 23}" y="${y + 95}" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800" fill="#111827">128</text>
    <text x="${x + 63}" y="${y + 94}" font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="700" fill="#2f855a">+12%</text>
    <path d="M ${x + 90} ${y + 86} L ${x + 108} ${y + 78} L ${x + 122} ${y + 81} L ${x + 138} ${y + 62} L ${x + 154} ${y + 67} L ${x + 170} ${y + 54}" fill="none" stroke="#33b07a" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="${x + 12}" y="${y + 124}" font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="700" fill="#1f2d55">Reportes recientes</text>
    ${rect(x + 11, y + 132, w - 22, 20, '#fff', '#e4eaf5', 1, 10)}
    ${rect(x + 11, y + 156, w - 22, 20, '#fff', '#e4eaf5', 1, 10)}
    ${rect(x + 11, y + 180, w - 22, 20, '#fff', '#e4eaf5', 1, 10)}
    <text x="${x + 20}" y="${y + 146}" font-family="Arial, Helvetica, sans-serif" font-size="8" fill="#4b5d7c">Reporte mensual</text>
    <text x="${x + 20}" y="${y + 170}" font-family="Arial, Helvetica, sans-serif" font-size="8" fill="#4b5d7c">Reporte semanal</text>
    <text x="${x + 20}" y="${y + 194}" font-family="Arial, Helvetica, sans-serif" font-size="8" fill="#4b5d7c">Reporte de ventas</text>
    ${rect(x + 9, y + h - 28, w - 18, 18, '#fff', '#d9e2f1', 1, 8)}
    <text x="${x + w / 2}" y="${y + h - 15}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="8" fill="#6b7280">Dashboard futuro</text>
  `;
}

function futureProfileScreen(x, y, w, h) {
  return `
    ${rect(x, y, w, h, 'url(#lightGrad)', '#e4eaf5', 1, 18)}
    <text x="${x + w / 2}" y="${y + 18}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" fill="#1f2d55">Mi Perfil</text>
    ${circle(x + w / 2, y + 48, 22, '#c8d2ea')}
    ${circle(x + w / 2, y + 45, 10, '#e8edf8')}
    ${rect(x + w / 2 - 14, y + 56, 28, 14, '#e8edf8', 'none', 0, 7)}
    ${rect(x + 20, y + 86, w - 40, 8, '#dfe6f2', 'none', 0, 999)}
    ${rect(x + 20, y + 108, w - 60, 8, '#dfe6f2', 'none', 0, 999)}
    ${rect(x + 20, y + 130, w - 40, 8, '#dfe6f2', 'none', 0, 999)}
    ${rect(x + 20, y + 152, w - 66, 8, '#dfe6f2', 'none', 0, 999)}
    ${rect(x + 14, y + h - 30, w - 28, 18, '#5b38e0', 'none', 0, 8)}
    <text x="${x + w / 2}" y="${y + h - 17}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="8" font-weight="700" fill="#ffffff">Guardar cambios</text>
  `;
}

function verificationScreen(x, y, w, h) {
  return `
    ${rect(x, y, w, h, 'url(#darkGrad)', '#102338', 1, 18)}
    <text x="${x + 12}" y="${y + 18}" font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="700" fill="rgba(255,255,255,0.72)">SIGDE</text>
    <circle cx="${x + w / 2}" cy="${y + 50}" r="24" fill="none" stroke="rgba(141,210,255,0.28)" stroke-width="2"/>
    <circle cx="${x + w / 2}" cy="${y + 50}" r="12" fill="#5ba8f6"/>
    <text x="${x + w / 2}" y="${y + 92}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" fill="#ffffff">Verificar código</text>
    <text x="${x + w / 2}" y="${y + 108}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="8" fill="rgba(255,255,255,0.72)">Ingresa los 6 dígitos enviados a tu correo</text>
    ${[0,1,2,3,4,5].map((i) => `
      ${rect(x + 14 + i * 24, y + 124, 18, 20, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.15)', 1, 5)}
    `).join('')}
    ${rect(x + 14, y + 155, w - 28, 18, '#2d7be6', 'none', 0, 7)}
    <text x="${x + w / 2}" y="${y + 167}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="8.5" font-weight="700" fill="#ffffff">Verificar código</text>
    ${rect(x + 14, y + 178, w - 28, 16, 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.14)', 1, 7)}
    <text x="${x + w / 2}" y="${y + 189}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="8" font-weight="700" fill="rgba(255,255,255,0.84)">Reenviar código</text>
  `;
}

function verificationMiniScreen(x, y, w, h) {
  return `
    ${rect(x, y, w, h, 'url(#darkGrad)', '#102338', 1, 16)}
    <text x="${x + 8}" y="${y + 12}" font-family="Arial, Helvetica, sans-serif" font-size="7.5" font-weight="700" fill="rgba(255,255,255,0.72)">SIGDE</text>
    <circle cx="${x + w / 2}" cy="${y + 28}" r="10" fill="none" stroke="rgba(141,210,255,0.28)" stroke-width="1.6"/>
    <circle cx="${x + w / 2}" cy="${y + 28}" r="5" fill="#5ba8f6"/>
    ${[0,1,2,3,4,5].map((i) => `
      ${rect(x + 10 + i * 12, y + 46, 8, 10, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.15)', 1, 3)}
    `).join('')}
    ${rect(x + 10, y + h - 19, w - 20, 10, '#2d7be6', 'none', 0, 5)}
    <text x="${x + w / 2}" y="${y + h - 12}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="6.5" font-weight="700" fill="#ffffff">Verificar código</text>
  `;
}

function sideProjectInfo(x, y, w, h) {
  return `
    ${rect(x, y, w, h, '#ffffff', '#d9e2f1', 1.2, 18)}
    ${rect(x + 10, y + 10, w - 20, h - 20, '#f8fbff', '#e7edf7', 1, 14)}
    ${multiline(['SIGDE', 'Sistema de Gestión Digital Escolar'], x + w / 2, y + 30, { size: 12, color: '#1f2d55', weight: 800, anchor: 'middle', maxChars: 22 })}
    ${rect(x + w / 2 - 23, y + 43, 46, 46, '#5b38e0', 'none', 0, 12)}
    <text x="${x + w / 2}" y="${y + 73}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="#ffffff">O</text>
    ${multiline(['Convivencia escolar', 'Acceso y seguimiento', 'Actual y proyectado'], x + w / 2, y + 108, { size: 9, color: '#5d6b86', weight: 600, anchor: 'middle', maxChars: 18 })}
    ${rect(x + 16, y + h - 42, w - 32, 24, '#ffffff', '#d9e2f1', 1, 10)}
    <text x="${x + w / 2}" y="${y + h - 26}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="700" fill="#5b38e0">SIGDE</text>
  `;
}

function sidePlanned(x, y, w, h) {
  return `
    ${rect(x, y, w, h, '#ffffff', '#d9e2f1', 1.2, 18)}
    ${multiline(['Lo que', 'tenemos pensado hacer'], x + w / 2, y + 24, { size: 12, color: '#1f2d55', weight: 800, anchor: 'middle', maxChars: 20 })}
    <g>
      ${['Dashboard', 'Usuarios', 'Estudiantes', 'Reportes', 'Perfil'].map((t, i) => `
        ${rect(x + 16, y + 40 + i * 22, w - 32, 16, i % 2 === 0 ? '#f8fbff' : '#ffffff', '#e7edf7', 1, 8)}
        <text x="${x + 28}" y="${y + 52 + i * 22}" font-family="Arial, Helvetica, sans-serif" font-size="8.5" font-weight="700" fill="#4b5d7c">${t}</text>
      `).join('')}
    </g>
  `;
}

function navSidebar(x, y, w, h) {
  return `
    <defs>
      <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f5f8ff"/>
        <stop offset="100%" stop-color="#edf3ff"/>
      </linearGradient>
    </defs>
    ${rect(x, y, w, h, 'url(#navGrad)', '#dfe8f6', 1, 16)}
    ${rect(x + 10, y + 10, w - 20, 24, '#ffffff', '#dfe8f6', 1, 10)}
    <text x="${x + w / 2}" y="${y + 26}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="800" fill="#22315f">MENÚ HAMBURGUESA</text>
    ${['Juan Pérez', 'Ver perfil', 'Dashboard', 'Reportes', 'Contenidos', 'Perfil', 'Cerrar sesión'].map((t, i) => `
      ${rect(x + 10, y + 40 + i * 17, w - 20, 13, i === 0 ? '#edf3ff' : '#ffffff', '#e1e8f5', 1, 7)}
      <text x="${x + 18}" y="${y + 50 + i * 17}" font-family="Arial, Helvetica, sans-serif" font-size="7.5" font-weight="${i === 0 ? 700 : 600}" fill="${i === 6 ? '#d64545' : '#4b5d7c'}">${t}</text>
    `).join('')}
  `;
}

function navMain(x, y, w, h) {
  return `
    ${rect(x, y, w, h, '#ffffff', '#d9e2f1', 1.2, 16)}
    ${multiline(['Navegación principal', '(desde el Dashboard)'], x + w / 2, y + 24, { size: 13, color: '#1f2d55', weight: 800, anchor: 'middle', maxChars: 26 })}
    ${rect(x + 110, y + 42, w - 220, 28, '#fff', '#d9e2f1', 1, 11)}
    <text x="${x + w / 2}" y="${y + 60}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" fill="#1f2d55">NAVEGACIÓN PRINCIPAL</text>
    <line x1="${x + w / 2}" y1="${y + 70}" x2="${x + w / 2}" y2="${y + 94}" stroke="#4b5563" stroke-width="1.4"/>
    ${[x + 50, x + w / 2, x + w - 50].map((cx) => `
      <line x1="${x + w / 2}" y1="${y + 94}" x2="${cx}" y2="${y + 94}" stroke="#4b5563" stroke-width="1.4"/>
      <line x1="${cx}" y1="${y + 94}" x2="${cx}" y2="${y + 110}" stroke="#4b5563" stroke-width="1.4"/>
      <path d="M ${cx - 4} ${y + 107} L ${cx} ${y + 111} L ${cx + 4} ${y + 107}" fill="none" stroke="#4b5563" stroke-width="1.4"/>
    `).join('')}
    ${[
      { x: x + 14, title: 'Dashboard / Reportes', text: 'Vista principal con resumen y accesos rápidos.', icon: '#5b38e0' },
      { x: x + w / 2 - 48, title: 'Contenidos', text: 'Acceso a pantallas y módulos disponibles.', icon: '#f59e0b' },
      { x: x + w - 106, title: 'Buscador / Filtro', text: 'Buscar y filtrar por categorías.', icon: '#7c3aed' },
    ].map((item) => `
      ${rect(item.x, y + 116, 92, 90, '#ffffff', '#d9e2f1', 1, 12)}
      ${rect(item.x + 31, y + 126, 30, 22, item.icon, 'none', 0, 8)}
      <text x="${item.x + 46}" y="${y + 142}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="800" fill="#1f2d55">${esc(item.title).replace(' / ', ' / ')}</text>
      <text x="${item.x + 8}" y="${y + 162}" font-family="Arial, Helvetica, sans-serif" font-size="7.6" fill="#5d6b86">${esc(item.text)}</text>
    `).join('')}
    ${['Dashboard', 'Contenidos', 'Buscar', 'Perfil', 'Módulos'].map((t, i) => `
      ${rect(x + 140 + i * 90, y + h - 52, 80, 40, '#fbfdff', '#e7edf7', 1, 12)}
      <text x="${x + 180 + i * 90}" y="${y + h - 28}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="700" fill="#4b5d7c">${t}</text>
    `).join('')}
  `;
}

function contentSection(x, y, w, h, images) {
  const cardW = (w - 30) / 3;
  return `
    ${rect(x, y, w, h, '#ffffff', '#d9e2f1', 1.2, 16)}
    ${multiline(['Flujo de contenidos', '(Explorar información)'], x + 14, y + 22, { size: 13, color: '#0b52d6', weight: 800, maxChars: 22 })}
    ${[
      { title: 'Login', subtitle: 'Pantalla de inicio', img: images.loginReal },
      { title: 'Recuperación', subtitle: 'Restablecer acceso', img: images.recoveryReal },
      { title: 'Código', subtitle: 'Verificación de 6 dígitos', kind: 'verify' },
    ].map((item, i) => {
      const cx = x + 14 + i * (cardW + 10);
      return `
        ${rect(cx, y + 40, cardW, h - 54, '#ffffff', '#d9e2f1', 1, 14)}
        ${multiline([item.title, item.subtitle], cx + 10, y + 54, { size: 10.5, color: '#1f2d55', weight: 800, maxChars: 18 })}
        ${rect(cx + 10, y + 70, cardW - 20, 86, '#fbfdff', '#d9e2f1', 1, 10)}
        ${item.kind === 'verify'
          ? verificationMiniScreen(cx + 11, y + 71, cardW - 22, 84)
          : image(item.img, cx + 11, y + 71, cardW - 22, 84, 'xMidYMid slice')}
        ${multiline(item.title === 'Login' ? 'Inicio de sesión real del proyecto.' : item.title === 'Recuperación' ? 'Pantalla de recuperación de contraseña.' : 'Paso de seguridad con código enviado al correo.', cx + 10, y + 162, { size: 8.5, color: '#5d6b86', weight: 600, maxChars: 24 })}
      `;
    }).join('')}
    ${rect(x + 14, y + h - 28, w - 28, 16, '#f9fbff', '#e7edf7', 1, 8)}
    <text x="${x + w / 2}" y="${y + h - 17}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="8.5" fill="#6b7280">Login, recuperación y verificación: lo que ya tenemos listo para mostrar</text>
  `;
}

function legendSection(x, y, w, h) {
  const items = [
    ['Flujo principal', '#263fd6'],
    ['Acceso secundario / opcional', '#7554f2'],
    ['Navegación desde el menú', '#16a34a'],
    ['Exploración de contenidos', '#0b84d8'],
  ];
  return `
    ${rect(x, y, w, h, '#ffffff', '#d9e2f1', 1.2, 16)}
    ${multiline(['Leyenda', '(Cómo leer la lámina)'], x + 14, y + 24, { size: 13, color: '#f59e0b', weight: 800, maxChars: 18 })}
    ${items.map((item, i) => `
      <line x1="${x + 20}" y1="${y + 48 + i * 26}" x2="${x + 58}" y2="${y + 48 + i * 26}" stroke="${item[1]}" stroke-width="3" ${i === 1 ? 'stroke-dasharray="6 5"' : ''}/>
      <path d="M ${x + 56} ${y + 43 + i * 26} L ${x + 62} ${y + 48 + i * 26} L ${x + 56} ${y + 53 + i * 26}" fill="none" stroke="${item[1]}" stroke-width="2.2"/>
      <text x="${x + 78}" y="${y + 51 + i * 26}" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" fill="#4b5d7c">${esc(item[0])}</text>
    `).join('')}
    <g transform="translate(${x + 10}, ${y + 150})">
      <circle cx="10" cy="10" r="8" fill="#5b38e0"/><text x="10" y="14" text-anchor="middle" font-family="Arial" font-size="10" font-weight="700" fill="#fff">A</text>
      <text x="28" y="13" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#4b5d7c">Acciones del usuario</text>
      <circle cx="10" cy="34" r="8" fill="#6b7280"/><rect x="7" y="29" width="6" height="10" rx="1" fill="#fff"/>
      <text x="28" y="37" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#4b5d7c">Pantallas / interfaces</text>
      <circle cx="10" cy="58" r="8" fill="#0b84d8"/><rect x="6" y="54" width="8" height="8" rx="1.5" fill="#fff"/>
      <text x="28" y="61" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#4b5d7c">Contenidos / información</text>
      <circle cx="10" cy="82" r="8" fill="#f59e0b"/><path d="M 6 82 L 10 76 L 14 82 L 10 88 Z" fill="#fff"/>
      <text x="28" y="85" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#4b5d7c">Funciones / herramientas</text>
    </g>
  `;
}

function footerSection(x, y, w, h) {
  return `
    ${rect(x, y, w, h, 'url(#footerGrad)', '#d9e2f1', 1.2, 16)}
    <circle cx="${x + 40}" cy="${y + 42}" r="24" fill="#5b38e0"/>
    <text x="${x + 40}" y="${y + 48}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="#ffffff">◔</text>
    ${multiline(['Resumen', 'del flujo'], x + 80, y + 32, { size: 12, color: '#233b8b', weight: 800, maxChars: 12 })}
    ${multiline([
      'Carga → Login → Recuperación → Código → Nueva contraseña → Sesión iniciada / cierre.',
      'Dashboard, Usuarios, Estudiantes, Reportes y Perfil quedan como módulos proyectados.'
    ], x + 210, y + 32, { size: 12, color: '#1f2d55', weight: 600, maxChars: 96, leading: 1.35 })}
  `;
}

async function main() {
  const assets = {
    loading: await b64(path.join(docs, 'Cargando.PNG')),
    loginMobile: await b64(path.join(docs, 'login-mobile.png')),
    recoveryMobile: await b64(path.join(docs, 'recovery-mobile.png')),
    codeMobile: await b64(path.join(docs, 'code-mobile.png')),
    loginReal: await b64(path.join(docs, 'login-real.png')),
    recoveryReal: await b64(path.join(docs, 'recovery-real.png')),
    codeReal: await b64(path.join(docs, 'code-real.png')),
  };

  const W = 1600;
  const H = 1100;
  const topY = 98;
  const topH = 430;
  const leftX = 60;
  const rightX = 1345;
  const mainW = 1480;

  const stepXs = [82, 300, 518, 736, 954, 1172];
  const arrows = [260, 478, 696, 914, 1132];

  const topNodes = [
    {
      title: ['Cargando', 'la App'],
      subtitle: 'Estado de espera antes de mostrar el acceso.',
      number: '1',
      image: assets.loading,
      accent: '#5b38e0',
    },
    {
      title: ['Pantalla', 'de inicio'],
      subtitle: 'Correo, contraseña y recordar usuario.',
      number: '2',
      image: assets.loginMobile,
      accent: '#5b38e0',
    },
    {
      title: ['Recuperar', 'contraseña'],
      subtitle: 'Solicita el correo institucional.',
      number: '3',
      image: assets.recoveryMobile,
      accent: '#5b38e0',
    },
    {
      title: ['Verificar', 'código'],
      subtitle: 'Validación de 6 dígitos enviada al correo.',
      number: '4',
      verify: true,
      accent: '#5b38e0',
    },
    {
      title: ['Dashboard /', 'Reportes'],
      subtitle: 'Pantalla futura para el resumen general.',
      number: '5',
      future: true,
      accent: '#5b38e0',
    },
    {
      title: ['Perfil de Usuario /', 'Personalización'],
      subtitle: 'Ajustes y datos personales.',
      number: '6',
      future: true,
      accent: '#1fa7a6',
    },
  ];

  const nodeMarkup = topNodes.map((node, i) => {
    const x = stepXs[i];
    const y = 172;
    const w = 188;
    const h = 310;
    const titleY = y - 28;
    const phoneY = y + 28;
    const titleX = x + 4;
    const numberFill = node.accent;
    const phone = node.future
      ? (node.number === '5'
        ? phoneFrame(x, phoneY, w, 280, (ix, iy, iw, ih) => futureDashboardScreen(ix, iy, iw, ih), { dark: false, title: '' })
        : phoneFrame(x, phoneY, w, 280, (ix, iy, iw, ih) => futureProfileScreen(ix, iy, iw, ih), { dark: false, title: '' }))
      : node.verify
        ? phoneFrame(x, phoneY, w, 280, (ix, iy, iw, ih) => verificationScreen(ix, iy, iw, ih), { dark: false, title: '' })
      : phoneFrame(x, phoneY, w, 280, (ix, iy, iw, ih) => image(node.image, ix, iy, iw, ih, 'xMidYMid slice'), { title: '' });
    return `
      <g>
        <circle cx="${x + 14}" cy="${titleY + 10}" r="11" fill="${numberFill}"/>
        <text x="${x + 14}" y="${titleY + 14}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="800" fill="#ffffff">${node.number}</text>
        ${multiline(node.title, x + 34, titleY + 13, { size: 11.2, color: '#1f2d55', weight: 800, maxChars: 18 })}
        ${multiline(node.subtitle, x, y + 300, { size: 8.5, color: '#6b7280', weight: 600, maxChars: 24 })}
        ${phone}
      </g>
    `;
  }).join('');

  const rightCards = `
    <g>
      <circle cx="${rightX + 18}" cy="${topY + 18}" r="13" fill="#5b38e0"/>
      <text x="${rightX + 18}" y="${topY + 22}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="800" fill="#ffffff">7</text>
      ${multiline(['Términos y', 'condiciones'], rightX + 42, topY + 16, { size: 12, color: '#1f2d55', weight: 800, maxChars: 14 })}
      ${rect(rightX, topY + 40, 180, 160, '#ffffff', '#d9e2f1', 1.2, 16)}
      ${rect(rightX + 12, topY + 50, 156, 140, '#f8fbff', '#e7edf7', 1, 12)}
      <text x="${rightX + 90}" y="${topY + 71}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="800" fill="#1f2d55">SIGDE</text>
      ${multiline(['Sistema de Gestión', 'Digital Escolar', 'Convivencia y', 'seguimiento'], rightX + 90, topY + 94, { size: 8.3, color: '#5d6b86', weight: 600, anchor: 'middle', maxChars: 16 })}
      ${rect(rightX + 35, topY + 164, 110, 16, '#5b38e0', 'none', 0, 6)}
      <text x="${rightX + 90}" y="${topY + 175}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="8.5" font-weight="700" fill="#ffffff">Aceptar</text>
    </g>
    <g>
      <circle cx="${rightX + 18}" cy="${topY + 246}" r="13" fill="#5b38e0"/>
      <text x="${rightX + 18}" y="${topY + 250}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="800" fill="#ffffff">8</text>
      ${multiline(['Créditos /', 'Información de la App'], rightX + 42, topY + 244, { size: 12, color: '#1f2d55', weight: 800, maxChars: 16 })}
      ${rect(rightX, topY + 268, 180, 182, '#ffffff', '#d9e2f1', 1.2, 16)}
      ${rect(rightX + 12, topY + 278, 156, 162, '#f8fbff', '#e7edf7', 1, 12)}
      <text x="${rightX + 90}" y="${topY + 301}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="800" fill="#1f2d55">SIGDE</text>
      ${multiline(['Construido para', 'presentación de', 'convivencia escolar', 'y flujo digital'], rightX + 90, topY + 324, { size: 8.2, color: '#5d6b86', weight: 600, anchor: 'middle', maxChars: 18 })}
      ${rect(rightX + 38, topY + 399, 104, 16, '#5b38e0', 'none', 0, 6)}
      <text x="${rightX + 90}" y="${topY + 410}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="8.5" font-weight="700" fill="#ffffff">Créditos</text>
    </g>
  `;

  const navX = 60;
  const navY = 550;
  const navW = 680;
  const navH = 250;
  const contX = 750;
  const contY = 550;
  const contW = 490;
  const contH = 250;
  const legX = 1260;
  const legY = 550;
  const legW = 280;
  const legH = 250;

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fbfcff"/>
        <stop offset="100%" stop-color="#f4f7fc"/>
      </linearGradient>
      <linearGradient id="footerGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="rgba(38,63,214,0.07)"/>
        <stop offset="100%" stop-color="rgba(117,84,242,0.06)"/>
      </linearGradient>
      <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#5b38e0"/>
        <stop offset="100%" stop-color="#3f2bb4"/>
      </linearGradient>
      <linearGradient id="lightGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#f6f8fd"/>
      </linearGradient>
      <linearGradient id="darkGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0b1a2c"/>
        <stop offset="100%" stop-color="#102338"/>
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%">
        <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#101828" flood-opacity="0.10"/>
      </filter>
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="160%">
        <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#101828" flood-opacity="0.08"/>
      </filter>
    </defs>

    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bgGrad)"/>
    <circle cx="800" cy="0" r="280" fill="rgba(38,63,214,0.05)"/>

    <text x="${W / 2}" y="44" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="33" font-weight="800" fill="#13286d">FLUJO DE USUARIO, NAVEGACIÓN Y CONTENIDOS DE LA APP</text>
    <text x="${W / 2}" y="72" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="400" fill="#59657f">Diagrama del recorrido completo del usuario en la aplicación</text>

    ${rect(leftX, topY, mainW, 430, '#ffffff', '#d9def4', 1.2, 18)}
    <g transform="translate(80, 130)">
      <circle cx="10" cy="10" r="10" fill="none" stroke="#5b38e0" stroke-width="2"/>
      <path d="M 10 0 C 7 0 5 2 5 5 C 5 7 6 9 8 10 C 5 12 2 15 2 20 M 10 0 C 13 0 15 2 15 5 C 15 7 14 9 12 10 C 15 12 18 15 18 20" fill="none" stroke="#5b38e0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${multiline(['1. FLUJO DE USUARIO', '(Recorrido principal)'], 34, 15, { size: 13, color: '#1f2d55', weight: 800, maxChars: 28 })}
    </g>

    ${topNodes.map((_, i) => `<circle cx="${stepXs[i] + 10}" cy="172" r="0" fill="none"/>`).join('')}
    ${nodeMarkup}
    ${[0,1,2,3,4].map((i) => {
      const x1 = arrows[i];
      const x2 = x1 + 28;
      return `<line x1="${x1}" y1="304" x2="${x2}" y2="304" stroke="#5b38e0" stroke-width="2.2"/><path d="M ${x2 - 6} 299 L ${x2} 304 L ${x2 - 6} 309" fill="none" stroke="#5b38e0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    }).join('')}
    ${rightCards}

    ${rect(navX, navY, navW, navH, '#ffffff', '#d9e2f1', 1.2, 16)}
    ${multiline(['2. FLUJO DE NAVEGACIÓN', '(Estructura y accesos)'], navX + 14, navY + 24, { size: 13, color: '#16a34a', weight: 800, maxChars: 24 })}
    ${navSidebar(navX + 10, navY + 34, 146, 190)}
    ${navMain(navX + 168, navY + 34, 500, 190)}

    ${rect(contX, contY, contW, contH, '#ffffff', '#d9e2f1', 1.2, 16)}
    ${multiline(['3. FLUJO DE CONTENIDOS', '(Explorar información)'], contX + 14, contY + 24, { size: 13, color: '#0b84d8', weight: 800, maxChars: 24 })}
    ${contentSection(contX + 4, contY + 28, contW - 8, contH - 36, assets)}

    ${legendSection(1260, 550, 280, 250)}

    ${footerSection(60, 840, 1480, 86)}
  </svg>
  `;

  await fs.writeFile(outSvg, svg, 'utf8');
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  await fs.writeFile(outPng, png);
  console.log(`Wrote ${outPng}`);
}

await main();
