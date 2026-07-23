import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const docsDir = resolve(process.cwd(), 'docs');
const outFile = resolve(docsDir, 'flujo-interfaz-sigde-figma.html');

function imageDataUri(filename) {
  const fullPath = resolve(docsDir, filename);
  const base64 = readFileSync(fullPath).toString('base64');
  return `data:image/png;base64,${base64}`;
}

const assets = {
  loginMobile: imageDataUri('login-mobile.png'),
  recoveryMobile: imageDataUri('recovery-mobile.png'),
  codeMobile: imageDataUri('code-mobile.png'),
  loginReal: imageDataUri('login-real.png'),
  recoveryReal: imageDataUri('recovery-real.png'),
  codeReal: imageDataUri('code-real.png'),
};

const flowNodes = [
  {
    n: '1',
    title: 'Cargando la App',
    subtitle: 'Estado de espera antes de mostrar el acceso.',
    body: `
      <div class="phone dark">
        <div class="loading-card">
          <div class="loading-ring"></div>
          <div class="loading-mark">SIGDE</div>
          <div class="loading-sub">Sistema de Gestión Digital Escolar</div>
          <div class="loading-bar">Cargando...</div>
        </div>
      </div>
      <div class="caption">Marca, brillo y cobertura total para que no se vea lo que hay detrás.</div>
    `,
  },
  {
    n: '2',
    title: 'Pantalla de inicio',
    subtitle: 'Correo, contraseña y recordar usuario.',
    body: `
      <div class="phone">
        <img src="${assets.loginMobile}" alt="Inicio de sesión de SIGDE" />
      </div>
      <div class="caption">La entrada principal del proyecto con los campos reales del login.</div>
    `,
  },
  {
    n: '3',
    title: 'Recuperar contraseña',
    subtitle: 'Solicita el correo institucional.',
    body: `
      <div class="phone">
        <img src="${assets.recoveryMobile}" alt="Recuperación de contraseña de SIGDE" />
      </div>
      <div class="caption">Cuando el acceso falla, el sistema deriva a recuperación sin romper el flujo.</div>
    `,
  },
  {
    n: '4',
    title: 'Verificar código',
    subtitle: 'Validación de 6 dígitos enviados al correo.',
    body: `
      <div class="phone">
        <img src="${assets.codeMobile}" alt="Verificación de código de SIGDE" />
      </div>
      <div class="caption">Aquí se valida si el código es correcto antes de permitir el cambio de contraseña.</div>
    `,
  },
  {
    n: '5',
    title: 'Dashboard / Reportes',
    subtitle: 'Vista que estamos pensando para el resumen general.',
    body: `
      <div class="phone future">
        <div class="future-screen">
          <div class="future-top">SIGDE <span>resumen</span></div>
          <div class="future-title">Dashboard</div>
          <div class="future-stat">
            <strong>128</strong>
            <span>casos activos</span>
          </div>
          <div class="future-chart">
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
          <div class="future-list">
            <div>Reportes recientes</div>
            <div>Seguimiento de casos</div>
            <div>Indicadores por periodo</div>
          </div>
        </div>
      </div>
      <div class="caption">Proyección para concentrar métricas, reportes y seguimiento desde un solo lugar.</div>
    `,
  },
  {
    n: '6',
    title: 'Perfil de usuario',
    subtitle: 'Ajustes y personalización previstos para la cuenta.',
    body: `
      <div class="phone future">
        <div class="future-screen profile-screen">
          <div class="future-top">SIGDE <span>perfil</span></div>
          <div class="avatar"></div>
          <div class="future-title">Mi perfil</div>
          <div class="profile-line"></div>
          <div class="profile-line short"></div>
          <div class="profile-line"></div>
          <div class="profile-line short"></div>
        </div>
      </div>
      <div class="caption">Espacio pensado para editar datos, preferencias y cerrar sesión.</div>
    `,
  },
];

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SIGDE - Flujo para Figma</title>
  <style>
    body{
      margin:0;
      background:#f4f7fc;
      color:#111827;
      font-family:Arial, Helvetica, sans-serif;
    }
    .sheet{
      width:1140px;
      margin:0 auto;
      padding:12px 14px 16px;
      box-sizing:border-box;
    }
    .masthead{
      text-align:center;
      padding:6px 0 12px;
    }
    .brand{
      display:inline-block;
      padding:8px 16px;
      border:1px solid #d9e2f1;
      border-radius:999px;
      background:#fff;
      color:#263fd6;
      font-size:12px;
      font-weight:700;
      letter-spacing:2px;
    }
    h1{
      margin:10px 0 3px;
      color:#182a7c;
      font-size:28px;
      line-height:1.05;
      letter-spacing:-0.03em;
      font-weight:800;
      text-transform:uppercase;
    }
    .subtitle{
      margin:0;
      color:#6b7280;
      font-size:13px;
    }
    .top-layout{
      display:grid;
      grid-template-columns:1fr 256px;
      gap:10px;
      align-items:start;
    }
    .section{
      background:#fff;
      border:1px solid #d9e2f1;
      border-radius:16px;
      box-sizing:border-box;
    }
    .section-head{
      padding:10px 14px 6px;
    }
    .section-title{
      display:flex;
      align-items:center;
      gap:8px;
      color:#263fd6;
      font-size:15px;
      font-weight:800;
      margin:0;
    }
    .section-title .num{
      width:18px;
      height:18px;
      border-radius:50%;
      background:#5b38e0;
      color:#fff;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      font-size:11px;
      line-height:1;
      flex:none;
    }
    .section-sub{
      margin-top:4px;
      color:#8a94a6;
      font-size:10px;
    }
    .flow-shell{padding-bottom:10px;}
    .flow-track{
      display:flex;
      gap:8px;
      align-items:stretch;
      padding:6px 12px 12px;
    }
    .node{
      flex:1 1 0;
      min-width:0;
      display:flex;
      flex-direction:column;
      gap:6px;
    }
    .node-head{
      display:flex;
      align-items:flex-start;
      gap:6px;
      min-height:36px;
    }
    .badge{
      width:22px;
      height:22px;
      border-radius:50%;
      background:#5b38e0;
      color:#fff;
      display:grid;
      place-items:center;
      font-size:11px;
      font-weight:700;
      flex:none;
      margin-top:1px;
    }
    .badge.green{background:#38b2ac;}
    .node-title{
      font-size:11px;
      line-height:1.08;
      color:#1f2937;
      font-weight:800;
    }
    .node-title small{
      display:block;
      margin-top:3px;
      font-size:9px;
      color:#6b7280;
      font-weight:600;
      line-height:1.15;
    }
    .arrow{
      width:22px;
      position:relative;
      flex:none;
      align-self:center;
      margin-top:26px;
    }
    .arrow::before{
      content:"";
      position:absolute;
      left:0;
      right:6px;
      top:50%;
      height:2px;
      background:#5b38e0;
      transform:translateY(-50%);
    }
    .arrow::after{
      content:"";
      position:absolute;
      right:0;
      top:50%;
      border:6px solid transparent;
      border-left-color:#5b38e0;
      transform:translateY(-50%);
    }
    .phone{
      border:1px solid #dce4f0;
      border-radius:18px;
      overflow:hidden;
      background:#fff;
      min-height:208px;
    }
    .phone img{
      display:block;
      width:100%;
      height:208px;
      object-fit:cover;
      object-position:center top;
    }
    .phone.dark{
      background:#0e1a2a;
      display:flex;
      align-items:center;
      justify-content:center;
      min-height:208px;
    }
    .loading-card{
      width:100%;
      height:100%;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      color:#fff;
      text-align:center;
      padding:14px 10px;
      box-sizing:border-box;
      gap:8px;
    }
    .loading-ring{
      width:30px;
      height:30px;
      border-radius:50%;
      border:3px solid rgba(255,255,255,.18);
      border-top-color:#88c3ff;
      border-right-color:#88c3ff;
      box-sizing:border-box;
    }
    .loading-mark{
      font-size:28px;
      font-weight:700;
      letter-spacing:0.04em;
    }
    .loading-sub{
      font-size:10px;
      color:rgba(255,255,255,.72);
      max-width:150px;
      line-height:1.2;
    }
    .loading-bar{
      width:100%;
      margin-top:6px;
      background:#1f4e86;
      border-radius:12px;
      padding:6px 0;
      font-size:11px;
      font-weight:700;
    }
    .future{
      background:#0e1a2a;
      min-height:208px;
    }
    .future-screen{
      width:100%;
      height:208px;
      background:linear-gradient(180deg, #f6f8fd 0%, #eef3fb 100%);
      border-radius:17px;
      padding:10px;
      box-sizing:border-box;
      display:flex;
      flex-direction:column;
      gap:8px;
      color:#18305f;
    }
    .future-top{
      display:flex;
      justify-content:space-between;
      color:#6f7a90;
      font-size:9px;
      font-weight:700;
      letter-spacing:.08em;
      text-transform:uppercase;
    }
    .future-top span{color:#98a2b3;}
    .future-title{
      font-size:13px;
      font-weight:800;
      color:#13233f;
    }
    .future-stat{
      background:#fff;
      border:1px solid #d9e2f1;
      border-radius:12px;
      padding:10px 12px;
      display:flex;
      justify-content:space-between;
      align-items:flex-end;
    }
    .future-stat strong{
      font-size:24px;
      line-height:1;
      color:#13233f;
    }
    .future-stat span{
      font-size:9px;
      color:#6b7280;
    }
    .future-chart{
      display:flex;
      align-items:flex-end;
      gap:4px;
      height:34px;
      padding:2px 4px 0;
    }
    .future-chart span{
      flex:1 1 0;
      background:linear-gradient(180deg, #68d391 0%, #2f855a 100%);
      border-radius:4px 4px 0 0;
      min-height:10px;
    }
    .future-chart span:nth-child(1){height:10px}
    .future-chart span:nth-child(2){height:16px}
    .future-chart span:nth-child(3){height:28px}
    .future-chart span:nth-child(4){height:20px}
    .future-chart span:nth-child(5){height:32px}
    .future-chart span:nth-child(6){height:22px}
    .future-list{
      font-size:9px;
      color:#59657f;
      display:grid;
      gap:4px;
    }
    .profile-screen{
      align-items:center;
      text-align:center;
    }
    .avatar{
      width:48px;
      height:48px;
      border-radius:50%;
      background:#c7d2fe;
      margin-top:6px;
      position:relative;
      box-shadow:inset 0 0 0 6px rgba(255,255,255,.6);
    }
    .avatar::before{
      content:"";
      position:absolute;
      left:50%;
      top:12px;
      width:14px;
      height:14px;
      border-radius:50%;
      background:#edf2ff;
      transform:translateX(-50%);
    }
    .avatar::after{
      content:"";
      position:absolute;
      left:50%;
      bottom:8px;
      width:28px;
      height:16px;
      border-radius:14px 14px 8px 8px;
      background:#edf2ff;
      transform:translateX(-50%);
    }
    .profile-line{
      width:100%;
      height:10px;
      border-radius:999px;
      background:#dfe6f2;
      margin-top:2px;
    }
    .profile-line.short{width:74%;align-self:flex-start}
    .caption{
      color:#6b7280;
      font-size:9px;
      line-height:1.25;
      padding:0 2px;
      min-height:20px;
    }
    .side-stack{
      display:grid;
      gap:10px;
    }
    .side-card{
      background:#fff;
      border:1px solid #d9e2f1;
      border-radius:14px;
      padding:10px 12px;
      box-sizing:border-box;
      min-height:176px;
    }
    .side-card h3{
      margin:0;
      font-size:12px;
      color:#263fd6;
      font-weight:800;
    }
    .side-card .sub{
      margin:4px 0 10px;
      font-size:9px;
      color:#8a94a6;
    }
    .mini-gallery{
      display:grid;
      grid-template-columns:1fr;
      gap:8px;
    }
    .mini-shot{
      border:1px solid #dce4f0;
      border-radius:10px;
      overflow:hidden;
      background:#f8fbff;
    }
    .mini-shot img{
      display:block;
      width:100%;
      height:42px;
      object-fit:cover;
      object-position:center top;
    }
    .bullet-list{
      display:grid;
      gap:6px;
    }
    .bullet{
      display:flex;
      gap:8px;
      align-items:flex-start;
      font-size:9px;
      line-height:1.25;
      color:#53627d;
    }
    .dot{
      width:8px;
      height:8px;
      border-radius:50%;
      background:#7554f2;
      flex:none;
      margin-top:2px;
    }
    .dot.green{background:#38b2ac}
    .dot.blue{background:#263fd6}
    .dot.orange{background:#f59e0b}
    .lower-layout{
      display:grid;
      grid-template-columns:1.08fr 1.02fr .82fr;
      gap:10px;
      margin-top:10px;
    }
    .panel{
      background:#fff;
      border:1px solid #d9e2f1;
      border-radius:16px;
      padding:12px 12px 10px;
      box-sizing:border-box;
      min-height:228px;
    }
    .panel h3{
      margin:0;
      color:#263fd6;
      font-size:15px;
      font-weight:800;
    }
    .panel h3 small{
      display:block;
      margin-top:4px;
      color:#8a94a6;
      font-size:10px;
      font-weight:600;
    }
    .nav-layout{
      margin-top:10px;
      display:grid;
      grid-template-columns:172px 1fr;
      gap:10px;
      align-items:start;
    }
    .menu-card{
      min-height:176px;
      border-radius:14px;
      background:linear-gradient(180deg, #f5f8ff 0%, #edf3ff 100%);
      border:1px solid #dfe8f6;
      padding:10px;
      box-sizing:border-box;
      display:grid;
      gap:8px;
    }
    .menu-head{
      padding:8px 9px;
      border-radius:10px;
      background:#fff;
      border:1px solid #dfe8f6;
      color:#22315f;
      font-size:10px;
      font-weight:800;
      text-align:center;
      text-transform:uppercase;
      letter-spacing:.08em;
    }
    .menu-list{
      display:grid;
      gap:5px;
    }
    .menu-item{
      display:flex;
      align-items:center;
      gap:8px;
      padding:8px 9px;
      border-radius:10px;
      background:rgba(255,255,255,.82);
      border:1px solid #dfe7f4;
      color:#41506c;
      font-size:10px;
      font-weight:700;
    }
    .mini-icon{
      width:18px;
      height:18px;
      border-radius:6px;
      background:linear-gradient(180deg, #2d7be6 0%, #2852c0 100%);
      color:#fff;
      display:grid;
      place-items:center;
      font-size:10px;
      font-weight:800;
      flex:none;
    }
    .nav-map{
      display:grid;
      gap:10px;
    }
    .nav-banner{
      border:1px solid #d9e2f1;
      border-radius:12px;
      background:#fff;
      padding:9px 10px;
      font-size:11px;
      font-weight:800;
      color:#20325d;
      text-align:center;
    }
    .nav-row{
      display:grid;
      grid-template-columns:repeat(3, 1fr);
      gap:8px;
    }
    .nav-box{
      min-height:92px;
      border-radius:12px;
      background:#fff;
      border:1px solid #d9e2f1;
      padding:10px;
      box-sizing:border-box;
      display:grid;
      align-content:start;
      gap:6px;
    }
    .nav-box strong{font-size:11px;color:#13203f}
    .nav-box p{margin:0;font-size:9px;line-height:1.35;color:#6b7280}
    .nav-subrow{
      display:grid;
      grid-template-columns:repeat(5, 1fr);
      gap:8px;
    }
    .nav-chip{
      min-height:72px;
      border-radius:12px;
      border:1px solid #d9e2f1;
      background:linear-gradient(180deg, #fcfdff 0%, #f7faff 100%);
      padding:9px 9px 8px;
      box-sizing:border-box;
      display:grid;
      gap:5px;
      align-content:start;
    }
    .nav-chip .mini-icon{width:20px;height:20px;border-radius:7px}
    .nav-chip strong{font-size:10px;color:#18233d}
    .nav-chip p{margin:0;font-size:8px;line-height:1.3;color:#6b7280}
    .content-grid{
      margin-top:10px;
      display:grid;
      grid-template-columns:repeat(2, 1fr);
      gap:8px;
    }
    .content-card{
      min-height:94px;
      border-radius:12px;
      background:#fff;
      border:1px solid #d9e2f1;
      padding:10px;
      box-sizing:border-box;
      display:grid;
      gap:8px;
      align-content:start;
    }
    .content-card .label{
      display:flex;
      align-items:center;
      gap:7px;
      font-size:11px;
      font-weight:800;
      color:#14214b;
    }
    .content-card .label .badge{
      width:18px;
      height:18px;
      font-size:10px;
    }
    .chips{
      display:flex;
      flex-wrap:wrap;
      gap:6px;
    }
    .chip{
      padding:5px 8px;
      border-radius:999px;
      font-size:9px;
      font-weight:700;
      border:1px solid transparent;
    }
    .ok{background:#e9f8ef;color:#116132;border-color:#cbe9d5}
    .bad{background:#fff1e8;color:#97350f;border-color:#ffd6bf}
    .wait{background:#e8f8fb;color:#09607a;border-color:#c7eef4}
    .future-chip{background:#f0eafe;color:#5b36d4;border-color:#dfd2ff}
    .legend-list{
      margin-top:10px;
      display:grid;
      gap:8px;
    }
    .legend-line{
      display:flex;
      align-items:center;
      gap:10px;
      color:#4f5d78;
      font-size:10px;
      font-weight:700;
    }
    .leg{
      width:38px;
      height:0;
      border-top:3px solid #263fd6;
      position:relative;
      flex:none;
    }
    .leg.dash{border-top-style:dashed}
    .leg.green{border-top-color:#15803d}
    .leg.purple{border-top-color:#7554f2}
    .leg.wait{border-top-color:#0891b2}
    .leg::after{
      content:"";
      position:absolute;
      right:-2px;
      top:-5px;
      border:6px solid transparent;
      border-left-color:inherit;
      transform:translateX(100%);
    }
    .legend-box{
      margin-top:10px;
      border:1px solid #d9e2f1;
      border-radius:12px;
      background:#f9fbff;
      color:#495872;
      font-size:10px;
      line-height:1.45;
      padding:10px 10px 9px;
    }
    .footer{
      margin-top:10px;
      padding:12px 14px;
      border:1px solid #d9e2f1;
      border-radius:14px;
      background:linear-gradient(90deg, rgba(38,63,214,.07), rgba(117,84,242,.06));
      color:#5d6b86;
      font-size:11px;
      line-height:1.5;
    }
    .legend-chip{
      display:inline-flex;
      align-items:center;
      gap:8px;
      color:#263fd6;
      font-size:10px;
      font-weight:800;
      text-transform:uppercase;
      letter-spacing:.14em;
      margin-bottom:8px;
    }
    @media print{
      body{background:#fff}
      .sheet{margin:0}
    }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="masthead">
      <div class="brand">SIGDE</div>
      <h1>Flujo de usuario, navegación y contenidos de la app</h1>
      <p class="subtitle">Diagrama del recorrido completo del usuario en la aplicación</p>
    </header>

    <section class="top-layout">
      <article class="section flow-shell">
        <div class="section-head">
          <h2 class="section-title"><span class="num">1</span> Flujo de usuario <span style="font-weight:700;font-size:12px;color:#3d4a6b;">(Recorrido principal)</span></h2>
          <div class="section-sub">Pantallas reales + estados futuros</div>
        </div>
        <div class="flow-track">
          ${flowNodes
            .map(
              (node, index) => `
              <div class="node">
                <div class="node-head">
                  <div class="badge${index === 0 ? ' green' : ''}">${node.n}</div>
                  <div class="node-title">${node.title}<small>${node.subtitle}</small></div>
                </div>
                ${node.body}
              </div>
              ${index < flowNodes.length - 1 ? '<div class="arrow" aria-hidden="true"></div>' : ''}
            `
            )
            .join('')}
        </div>
      </article>

      <aside class="side-stack">
        <article class="side-card">
          <h3>7. Estado actual</h3>
          <div class="sub">Pantallas reales que ya están listas para mostrar el proyecto</div>
          <div class="mini-gallery">
            <div class="mini-shot"><img src="${assets.loginReal}" alt="Login real de SIGDE" /></div>
            <div class="mini-shot"><img src="${assets.recoveryReal}" alt="Recuperación real de SIGDE" /></div>
            <div class="mini-shot"><img src="${assets.codeReal}" alt="Código real de SIGDE" /></div>
          </div>
        </article>
        <article class="side-card">
          <h3>8. Lo que viene</h3>
          <div class="sub">Módulos y vistas que tenemos pensado hacer</div>
          <div class="bullet-list">
            <div class="bullet"><span class="dot blue"></span><span>Dashboard con resumen general y métricas.</span></div>
            <div class="bullet"><span class="dot green"></span><span>Usuarios, estudiantes y reportes.</span></div>
            <div class="bullet"><span class="dot orange"></span><span>Perfil, preferencias y cierre de sesión.</span></div>
            <div class="bullet"><span class="dot"></span><span>Documentación y evolución visual del proyecto.</span></div>
          </div>
        </article>
      </aside>
    </section>

    <section class="lower-layout">
      <article class="panel">
        <h3>2. Flujo de navegación <small>Estructura y accesos actuales y futuros</small></h3>
        <div class="nav-layout">
          <div class="menu-card">
            <div class="menu-head">Menú hamburguesa</div>
            <div class="menu-list">
              <div class="menu-item"><span class="mini-icon">1</span> Carga</div>
              <div class="menu-item"><span class="mini-icon">2</span> Login</div>
              <div class="menu-item"><span class="mini-icon">3</span> Recuperar</div>
              <div class="menu-item"><span class="mini-icon">4</span> Código</div>
              <div class="menu-item"><span class="mini-icon">5</span> Nueva clave</div>
              <div class="menu-item"><span class="mini-icon">6</span> Sesión</div>
            </div>
          </div>
          <div class="nav-map">
            <div class="nav-banner">Navegación principal desde el Dashboard</div>
            <div class="nav-row">
              <div class="nav-box">
                <strong>Dashboard / Reportes</strong>
                <p>Vista general para revisar indicadores y accesos rápidos.</p>
              </div>
              <div class="nav-box">
                <strong>Contenidos</strong>
                <p>Acceso a módulos, recursos y pantallas disponibles.</p>
              </div>
              <div class="nav-box">
                <strong>Buscador / Filtro</strong>
                <p>Buscar por criterios, categorías y estado.</p>
              </div>
            </div>
            <div class="nav-subrow">
              <div class="nav-chip"><span class="mini-icon">+</span><strong>Dashboard</strong><p>Resumen general.</p></div>
              <div class="nav-chip"><span class="mini-icon">U</span><strong>Usuarios</strong><p>Gestión por rol.</p></div>
              <div class="nav-chip"><span class="mini-icon">E</span><strong>Estudiantes</strong><p>Consulta y seguimiento.</p></div>
              <div class="nav-chip"><span class="mini-icon">R</span><strong>Reportes</strong><p>Casos y trazabilidad.</p></div>
              <div class="nav-chip"><span class="mini-icon">P</span><strong>Perfil</strong><p>Datos y ajustes.</p></div>
            </div>
          </div>
        </div>
      </article>

      <article class="panel">
        <h3>3. Flujo de contenidos <small>Explorar información</small></h3>
        <div class="content-grid">
          <div class="content-card">
            <div class="label"><span class="badge">✓</span> Correcto</div>
            <div class="chips">
              <span class="chip ok">Correo válido</span>
              <span class="chip ok">Contraseña válida</span>
              <span class="chip ok">Código correcto</span>
              <span class="chip ok">Contraseña segura</span>
            </div>
          </div>
          <div class="content-card">
            <div class="label"><span class="badge">!</span> Incorrecto</div>
            <div class="chips">
              <span class="chip bad">Campos vacíos</span>
              <span class="chip bad">Credenciales erróneas</span>
              <span class="chip bad">Código inválido</span>
              <span class="chip bad">Confirmación no coincide</span>
            </div>
          </div>
          <div class="content-card">
            <div class="label"><span class="badge">⟳</span> Cargando</div>
            <div class="chips">
              <span class="chip wait">Verificando</span>
              <span class="chip wait">Enviando código</span>
              <span class="chip wait">Guardando</span>
              <span class="chip wait">Cerrando sesión</span>
            </div>
          </div>
          <div class="content-card">
            <div class="label"><span class="badge">F</span> Futuro</div>
            <div class="chips">
              <span class="chip future-chip">Dashboard</span>
              <span class="chip future-chip">Usuarios</span>
              <span class="chip future-chip">Estudiantes</span>
              <span class="chip future-chip">Reportes</span>
            </div>
          </div>
        </div>
        <div class="legend-box">Hoy el flujo real termina en la autenticación exitosa y el cierre de sesión. El resto de módulos queda preparado como siguiente capa visual del proyecto.</div>
      </article>

      <article class="panel">
        <h3>4. Leyenda <small>Cómo leer la lámina</small></h3>
        <div class="legend-list">
          <div class="legend-line"><span class="leg"></span> Flujo principal</div>
          <div class="legend-line"><span class="leg dash"></span> Acceso secundario / opcional</div>
          <div class="legend-line"><span class="leg green"></span> Estado correcto</div>
          <div class="legend-line"><span class="leg wait"></span> Carga / transición</div>
          <div class="legend-line"><span class="leg purple"></span> Futuro / por construir</div>
        </div>
        <div class="legend-box">
          <div class="legend-chip">Claves visuales</div>
          Pantallas reales: login, recuperación y verificación de código. Interfaz actual: validación, nueva contraseña y cierre de sesión. Lo demás se deja como avance planificado, no como invento.
        </div>
      </article>
    </section>

    <section class="footer">
      <strong>Resumen del flujo:</strong> Carga → Login → Recuperación → Código → Nueva contraseña → Sesión iniciada / cierre. Si algo falla, la interfaz muestra el error justo donde toca; si todo sale bien, prepara la llegada a los módulos futuros: Dashboard, Usuarios, Estudiantes, Reportes y Perfil.
    </section>
  </main>
</body>
</html>
`;

writeFileSync(outFile, html, 'utf8');
console.log(`Wrote ${outFile}`);
