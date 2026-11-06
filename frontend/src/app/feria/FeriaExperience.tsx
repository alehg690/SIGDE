'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import styles from './feria.module.css';

const modules = [
  { icon: '▦', name: 'Dashboard', text: 'Un vistazo rápido a la información importante del sistema.' },
  { icon: '♙', name: 'Estudiantes y docentes', text: 'Datos organizados para encontrar a las personas y sus registros.' },
  { icon: '▤', name: 'Reportes', text: 'Consulta y organiza situaciones registradas en el colegio.' },
  { icon: '↗', name: 'Salidas', text: 'Registra y consulta las salidas escolares y su seguimiento.' },
  { icon: '◴', name: 'Estadísticas', text: 'Gráficas que ayudan a entender la información registrada.' },
  { icon: '⚙', name: 'Configuración', text: 'Opciones para adaptar el funcionamiento del sistema.' },
];

const views = [
  { number: '01', title: 'Todo empieza con una vista general', label: 'Dashboard', detail: 'El panel reúne accesos y un resumen del trabajo escolar.', tags: ['Resumen', 'Accesos', 'Actividad'] },
  { number: '02', title: 'Personas y registros en orden', label: 'Gestión', detail: 'Las secciones de estudiantes y docentes facilitan la consulta.', tags: ['Estudiantes', 'Docentes', 'Grupos'] },
  { number: '03', title: 'Información para hacer seguimiento', label: 'Reportes y salidas', detail: 'Los registros se pueden consultar y seguir dentro de sus módulos.', tags: ['Reportes', 'Salidas', 'Seguimiento'] },
  { number: '04', title: 'Datos que se pueden comprender', label: 'Estadísticas', detail: 'Las visualizaciones ayudan a leer la información del sistema.', tags: ['Indicadores', 'Gráficas', 'Consulta'] },
];

export default function FeriaExperience({ formUrl }: { formUrl: string }) {
  const galleryRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLElement>(null);
  const [showFloating, setShowFloating] = useState(false);

  useEffect(() => {
    const target = overviewRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setShowFloating(true);
    }, { threshold: 0.25 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  function moveGallery(direction: number) {
    galleryRef.current?.scrollBy({ left: direction * (galleryRef.current.clientWidth * 0.85), behavior: 'smooth' });
  }

  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />
      <header className={styles.header}>
        <a className={styles.brand} href="#inicio" aria-label="SIGDE, ir al inicio">
          <Image src="/Logo-login.png" alt="" width={36} height={38} priority />
          <span>SIGDE <small>FERIA 2026</small></span>
        </a>
        <a className={styles.headerLink} href="#evaluar">Evaluar proyecto <span aria-hidden="true">↗</span></a>
      </header>

      <section id="inicio" className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><span className={styles.dot} /> PROYECTO DE GRADO · 11-2</span>
          <h1 id="hero-title">¡Conoce <em>SIGDE!</em></h1>
          <p className={styles.heroLead}>Una nueva forma de organizar la información escolar.</p>
          <p className={styles.heroSub}>Soy Alejandro Hurtado, de 11-2, y desarrollé este sistema como mi proyecto de grado. Te invito a conocerlo en menos de un minuto.</p>
          <a className={styles.primaryButton} href="#problema">Descubrir mi proyecto <span aria-hidden="true">↗</span></a>
          <span className={styles.scrollCue}>DESLIZA PARA EXPLORAR <span aria-hidden="true">↓</span></span>
        </div>
        <div className={styles.heroArt} aria-label="Presentación visual de SIGDE">
          <div className={styles.orbit} aria-hidden="true" />
          <div className={styles.heroLogo}><Image src="/Logo-login.png" alt="Logotipo de SIGDE" width={156} height={166} priority /></div>
          <div className={`${styles.floatCard} ${styles.floatOne}`}><span>▦</span><strong>Información organizada</strong></div>
          <div className={`${styles.floatCard} ${styles.floatTwo}`}><span>◇</span><strong>Gestión escolar</strong></div>
          <div className={`${styles.floatCard} ${styles.floatThree}`}><span>↗</span><strong>Una plataforma web</strong></div>
        </div>
      </section>

      <section id="problema" className={styles.section} aria-labelledby="problem-title">
        <div className={styles.sectionIntro}><span className={styles.kicker}>01 / EL RETO</span><h2 id="problem-title">¿Por qué nació <em>SIGDE?</em></h2><p>Cuando la información está repartida en varios lugares, encontrarla y organizarla puede tomar más tiempo.</p></div>
        <div className={styles.comparison}>
          <div className={styles.compareOld}><span className={styles.compareLabel}>PROCESOS DISPERSOS</span><div className={styles.scattered}><span>Carpetas</span><span>Notas</span><span>Consultas</span></div><p>Los datos pueden quedar separados y ser difíciles de consultar.</p></div>
          <span className={styles.compareArrow} aria-hidden="true">→</span>
          <div className={styles.compareNew}><span className={styles.compareLabel}>LA IDEA DE SIGDE</span><div className={styles.unified}><span aria-hidden="true">▦</span><strong>Una plataforma organizada</strong></div><p>Reunir los procesos escolares en un sistema digital claro.</p></div>
        </div>
      </section>

      <section id="funciones" ref={overviewRef} className={`${styles.section} ${styles.modulesSection}`} aria-labelledby="modules-title">
        <div className={styles.sectionIntro}><span className={styles.kicker}>02 / LA SOLUCIÓN</span><h2 id="modules-title">Así funciona <em>SIGDE</em></h2><p>Seis áreas principales para trabajar con la información escolar.</p></div>
        <div className={styles.moduleGrid}>{modules.map((module, index) => <article className={styles.moduleCard} key={module.name}><span className={styles.moduleNumber}>{String(index + 1).padStart(2, '0')}</span><span className={styles.moduleIcon} aria-hidden="true">{module.icon}</span><h3>{module.name}</h3><p>{module.text}</p></article>)}</div>
      </section>

      <section id="demostracion" className={`${styles.section} ${styles.demoSection}`} aria-labelledby="demo-title">
        <div className={styles.galleryHeading}><div className={styles.sectionIntro}><span className={styles.kicker}>03 / UN VISTAZO</span><h2 id="demo-title">Mira SIGDE <em>en acción</em></h2><p>Recorre las áreas principales. Estas vistas son esquemas explicativos de los módulos reales; no muestran datos de estudiantes.</p></div><div className={styles.galleryControls}><button type="button" onClick={() => moveGallery(-1)} aria-label="Vista anterior">←</button><button type="button" onClick={() => moveGallery(1)} aria-label="Vista siguiente">→</button></div></div>
        <div className={styles.gallery} ref={galleryRef} tabIndex={0} aria-label="Galería de módulos de SIGDE">
          {views.map((view) => <article className={styles.viewCard} key={view.number}><div className={styles.viewMock}><div className={styles.mockTop}><span className={styles.mockLogo}>◈ SIGDE</span><span className={styles.mockDots}>● ● ●</span></div><div className={styles.mockBody}><div className={styles.mockRail}><i /><i /><i /><i /></div><div className={styles.mockContent}><span className={styles.mockOverline}>{view.label}</span><strong>{view.title}</strong><div className={styles.mockRows}>{view.tags.map((tag) => <span key={tag}><b />{tag}<i /></span>)}</div></div></div></div><div className={styles.viewCaption}><span>{view.number} / VISTA ILUSTRATIVA</span><h3>{view.label}</h3><p>{view.detail}</p></div></article>)}
        </div>
        <p className={styles.swipeHint}>Desliza para ver más <span aria-hidden="true">→</span></p>
      </section>

      <section id="trabajo" className={`${styles.section} ${styles.workSection}`} aria-labelledby="work-title"><div className={styles.workCopy}><span className={styles.kicker}>04 / DETRÁS DEL PROYECTO</span><h2 id="work-title">Un proyecto hecho <em>realidad</em></h2><p>SIGDE reúne diseño, programación y organización de datos en una plataforma web funcional desarrollada como proyecto de grado.</p></div><div className={styles.workPanel}><strong className={styles.bigNumber}>24</strong><span>interfaces desarrolladas</span><div className={styles.workLine} /><p>Una plataforma · diferentes módulos escolares · una idea llevada a la práctica</p></div></section>

      <section id="evaluar" className={`${styles.section} ${styles.evaluateSection}`} aria-labelledby="evaluate-title"><div className={styles.evaluateGlow} aria-hidden="true" /><span className={styles.kicker}>05 / TU OPINIÓN CUENTA</span><div className={styles.stars} aria-label="Escala máxima de cinco estrellas">☆ ☆ ☆ ☆ ☆</div><h2 id="evaluate-title">¡Ahora quiero conocer <em>tu opinión!</em></h2><p>Gracias por tomarte un momento para conocer SIGDE. Tu evaluación es muy importante para mi proyecto de grado.</p><a className={styles.evaluateButton} href={formUrl} target="_blank" rel="noopener noreferrer">Evaluar SIGDE <span aria-hidden="true">↗</span></a><small>Son solo 5 preguntas y puedes responder en menos de un minuto.</small><p className={styles.honestNote}>Si mi proyecto te gustó, ¡tu buena calificación me ayudaría muchísimo! Responde según tu experiencia.</p></section>

      <footer className={styles.footer}><Image src="/Logo-login.png" alt="" width={44} height={48} /><h2>¡Gracias por apoyar mi proyecto!</h2><p>Alejandro Hurtado — Grado 11-2</p><span>SIGDE — Feria de proyectos de grado 2026</span></footer>
      {showFloating && <a className={styles.floatingEval} href="#evaluar">Evaluar SIGDE <span aria-hidden="true">↗</span></a>}
    </main>
  );
}
