import fs from "node:fs/promises";
import path from "node:path";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const TMP_DIR = "C:/Users/edits/sistema-escolar/.codex/sigde-pptx-build";
const FINAL_PPTX = "C:/Users/edits/sistema-escolar/SIGDE_Avances_Proyecto_v2.pptx";

const paths = {
  logo: "C:/Users/edits/sistema-escolar/frontend/public/Logo-login.png",
  logoFull: "C:/Users/edits/sistema-escolar/frontend/public/Logo.png",
  background: "C:/Users/edits/sistema-escolar/frontend/public/sigde-space-background.png",
  login: "C:/Users/edits/AppData/Local/Temp/codex-clipboard-23807993-f086-4f90-907b-140af167cc61.png",
  dashboardCoord: "C:/Users/edits/AppData/Local/Temp/codex-clipboard-280987c4-4828-49ba-954f-1c1e265ce3e6.png",
  dashboardCollapsed: "C:/Users/edits/AppData/Local/Temp/codex-clipboard-affd2f35-8448-426d-895c-367cbf9c9f85.png",
  dashboardDocente: "C:/Users/edits/AppData/Local/Temp/codex-clipboard-f323f7f9-6fc8-4552-9729-5569fbef70e1.png",
  dashboardPorteria: "C:/Users/edits/AppData/Local/Temp/codex-clipboard-02e47e51-1836-4819-bd81-335f40c1c329.png",
  reportes: "C:/Users/edits/AppData/Local/Temp/codex-clipboard-a5e4f482-051f-4c30-befb-ebea0b2f754d.png",
  nuevoReporte: "C:/Users/edits/AppData/Local/Temp/codex-clipboard-a82e8277-61f2-48a8-ac20-267b43f6a2cf.png",
  salidas: "C:/Users/edits/AppData/Local/Temp/codex-clipboard-2083fb94-993e-442c-9c5b-5df6c610a68d.png",
  registrarSalida: "C:/Users/edits/AppData/Local/Temp/codex-clipboard-09e92bdb-6b5b-4a26-a5bb-e63f3d14cd23.png",
  comunicaciones: "C:/Users/edits/AppData/Local/Temp/codex-clipboard-e8d41022-5ade-4b0d-a919-ab6586f53cd4.png",
  usuarios: "C:/Users/edits/AppData/Local/Temp/codex-clipboard-553968ba-e62c-48e0-b741-4d0219462c11.png",
  configuracion: "C:/Users/edits/AppData/Local/Temp/codex-clipboard-c80c1d51-d137-42e8-ae30-6198f97dd1f1.png",
  auditoria: "C:/Users/edits/AppData/Local/Temp/codex-clipboard-2bafa633-28e5-4848-b049-36ac675c2112.png",
  perfil: "C:/Users/edits/AppData/Local/Temp/codex-clipboard-6bf3511d-1b9f-43fa-8759-bd602ba2ca3a.png",
  recuperar: "C:/Users/edits/AppData/Local/Temp/codex-clipboard-7a6435bf-a8cb-488a-b747-d3abf22b98b4.png",
  codigo: "C:/Users/edits/AppData/Local/Temp/codex-clipboard-a9067e59-caa7-4277-9f1c-56cab529aa2a.png",
  nuevaContrasena: "C:/Users/edits/AppData/Local/Temp/codex-clipboard-c9801032-4448-4829-956b-1b6c7060a6c6.png",
  terminos: "C:/Users/edits/AppData/Local/Temp/codex-clipboard-a37271a1-39e4-4d16-807b-a5fef0300eb0.png",
  politica: "C:/Users/edits/AppData/Local/Temp/codex-clipboard-4c5fb432-0345-48c9-a4d0-444f1269fab6.png",
};

const C = {
  navy: "#07162B",
  navy2: "#0A1D35",
  panel: "#0E2743",
  panel2: "#123553",
  blue: "#1F6FB8",
  blue2: "#2B88D0",
  cyan: "#39C4E6",
  sky: "#85D8F0",
  white: "#F4F8FC",
  muted: "#A8B8C9",
  muted2: "#71879D",
  line: "#244A6C",
  gold: "#F5B94C",
  green: "#41C39B",
  red: "#F16A70",
  cloud: "#EAF2FA",
  ink: "#10243B",
};

const W = 1280;
const H = 720;
const FONT = "Aptos";
const FONT_DISPLAY = "Aptos Display";

async function readBytes(filePath) {
  const bytes = await fs.readFile(filePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function loadAssets() {
  const result = {};
  for (const [key, filePath] of Object.entries(paths)) {
    result[key] = await readBytes(filePath);
  }
  return result;
}

function rect(slide, x, y, w, h, fill, options = {}) {
  const geometry = options.geometry || "roundRect";
  const config = {
    geometry,
    name: options.name,
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: options.line || { style: "solid", fill: fill === "none" ? "none" : C.line, width: options.lineWidth ?? 1 },
    shadow: options.shadow || "shadow-none",
  };
  if (["rect", "textbox", "roundRect"].includes(geometry)) config.borderRadius = options.radius ?? 16;
  return slide.shapes.add(config);
}

function textBox(slide, text, x, y, w, h, options = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name: options.name,
    position: { left: x, top: y, width: w, height: h },
    fill: options.fill || "none",
    line: { style: "solid", fill: options.lineFill || "none", width: options.lineWidth || 0 },
    borderRadius: options.radius,
  });
  shape.text = text;
  shape.text.style = {
    fontFamily: options.fontFamily || FONT,
    fontSize: options.size || 18,
    bold: options.bold || false,
    italic: options.italic || false,
    color: options.color || C.white,
    alignment: options.align || "left",
    verticalAlignment: options.valign || "top",
  };
  return shape;
}

function line(slide, x, y, w, h = 0, color = C.line, width = 1) {
  return slide.shapes.add({
    geometry: "line",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: color, width },
  });
}

function addImage(slide, bytes, x, y, w, h, alt, options = {}) {
  if (options.frame !== false) {
    rect(slide, x - 3, y - 3, w + 6, h + 6, options.frameFill || C.panel, {
      radius: options.radius ?? 16,
      line: { style: "solid", fill: options.frameLine || C.line, width: options.lineWidth ?? 1.5 },
      shadow: options.shadow || "shadow-md",
    });
  }
  return slide.images.add({
    blob: bytes,
    contentType: "image/png",
    alt,
    fit: options.fit || "cover",
    crop: options.crop,
    geometry: options.geometry || "roundRect",
    borderRadius: options.radius ?? 14,
    position: { left: x, top: y, width: w, height: h },
  });
}

function pill(slide, label, x, y, w, fill, color = C.white) {
  rect(slide, x, y, w, 28, fill, { radius: 14, line: { style: "solid", fill, width: 0 } });
  textBox(slide, label, x, y + 3, w, 20, { size: 12, bold: true, color, align: "center", valign: "middle" });
}

function sectionHeader(slide, number, title, subtitle = "") {
  slide.background.fill = C.navy;
  textBox(slide, `SIGDE  /  ${String(number).padStart(2, "0")}`, 60, 36, 250, 24, {
    size: 13,
    bold: true,
    color: C.cyan,
  });
  textBox(slide, title, 60, 70, 1158, 58, {
    size: 36,
    bold: true,
    color: C.white,
    fontFamily: FONT_DISPLAY,
  });
  if (subtitle) {
    textBox(slide, subtitle, 60, 126, 1110, 34, { size: 17, color: C.muted });
  }
  line(slide, 60, 166, 1160, 0, C.line, 1);
}

function footer(slide, number) {
  line(slide, 60, 682, 1160, 0, C.line, 1);
  textBox(slide, "SIGDE · Avances del proyecto", 60, 690, 310, 18, { size: 11, color: C.muted2 });
  textBox(slide, String(number).padStart(2, "0"), 1168, 688, 52, 20, { size: 12, bold: true, color: C.cyan, align: "right" });
}

function bullet(slide, label, body, x, y, w, accent = C.cyan) {
  rect(slide, x, y + 3, 9, 9, accent, { geometry: "ellipse", radius: 5, line: { style: "solid", fill: accent, width: 0 } });
  textBox(slide, label, x + 22, y - 2, w - 22, 27, { size: 19, bold: true, color: C.white });
  textBox(slide, body, x + 22, y + 26, w - 22, 46, { size: 16, color: C.muted });
}

function calloutNumber(slide, number, x, y, color = C.cyan) {
  rect(slide, x, y, 34, 34, color, { geometry: "ellipse", radius: 17, line: { style: "solid", fill: C.white, width: 2 }, shadow: "shadow-sm" });
  textBox(slide, String(number), x, y + 4, 34, 22, { size: 16, bold: true, color: C.navy, align: "center", valign: "middle" });
}

function addNotes(slide, sourceLines, presenterLines = []) {
  const notes = [
    ...presenterLines,
    "",
    "[Sources]",
    ...sourceLines.map((item) => `- ${item}`),
    "[/Sources]",
  ].join("\n");
  slide.speakerNotes.textFrame.setText(notes);
  slide.speakerNotes.setVisible(false);
}

function addRightArrow(slide, x, y, w, h, color = C.blue) {
  return slide.shapes.add({
    geometry: "rightArrow",
    position: { left: x, top: y, width: w, height: h },
    fill: color,
    line: { style: "solid", fill: color, width: 0 },
  });
}

function addDownArrow(slide, x, y, w, h, color = C.blue) {
  return slide.shapes.add({
    geometry: "downArrow",
    position: { left: x, top: y, width: w, height: h },
    fill: color,
    line: { style: "solid", fill: color, width: 0 },
  });
}

function node(slide, label, sublabel, x, y, w, h, accent = C.cyan) {
  const shape = rect(slide, x, y, w, h, C.panel, {
    radius: 16,
    line: { style: "solid", fill: accent, width: 1.5 },
    shadow: "shadow-sm",
  });
  textBox(slide, label, x + 14, y + 18, w - 28, 28, { size: 20, bold: true, color: C.white, align: "center" });
  textBox(slide, sublabel, x + 12, y + 50, w - 24, 34, { size: 14, color: C.muted, align: "center" });
  return shape;
}

async function main() {
  await fs.mkdir(path.join(TMP_DIR, "rendered"), { recursive: true });
  const A = await loadAssets();
  const deck = Presentation.create({ slideSize: { width: W, height: H } });

  // 1. Portada
  {
    const slide = deck.slides.add();
    slide.images.add({ blob: A.background, contentType: "image/png", alt: "Fondo espacial educativo de SIGDE", fit: "cover", position: { left: 0, top: 0, width: W, height: H } });
    rect(slide, 365, 132, 550, 360, C.navy, { radius: 26, line: { style: "solid", fill: C.line, width: 1.5 }, shadow: "shadow-xl" });
    slide.images.add({ blob: A.logo, contentType: "image/png", alt: "Logo SIGDE", fit: "contain", position: { left: 555, top: 153, width: 170, height: 170 } });
    textBox(slide, "SIGDE", 420, 326, 440, 76, { size: 58, bold: true, color: C.white, align: "center", fontFamily: FONT_DISPLAY });
    textBox(slide, "SISTEMA DE GESTIÓN DIGITAL ESCOLAR", 420, 397, 440, 30, { size: 16, bold: true, color: C.sky, align: "center" });
    textBox(slide, "Registro, seguimiento y análisis de convivencia en tiempo real.", 410, 437, 460, 50, { size: 18, color: C.white, align: "center" });
    pill(slide, "PROYECTO ESCOLAR · GRADO 11 · 2026", 60, 52, 300, C.blue);
    textBox(slide, "Alejandro Hurtado", 60, 615, 360, 34, { size: 22, bold: true, color: C.white });
    textBox(slide, "I.E.T.I. Rafael Navia Varón", 60, 651, 420, 24, { size: 15, color: C.muted });
    addNotes(slide, [paths.background, paths.logo], ["Presentar el nombre completo y el propósito del proyecto."]);
  }

  // 2. Qué es SIGDE
  {
    const slide = deck.slides.add();
    sectionHeader(slide, 2, "SIGDE convierte la gestión escolar en un flujo trazable", "Una plataforma web para organizar convivencia, salidas, comunicaciones y seguridad por roles.");
    bullet(slide, "Centraliza la información", "Reúne reportes, estudiantes, usuarios, salidas y comunicaciones en un solo sistema.", 70, 210, 380, C.cyan);
    bullet(slide, "Asigna acceso según el rol", "Coordinador, Docente y Portería ven únicamente las funciones necesarias para su trabajo.", 70, 315, 380, C.blue2);
    bullet(slide, "Conserva evidencia", "Registra estados, responsables y movimientos para facilitar el seguimiento institucional.", 70, 420, 380, C.green);
    rect(slide, 70, 548, 370, 70, C.panel2, { radius: 14, line: { style: "solid", fill: C.line, width: 1 } });
    textBox(slide, "Las alertas se basan en umbrales configurables; no se presentan como inteligencia artificial.", 88, 565, 334, 46, { size: 15, color: C.sky });
    addImage(slide, A.login, 495, 200, 725, 390, "Pantalla de inicio de sesión de SIGDE", { fit: "cover", crop: { left: 0.015, top: 0.02, right: 0.015, bottom: 0.02 }, radius: 18 });
    footer(slide, 2);
    addNotes(slide, [paths.login, "Resumen basado en los módulos y servicios del repositorio SIGDE."], ["Explicar SIGDE en una sola frase antes de enumerar los módulos."]);
  }

  // 3. Problemas y respuesta
  {
    const slide = deck.slides.add();
    sectionHeader(slide, 3, "El problema no era registrar más, sino conectar el proceso", "SIGDE responde a tres dificultades observadas en la gestión disciplinaria y operativa.");
    const pairs = [
      ["Información dispersa", "Un solo registro digital por estudiante, hecho y responsable."],
      ["Seguimiento manual", "Estados, filtros, evidencias y auditoría para reconstruir cada caso."],
      ["Acceso poco diferenciado", "Permisos por rol y módulos específicos para cada responsabilidad."],
    ];
    pairs.forEach((item, i) => {
      const y = 207 + i * 118;
      textBox(slide, item[0], 70, y, 275, 34, { size: 21, bold: true, color: i === 0 ? C.gold : C.white });
      addRightArrow(slide, 348, y + 5, 64, 24, i === 0 ? C.gold : C.blue);
      textBox(slide, item[1], 432, y - 2, 350, 64, { size: 17, color: C.muted });
      if (i < 2) line(slide, 70, y + 88, 712, 0, C.line, 1);
    });
    addImage(slide, A.reportes, 820, 207, 400, 344, "Consulta de reportes disciplinarios", { fit: "cover", crop: { left: 0.10, top: 0.07, right: 0.02, bottom: 0.08 }, radius: 18 });
    rect(slide, 820, 560, 400, 88, C.panel2, { radius: 14, line: { style: "solid", fill: C.blue, width: 1.2 } });
    textBox(slide, "Resultado esperado", 840, 573, 150, 20, { size: 14, bold: true, color: C.cyan });
    textBox(slide, "Menos pérdida de contexto y decisiones mejor documentadas.", 840, 598, 350, 40, { size: 15, color: C.white });
    footer(slide, 3);
    addNotes(slide, [paths.reportes, "Problemas y soluciones derivados del alcance funcional del proyecto."], ["No afirmar resultados medidos; presentar la mejora como objetivo del sistema."]);
  }

  // 4. Diseño
  {
    const slide = deck.slides.add();
    sectionHeader(slide, 4, "El diseño combina confianza institucional y cercanía escolar", "La identidad visual nace del login y se mantiene en los paneles de trabajo.");
    slide.images.add({ blob: A.logoFull, contentType: "image/png", alt: "Marca gráfica completa de SIGDE", fit: "contain", position: { left: 70, top: 210, width: 240, height: 240 } });
    textBox(slide, "Libro abierto + circuitos", 72, 462, 240, 30, { size: 21, bold: true, color: C.white, align: "center" });
    textBox(slide, "Educación, tecnología y trazabilidad en una sola marca.", 78, 500, 228, 58, { size: 16, color: C.muted, align: "center" });
    const colors = [
      [C.navy, "#0A1628", "Base / navegación"],
      [C.blue, "#1F6FB8", "Acciones principales"],
      [C.cyan, "#39C4E6", "Acentos y estados"],
      [C.cloud, "#EAF2FA", "Contraste y lectura"],
      [C.gold, "#F5B94C", "Alertas y atención"],
    ];
    colors.forEach((item, i) => {
      const x = 360 + i * 166;
      rect(slide, x, 225, 138, 92, item[0], { radius: 18, line: { style: "solid", fill: i === 3 ? C.line : item[0], width: 1.2 } });
      textBox(slide, item[1], x, 329, 138, 24, { size: 15, bold: true, color: C.white, align: "center" });
      textBox(slide, item[2], x + 4, 358, 130, 40, { size: 14, color: C.muted, align: "center" });
    });
    rect(slide, 360, 430, 802, 140, C.panel, { radius: 18, line: { style: "solid", fill: C.line, width: 1 } });
    textBox(slide, "Principios visuales", 386, 452, 210, 28, { size: 23, bold: true, color: C.white });
    textBox(slide, "Contraste alto", 386, 501, 180, 25, { size: 17, bold: true, color: C.cyan });
    textBox(slide, "Fondos oscuros y texto claro.", 386, 530, 210, 25, { size: 15, color: C.muted });
    textBox(slide, "Jerarquía simple", 650, 501, 180, 25, { size: 17, bold: true, color: C.cyan });
    textBox(slide, "Títulos, acciones y estados visibles.", 650, 530, 220, 25, { size: 15, color: C.muted });
    textBox(slide, "Lenguaje humano", 915, 501, 180, 25, { size: 17, bold: true, color: C.cyan });
    textBox(slide, "Mensajes directos para la comunidad.", 915, 530, 220, 25, { size: 15, color: C.muted });
    footer(slide, 4);
    addNotes(slide, [paths.logoFull, paths.background, "Colores verificados en la interfaz y estilos del proyecto."], ["Relacionar cada color con una función, no solo con una preferencia estética."]);
  }

  // 5. Distribución de pantalla
  {
    const slide = deck.slides.add();
    sectionHeader(slide, 5, "Una estructura estable deja cada función a un clic", "La pantalla mantiene tres zonas reconocibles en todos los módulos.");
    addImage(slide, A.dashboardCoord, 58, 194, 900, 430, "Dashboard del coordinador con menú lateral y barra superior", { fit: "cover", crop: { left: 0.00, top: 0.01, right: 0.00, bottom: 0.02 }, radius: 18 });
    calloutNumber(slide, 1, 82, 229, C.cyan);
    calloutNumber(slide, 2, 468, 207, C.gold);
    calloutNumber(slide, 3, 618, 370, C.green);
    const labels = [
      ["1", "Menú lateral", "Agrupa módulos por tipo y filtra opciones según el rol."],
      ["2", "Barra superior", "Búsqueda, identidad de la sesión y acceso a la cuenta."],
      ["3", "Área de trabajo", "Métricas, formularios, tablas y acciones del módulo activo."],
    ];
    labels.forEach((item, i) => {
      const y = 205 + i * 132;
      rect(slide, 990, y, 230, 108, C.panel, { radius: 14, line: { style: "solid", fill: C.line, width: 1 } });
      textBox(slide, item[0], 1008, y + 17, 28, 28, { size: 20, bold: true, color: i === 0 ? C.cyan : i === 1 ? C.gold : C.green, align: "center" });
      textBox(slide, item[1], 1048, y + 14, 152, 28, { size: 19, bold: true, color: C.white });
      textBox(slide, item[2], 1008, y + 50, 190, 48, { size: 14, color: C.muted });
    });
    footer(slide, 5);
    addNotes(slide, [paths.dashboardCoord], ["Señalar primero la navegación, luego la barra superior y por último el contenido."]);
  }

  // 6. Interfaces
  {
    const slide = deck.slides.add();
    sectionHeader(slide, 6, "Avance actual: 17 interfaces listas de 23 planificadas", "El inventario distingue pantallas terminadas, bases parciales y módulos aún sin desarrollar.");
    textBox(slide, "23", 70, 205, 180, 82, { size: 64, bold: true, color: C.white, align: "center", fontFamily: FONT_DISPLAY });
    textBox(slide, "TOTAL PLANIFICADAS", 70, 287, 180, 24, { size: 13, bold: true, color: C.muted, align: "center" });
    line(slide, 275, 205, 0, 116, C.line, 1);
    textBox(slide, "17", 305, 205, 180, 82, { size: 64, bold: true, color: C.green, align: "center", fontFamily: FONT_DISPLAY });
    textBox(slide, "REALIZADAS", 305, 287, 180, 24, { size: 13, bold: true, color: C.muted, align: "center" });
    line(slide, 510, 205, 0, 116, C.line, 1);
    textBox(slide, "6", 540, 205, 180, 82, { size: 64, bold: true, color: C.gold, align: "center", fontFamily: FONT_DISPLAY });
    textBox(slide, "PENDIENTES DE CIERRE", 540, 287, 180, 24, { size: 13, bold: true, color: C.muted, align: "center" });
    rect(slide, 70, 335, 650, 12, C.panel2, { radius: 6, line: { style: "solid", fill: C.panel2, width: 0 } });
    rect(slide, 70, 335, 480, 12, C.green, { radius: 6, line: { style: "solid", fill: C.green, width: 0 } });
    textBox(slide, "74 % del inventario principal está realizado", 70, 358, 650, 26, { size: 15, color: C.sky });
    rect(slide, 758, 200, 462, 187, C.panel, { radius: 18, line: { style: "solid", fill: C.line, width: 1 } });
    textBox(slide, "Pendientes", 782, 221, 180, 29, { size: 22, bold: true, color: C.white });
    textBox(slide, "Sin desarrollar", 782, 266, 136, 22, { size: 15, bold: true, color: C.gold });
    textBox(slide, "Convivencia · Seguimiento · Estadísticas · Calendario", 928, 263, 266, 48, { size: 15, color: C.muted });
    textBox(slide, "Parciales", 782, 327, 136, 22, { size: 15, bold: true, color: C.cyan });
    textBox(slide, "Configuración · Perfil", 928, 325, 266, 26, { size: 15, color: C.muted });
    const thumbs = [
      [A.nuevoReporte, "Nuevo reporte"],
      [A.salidas, "Salidas"],
      [A.comunicaciones, "Comunicaciones"],
      [A.auditoria, "Auditoría"],
    ];
    thumbs.forEach((item, i) => {
      const x = 70 + i * 290;
      addImage(slide, item[0], x, 420, 260, 146, item[1], { fit: "cover", crop: { left: 0.08, top: 0.08, right: 0.03, bottom: 0.08 }, radius: 12, shadow: "shadow-sm" });
      textBox(slide, item[1], x, 579, 260, 24, { size: 15, bold: true, color: C.white, align: "center" });
    });
    rect(slide, 70, 619, 1150, 38, C.panel2, { radius: 12, line: { style: "solid", fill: C.gold, width: 1 } });
    textBox(slide, "Ajuste puntual pendiente: agregar mostrar/ocultar en los dos campos de “Nueva contraseña”.", 92, 628, 1106, 22, { size: 15, color: C.gold, align: "center" });
    footer(slide, 6);
    addNotes(slide, [paths.nuevoReporte, paths.salidas, paths.comunicaciones, paths.auditoria, "Conteo del inventario funcional informado por el usuario al 1 de septiembre de 2026."], ["Aclarar que los botones del menú no equivalen por sí solos a una interfaz terminada."]);
  }

  // 7. Flujo de usuario, navegación y contenidos
  {
    const slide = deck.slides.add();
    sectionHeader(slide, 7, "Flujo de usuario, navegación y contenidos de SIGDE", "Recorrido real desde el ingreso hasta el registro y la trazabilidad de una acción.");

    // Flujo principal: los conectores se dibujan primero para quedar detrás de las pantallas.
    rect(slide, 60, 184, 1160, 225, C.navy2, { radius: 18, line: { style: "solid", fill: C.blue, width: 1.2 } });
    textBox(slide, "1. FLUJO PRINCIPAL", 82, 196, 260, 24, { size: 14, bold: true, color: C.cyan });
    textBox(slide, "Ingreso → módulo permitido → acción → registro", 890, 198, 302, 22, { size: 12, color: C.muted, align: "right" });
    const flowXs = [78, 311, 544, 777, 1010];
    for (let i = 0; i < flowXs.length - 1; i++) addRightArrow(slide, flowXs[i] + 202, 283, 28, 18, C.blue2);
    const flow = [
      [A.login, "1", "Ingreso", "Credenciales y sesión", C.cyan],
      [A.dashboardCoord, "2", "Dashboard", "Vista según el rol", C.sky],
      [A.reportes, "3", "Módulo", "Consulta y filtros", C.blue2],
      [A.nuevoReporte, "4", "Acción", "Formulario validado", C.green],
      [A.auditoria, "5", "Trazabilidad", "Movimiento registrado", C.gold],
    ];
    flow.forEach((item, i) => {
      const x = flowXs[i];
      addImage(slide, item[0], x, 238, 202, 108, item[2], {
        fit: "cover",
        crop: { left: 0.02, top: 0.03, right: 0.02, bottom: 0.03 },
        radius: 11,
        lineWidth: 1.2,
        frameLine: item[4],
        shadow: "shadow-sm",
      });
      calloutNumber(slide, item[1], x + 8, 246, item[4]);
      textBox(slide, item[2], x, 355, 202, 22, { size: 15, bold: true, color: C.white, align: "center" });
      textBox(slide, item[3], x, 379, 202, 18, { size: 11, color: C.muted, align: "center" });
    });

    // Navegación por rol.
    rect(slide, 60, 426, 552, 234, C.panel, { radius: 16, line: { style: "solid", fill: C.green, width: 1.1 } });
    textBox(slide, "2. NAVEGACIÓN POR ROL", 82, 441, 280, 23, { size: 14, bold: true, color: C.green });
    pill(slide, "COORDINADOR", 82, 476, 134, C.blue);
    pill(slide, "DOCENTE", 228, 476, 116, C.panel2, C.sky);
    pill(slide, "PORTERÍA", 356, 476, 116, "#3A321E", C.gold);
    const roles = [
      ["Coordinador", "Reportes · Usuarios · Configuración · Auditoría"],
      ["Docente", "Reportes · Convivencia · Estudiantes"],
      ["Portería", "Salidas · Agenda · Perfil"],
    ];
    roles.forEach((item, i) => {
      const y = 519 + i * 34;
      rect(slide, 84, y + 5, 7, 7, i === 0 ? C.blue2 : i === 1 ? C.cyan : C.gold, { geometry: "ellipse", line: { style: "solid", fill: "none", width: 0 } });
      textBox(slide, item[0], 101, y, 105, 21, { size: 13, bold: true, color: C.white });
      textBox(slide, item[1], 205, y, 380, 22, { size: 12, color: C.muted });
    });
    rect(slide, 82, 624, 508, 25, "#2D291D", { radius: 10, line: { style: "solid", fill: C.gold, width: 0.8 } });
    textBox(slide, "Pendiente: Seguimiento, Estadísticas, Calendario y Ruta de convivencia.", 94, 629, 484, 16, { size: 11, bold: true, color: C.gold, align: "center" });

    // Contenidos y acciones reales.
    rect(slide, 628, 426, 592, 234, C.panel, { radius: 16, line: { style: "solid", fill: C.cyan, width: 1.1 } });
    textBox(slide, "3. CONTENIDOS Y ACCIONES", 650, 441, 300, 23, { size: 14, bold: true, color: C.cyan });
    const contentCards = [
      ["REPORTES", "Consultar → filtrar\n→ crear reporte", C.blue2],
      ["SALIDAS", "Historial → seleccionar\n→ registrar salida", C.green],
      ["COMUNICACIONES", "Seleccionar estudiante\n→ mensaje → historial", C.gold],
    ];
    contentCards.forEach((item, i) => {
      const x = 650 + i * 184;
      rect(slide, x, 478, 170, 105, C.navy2, { radius: 12, line: { style: "solid", fill: item[2], width: 1 } });
      textBox(slide, item[0], x + 10, 490, 150, 20, { size: 12, bold: true, color: item[2], align: "center" });
      line(slide, x + 18, 517, 134, 0, C.line, 1);
      textBox(slide, item[1], x + 12, 529, 146, 42, { size: 12, color: C.white, align: "center" });
    });
    rect(slide, 650, 595, 548, 54, C.navy2, { radius: 10, line: { style: "solid", fill: C.line, width: 1 } });
    textBox(slide, "FLUJO RESUMIDO", 666, 606, 118, 18, { size: 11, bold: true, color: C.cyan });
    textBox(slide, "Ingreso → Dashboard por rol → Módulo → Acción → Base de datos → Auditoría / notificación", 786, 604, 396, 34, { size: 11, color: C.white, align: "center", valign: "middle" });
    footer(slide, 7);
    addNotes(slide, [paths.login, paths.dashboardCoord, paths.reportes, paths.nuevoReporte, paths.auditoria, "C:/Users/edits/AppData/Local/Temp/codex-clipboard-474c74d8-6802-464f-a5ba-0738b64b51a8.png", "Inventario funcional confirmado por el usuario al 1 de septiembre de 2026."], ["Recorrer primero la fila superior. Después explicar que el menú cambia según el rol y cerrar diferenciando funciones implementadas de las pendientes."]);
  }

  // 8. Encabezado
  {
    const slide = deck.slides.add();
    sectionHeader(slide, 8, "El encabezado comunica identidad, rol y sesión", "Nombre de la aplicación y contexto del usuario permanecen visibles durante el trabajo.");
    addImage(slide, A.configuracion, 60, 195, 900, 431, "Pantalla completa de Configuración con encabezado de SIGDE", { fit: "cover", radius: 18 });
    calloutNumber(slide, 1, 74, 206, C.cyan);
    calloutNumber(slide, 2, 870, 207, C.gold);
    calloutNumber(slide, 3, 214, 206, C.green);
    const items = [
      ["1", "Nombre y marca", "SIGDE identifica la plataforma desde el extremo izquierdo."],
      ["2", "Usuario activo", "El nombre y el rol dan contexto a la sesión abierta."],
      ["3", "Búsqueda global", "El encabezado reserva un acceso rápido a estudiantes y reportes."],
    ];
    items.forEach((item, i) => {
      const y = 205 + i * 134;
      textBox(slide, item[0], 990, y, 34, 34, { size: 24, bold: true, color: i === 0 ? C.cyan : i === 1 ? C.gold : C.green, align: "center" });
      textBox(slide, item[1], 1035, y - 1, 175, 28, { size: 20, bold: true, color: C.white });
      textBox(slide, item[2], 990, y + 38, 220, 70, { size: 15, color: C.muted });
    });
    textBox(slide, "La misma estructura reduce la desorientación al cambiar de módulo.", 990, 607, 220, 42, { size: 15, color: C.sky, align: "center" });
    footer(slide, 8);
    addNotes(slide, [paths.configuracion], ["Señalar que el encabezado se conserva incluso cuando cambia el contenido central."]);
  }

  // 9. Política y términos
  {
    const slide = deck.slides.add();
    sectionHeader(slide, 9, "La confianza también se diseña: privacidad y condiciones claras", "Los documentos legales están enlazados desde el login y explican responsabilidades y límites.");
    addImage(slide, A.terminos, 70, 200, 540, 410, "Página de Términos y Condiciones", { fit: "cover", crop: { left: 0.20, top: 0.04, right: 0.20, bottom: 0.07 }, radius: 18 });
    addImage(slide, A.politica, 670, 200, 540, 410, "Página de Política de Tratamiento de Datos", { fit: "cover", crop: { left: 0.20, top: 0.04, right: 0.20, bottom: 0.07 }, radius: 18 });
    pill(slide, "TÉRMINOS Y CONDICIONES", 90, 214, 220, C.blue);
    pill(slide, "TRATAMIENTO DE DATOS", 690, 214, 220, C.cyan, C.navy);
    rect(slide, 70, 626, 1140, 40, C.panel2, { radius: 12, line: { style: "solid", fill: C.gold, width: 1 } });
    textBox(slide, "Antes del despliegue deben reemplazarse los campos institucionales aún marcados “por definir”.", 90, 636, 1100, 22, { size: 15, bold: true, color: C.gold, align: "center" });
    footer(slide, 9);
    addNotes(slide, [paths.terminos, paths.politica, "Textos legales implementados en frontend/src/components/legal/LegalPage.tsx."], ["Presentar la existencia de los documentos y reconocer el dato institucional pendiente."]);
  }

  // 10. Menú
  {
    const slide = deck.slides.add();
    sectionHeader(slide, 10, "El menú cambia según la responsabilidad de cada usuario", "La navegación aplica el principio de mínimo acceso y muestra solo las tareas relacionadas con el rol.");
    const crops = [
      [A.dashboardCoord, "Coordinador", "Dashboard · Reportes · Salidas · Usuarios · Configuración · Auditoría", C.cyan],
      [A.dashboardDocente, "Docente", "Dashboard · Reportes · Estudiantes · Comunicaciones", C.green],
      [A.dashboardPorteria, "Portería", "Dashboard · Salidas · Agenda operativa", C.gold],
    ];
    crops.forEach((item, i) => {
      const x = 70 + i * 390;
      addImage(slide, item[0], x, 215, 350, 168, `Pantalla principal del rol ${item[1]}`, { fit: "cover", radius: 16 });
      textBox(slide, item[1], x, 412, 350, 30, { size: 22, bold: true, color: item[3], align: "center" });
      textBox(slide, item[2], x + 20, 456, 310, 82, { size: 16, color: C.muted, align: "center" });
      if (i < 2) line(slide, x + 370, 220, 0, 340, C.line, 1);
    });
    rect(slide, 70, 590, 1140, 60, C.panel2, { radius: 12, line: { style: "solid", fill: C.line, width: 1 } });
    textBox(slide, "Importante: una opción visible en el menú puede seguir en desarrollo; el acceso no demuestra que el módulo esté terminado.", 92, 607, 1096, 28, { size: 15, color: C.sky, align: "center" });
    footer(slide, 10);
    addNotes(slide, [paths.dashboardCoord, paths.dashboardDocente, paths.dashboardPorteria], ["Comparar los tres menús y volver a separar permiso, visibilidad y estado funcional."]);
  }

  // 11. Regresar
  {
    const slide = deck.slides.add();
    sectionHeader(slide, 11, "Regresar es explícito y mantiene la orientación", "SIGDE usa controles visibles para volver, cerrar formularios o recuperar el menú.");
    addImage(slide, A.recuperar, 70, 205, 620, 390, "Recuperación de contraseña con botón Regresar", { fit: "cover", crop: { left: 0.63, top: 0.04, right: 0.02, bottom: 0.04 }, radius: 18 });
    calloutNumber(slide, 1, 520, 513, C.gold);
    addImage(slide, A.dashboardCollapsed, 750, 205, 460, 223, "Dashboard con menú lateral contraído", { fit: "cover", radius: 18 });
    calloutNumber(slide, 2, 759, 214, C.cyan);
    textBox(slide, "1", 760, 470, 34, 34, { size: 24, bold: true, color: C.gold, align: "center" });
    textBox(slide, "Botón “Regresar”", 805, 469, 165, 26, { size: 19, bold: true, color: C.white });
    textBox(slide, "Devuelve al paso anterior del flujo de autenticación sin perder la referencia visual.", 760, 507, 205, 74, { size: 15, color: C.muted });
    textBox(slide, "2", 990, 470, 34, 34, { size: 24, bold: true, color: C.cyan, align: "center" });
    textBox(slide, "Control del menú", 1035, 469, 175, 26, { size: 19, bold: true, color: C.white });
    textBox(slide, "Permite contraer o desplegar la navegación y conserva el módulo seleccionado.", 990, 507, 220, 74, { size: 15, color: C.muted });
    textBox(slide, "En los documentos legales también aparece “← Volver al inicio de sesión”.", 70, 623, 1140, 28, { size: 16, color: C.sky, align: "center" });
    footer(slide, 11);
    addNotes(slide, [paths.recuperar, paths.dashboardCollapsed, "Control de retorno legal verificado en las páginas de Términos y Política."], ["Mostrar que hay retorno tanto dentro de un flujo como dentro de la navegación general."]);
  }

  // 12. Base de datos
  {
    const slide = deck.slides.add();
    sectionHeader(slide, 12, "La base de datos conecta personas, servicios y trazabilidad", "El producto es la plataforma web; sus servicios operan sobre datos relacionados y permisos por rol.");
    const centerX = 516;
    const centerY = 312;
    addRightArrow(slide, 378, 342, 126, 22, C.blue);
    addRightArrow(slide, 776, 342, 126, 22, C.blue);
    addDownArrow(slide, 624, 287, 26, 26, C.green);
    addDownArrow(slide, 622, 420, 30, 48, C.gold);
    node(slide, "Usuarios", "Roles, cuenta y sesión", 70, 300, 290, 120, C.cyan);
    node(slide, "SIGDE", "Servicios digitales", centerX, centerY, 248, 100, C.blue2);
    node(slide, "Estudiantes", "Acudientes y grupos", 920, 300, 290, 120, C.green);
    node(slide, "Reportes", "Evidencias y observaciones", 500, 180, 280, 104, C.sky);
    node(slide, "Salidas", "Autorizaciones y responsables", 500, 480, 280, 104, C.gold);
    textBox(slide, "COMUNICACIONES · NOTIFICACIONES · AUDITORÍA", 420, 605, 440, 25, { size: 14, bold: true, color: C.cyan, align: "center" });
    line(slide, 420, 637, 440, 0, C.line, 1);
    textBox(slide, "SQLite en desarrollo local · Turso en producción", 420, 647, 440, 22, { size: 14, color: C.muted, align: "center" });
    textBox(slide, "Producto", 70, 470, 120, 25, { size: 18, bold: true, color: C.white });
    textBox(slide, "Plataforma web SIGDE", 70, 501, 300, 25, { size: 16, color: C.muted });
    textBox(slide, "Servicios", 920, 470, 120, 25, { size: 18, bold: true, color: C.white });
    textBox(slide, "Reportes · Salidas · Comunicación · Seguridad", 920, 501, 290, 58, { size: 16, color: C.muted });
    footer(slide, 12);
    addNotes(slide, ["Modelo de datos basado en database/prisma/schema.prisma.", "Arquitectura de persistencia basada en la configuración real del proyecto."], ["Aclarar que SIGDE no vende productos físicos; el producto es la plataforma y los servicios son sus módulos."]);
  }

  // 13. Autenticación
  {
    const slide = deck.slides.add();
    sectionHeader(slide, 13, "La autenticación ya cubre ingreso y recuperación segura", "El flujo principal funciona; queda un ajuste de usabilidad antes de considerarlo cerrado.");
    const auth = [
      [A.login, "1", "Ingreso", "Correo, contraseña, recordar usuario y enlace de recuperación.", C.cyan],
      [A.codigo, "2", "Verificación", "Código de 6 dígitos y espera controlada para reenviar.", C.green],
      [A.nuevaContrasena, "3", "Nueva contraseña", "Indicador de fortaleza y confirmación; falta mostrar/ocultar.", C.gold],
    ];
    auth.forEach((item, i) => {
      const x = 70 + i * 395;
      addImage(slide, item[0], x, 210, 355, 170, item[2], { fit: "cover", radius: 18 });
      calloutNumber(slide, item[1], x + 12, 220, item[4]);
      textBox(slide, item[2], x, 405, 355, 29, { size: 21, bold: true, color: C.white, align: "center" });
      textBox(slide, item[3], x + 20, 450, 315, 72, { size: 16, color: C.muted, align: "center" });
    });
    rect(slide, 70, 575, 1140, 76, C.panel2, { radius: 12, line: { style: "solid", fill: C.gold, width: 1 } });
    textBox(slide, "Próximo paso", 92, 590, 150, 24, { size: 16, bold: true, color: C.gold });
    textBox(slide, "Agregar mostrar/ocultar en ambos campos de nueva contraseña y completar los 6 cierres de interfaz.", 245, 588, 925, 46, { size: 16, color: C.white, align: "center" });
    footer(slide, 13);
    addNotes(slide, [paths.login, paths.codigo, paths.nuevaContrasena, "Flujo de autenticación implementado en frontend/src/components/auth/LoginExperience.tsx y backend/src/services/auth.service.ts."], ["Cerrar conectando el avance real con el siguiente objetivo concreto del proyecto."]);
  }

  for (const [index, slide] of deck.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    const png = await deck.export({ slide, format: "png", scale: 1.4 });
    await fs.writeFile(path.join(TMP_DIR, "rendered", `${stem}.png`), new Uint8Array(await png.arrayBuffer()));
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(TMP_DIR, "rendered", `${stem}.layout.json`), await layout.text());
  }

  const montage = await deck.export({ format: "webp", montage: true, scale: 1 });
  await fs.writeFile(path.join(TMP_DIR, "rendered", "montage.webp"), new Uint8Array(await montage.arrayBuffer()));
  const pptx = await PresentationFile.exportPptx(deck);
  await pptx.save(FINAL_PPTX);
  console.log(`Created ${FINAL_PPTX}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
