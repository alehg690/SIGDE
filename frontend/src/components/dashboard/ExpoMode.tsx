'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';

type ExpoSection = 'dashboard' | 'reportes' | 'seguimiento' | 'estadisticas' | 'convivencia' | 'salidas';

type ExpoMetrics = {
  estudiantes: number;
  reportes: number;
  alertas: number;
  pendientes: number;
};

type ExpoStep = {
  id: string;
  section: ExpoSection;
  kicker: string;
  title: string;
  statement: string;
  detail: string;
  proof: string;
  accent: string;
  icon: string;
};

const STEPS: ExpoStep[] = [
  {
    id: 'panorama',
    section: 'dashboard',
    kicker: 'MISIÓN 01 · EL RETO',
    title: 'Un colegio tiene muchas historias ocurriendo al mismo tiempo',
    statement: 'Imagínate buscar una pista entre cuadernos, mensajes y carpetas. SIGDE reúne todo en un solo lugar para que nada importante se pierda.',
    detail: 'Aquí podemos ver estudiantes, reportes, alertas y actividades como si fuera el tablero de control de una misión.',
    proof: 'Todo a la vista',
    accent: '#58bcff',
    icon: '◎',
  },
  {
    id: 'evidencia',
    section: 'reportes',
    kicker: 'MISIÓN 02 · VIAJE INTERACTIVO',
    title: 'Sigue el viaje de la información',
    statement: 'Descubre qué ocurre cuando se registra un observador, una salida o una alerta.',
    detail: 'Tú eliges la ruta y SIGDE te muestra cada paso con total transparencia.',
    proof: 'El viaje de la información',
    accent: '#8d7dff',
    icon: '◇',
  },
  {
    id: 'alerta',
    section: 'seguimiento',
    kicker: 'MISIÓN 03 · CONECTAR PISTAS',
    title: 'SIGDE encuentra conexiones que podrían pasar desapercibidas',
    statement: 'Como cuando unes puntos en un dibujo, el sistema conecta reportes relacionados y avisa que vale la pena mirar con atención.',
    detail: 'También explica por qué mostró la alerta y qué información hace falta. SIGDE ayuda a pensar, pero las personas siempre toman la decisión.',
    proof: 'Une puntos y explica por qué',
    accent: '#ffbd59',
    icon: '✦',
  },
  {
    id: 'impacto',
    section: 'estadisticas',
    kicker: 'MISIÓN 04 · VER EL CAMBIO',
    title: 'Los datos cuentan una historia que podemos entender',
    statement: 'Las gráficas muestran qué está pasando, qué mejoró y dónde hace falta prestar más atención. Sin cálculos difíciles.',
    detail: 'La meta no es poner etiquetas. La meta es descubrir oportunidades para prevenir problemas y mejorar la convivencia.',
    proof: 'Gráficas que sí hablan claro',
    accent: '#57d7ad',
    icon: '↗',
  },
  {
    id: 'acompanamiento',
    section: 'convivencia',
    kicker: 'MISIÓN 05 · EL VERDADERO PODER',
    title: 'La tecnología ayuda, pero las personas cuidan',
    statement: 'El objetivo no es castigar más. Es escuchar, actuar a tiempo y acompañar mejor a cada estudiante.',
    detail: 'La Ruta de Convivencia organiza los acuerdos y los siguientes pasos hasta cerrar cada historia de manera responsable.',
    proof: 'Personas + tecnología',
    accent: '#ff7185',
    icon: '✓',
  },
];

const AUTO_DURATIONS = [9_000, 43_000, 10_000, 10_000, 10_000];
const VOTE_URL = 'https://goo.su/4UMyig1';

export default function ExpoMode({ metrics, onClose, onNavigate }: { metrics: ExpoMetrics; onClose?: () => void; onNavigate?: (section: ExpoSection) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [resetVersion, setResetVersion] = useState(0);
  const [qrOpen, setQrOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const dialogRef = useRef<HTMLElement>(null);
  const step = STEPS[activeIndex];
  const progress = ((activeIndex + 1) / STEPS.length) * 100;
  const duration = AUTO_DURATIONS[activeIndex];
  const timerProgress = Math.min(100, (elapsed / duration) * 100);
  const secondsLeft = Math.max(0, Math.ceil((duration - elapsed) / 1000));
  const metricCards = useMemo(() => [
    { value: metrics.estudiantes, label: 'estudiantes en el sistema' },
    { value: metrics.reportes, label: 'historias registradas' },
    { value: metrics.alertas, label: 'señales importantes' },
    { value: metrics.pendientes, label: 'situaciones por revisar' },
  ], [metrics]);

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => {
      window.removeEventListener('online', updateConnection);
      window.removeEventListener('offline', updateConnection);
    };
  }, []);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose?.();
      if (event.key === 'ArrowRight') { setIsPlaying(false); setElapsed(0); setActiveIndex((current) => Math.min(STEPS.length - 1, current + 1)); }
      if (event.key === 'ArrowLeft') { setIsPlaying(false); setElapsed(0); setActiveIndex((current) => Math.max(0, current - 1)); }
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      previous?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const frame = window.requestAnimationFrame(() => setIsPlaying(false));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const startedAt = performance.now() - elapsed;
    const interval = window.setInterval(() => setElapsed(Math.min(duration, performance.now() - startedAt)), 100);
    const timeout = window.setTimeout(() => {
      setElapsed(0);
      if (activeIndex === STEPS.length - 1) setIsPlaying(false);
      else setActiveIndex((current) => current + 1);
    }, Math.max(0, duration - elapsed));
    return () => { window.clearInterval(interval); window.clearTimeout(timeout); };
    // elapsed is intentionally captured when playback starts or resumes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, duration, isPlaying]);

  function selectStep(index: number, manual = true) {
    setActiveIndex(index);
    setElapsed(0);
    if (manual) setIsPlaying(false);
  }

  function togglePlayback() {
    if (!isPlaying && activeIndex === STEPS.length - 1 && elapsed === 0) {
      setActiveIndex(0);
      setElapsed(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((current) => !current);
  }

  function resetDemo() {
    setActiveIndex(0);
    setElapsed(0);
    setIsPlaying(true);
    setQrOpen(false);
    setResetVersion((current) => current + 1);
  }

  function explore() {
    if (onNavigate) {
      onNavigate(step.section);
      onClose?.();
      return;
    }
    resetDemo();
  }

  return <div className="expo-mode-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
    <section ref={dialogRef} className="expo-mode" role="dialog" aria-modal="true" aria-labelledby="expo-mode-title" tabIndex={-1} style={{ '--expo-accent': step.accent, '--expo-progress': `${progress}%`, '--expo-timer': `${timerProgress}%` } as CSSProperties}>
      <div className="expo-mode-aurora" aria-hidden="true" />
      <header className="expo-mode-header">
        <div className="expo-mode-brand"><span><i /> MODO EXPO</span><strong>SIGDE</strong></div>
        <div className="expo-prep-tools">
          <span className={isOnline ? 'expo-connection' : 'expo-connection expo-connection--offline'}><i />{isOnline ? 'Demo lista' : 'Sin conexión · demo activa'}</span>
          <button type="button" onClick={() => { setIsPlaying(false); setQrOpen(true); }} aria-label="Mostrar código QR para votar"><span aria-hidden="true">☆</span> Votar</button>
          <button type="button" onClick={resetDemo} aria-label="Reiniciar demostración"><span aria-hidden="true">↻</span> Reiniciar</button>
        </div>
        <button className={`expo-autoplay${isPlaying ? ' expo-autoplay--playing' : ''}`} type="button" onClick={togglePlayback} aria-label={isPlaying ? 'Pausar presentación automática' : activeIndex === STEPS.length - 1 && elapsed === 0 ? 'Repetir presentación' : 'Continuar presentación automática'}><span aria-hidden="true">{isPlaying ? 'Ⅱ' : activeIndex === STEPS.length - 1 && elapsed === 0 ? '↻' : '▶'}</span><div><strong>{isPlaying ? 'Presentando' : activeIndex === STEPS.length - 1 && elapsed === 0 ? 'Repetir' : 'En pausa'}</strong><small>{isPlaying ? `${secondsLeft} s` : 'Control manual'}</small></div><i /></button>
        <div className="expo-mode-progress-copy"><span>MISIONES</span><strong>{String(activeIndex + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}</strong></div>
        {onClose && <button type="button" aria-label="Cerrar Modo Expo" onClick={onClose}>×</button>}
      </header>

      <div className="expo-mode-progress" aria-hidden="true"><i /></div>

      <div className="expo-mode-body">
        <nav className="expo-mode-steps" aria-label="Misiones de la presentación">
          {STEPS.map((item, index) => <button key={item.id} type="button" className={index === activeIndex ? 'active' : ''} aria-current={index === activeIndex ? 'step' : undefined} onClick={() => selectStep(index)}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{item.proof}</strong><small>{item.kicker.split(' · ')[1]}</small></div></button>)}
        </nav>

        {step.id === 'evidencia' ? <InformationJourney key={resetVersion} isPlaying={isPlaying} onInteraction={() => setIsPlaying(false)} onExplore={onNavigate ? (section) => { onNavigate(section); onClose?.(); } : undefined} /> : <main className="expo-mode-story" key={step.id}>
          <span className="expo-mode-kicker">{step.kicker}</span>
          <div className="expo-mode-symbol" aria-hidden="true">{step.icon}</div>
          <h2 id="expo-mode-title">{step.title}</h2>
          <p className="expo-mode-statement">{step.statement}</p>
          <p className="expo-mode-detail">{step.detail}</p>

          {activeIndex === 0 && <div className="expo-mode-metrics" aria-label="Indicadores actuales">
            {metricCards.map((metric) => <div key={metric.label}><strong>{metric.value.toLocaleString('es-CO')}</strong><span>{metric.label}</span></div>)}
          </div>}

          {activeIndex !== 0 && <div className="expo-mode-proof"><span aria-hidden="true">{step.icon}</span><div><small>EL SUPERPODER DE ESTA MISIÓN</small><strong>{step.proof}</strong></div></div>}

          <footer className="expo-mode-actions">
            <button type="button" className="expo-mode-explore" onClick={explore}>{onNavigate ? 'Verlo en acción' : 'Volver a comenzar'} <span aria-hidden="true">{onNavigate ? '↗' : '↻'}</span></button>
            <div><button type="button" disabled={activeIndex === 0} aria-label="Paso anterior" onClick={() => selectStep(Math.max(0, activeIndex - 1))}>←</button><button type="button" disabled={activeIndex === STEPS.length - 1} aria-label="Paso siguiente" onClick={() => selectStep(Math.min(STEPS.length - 1, activeIndex + 1))}>→</button></div>
          </footer>
        </main>}
      </div>

      <footer className="expo-mode-footer"><span><i /> Explora con tranquilidad: este recorrido no cambia ningún dato</span><p>Usa <kbd>←</kbd> <kbd>→</kbd> para avanzar · <kbd>Esc</kbd> para cerrar</p></footer>

      {qrOpen && <div className="expo-qr-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setQrOpen(false); }}>
        <section className="expo-qr-dialog expo-vote-card expo-vote-card--simple" role="dialog" aria-modal="true" aria-labelledby="expo-qr-title">
          <button type="button" className="expo-qr-close" onClick={() => setQrOpen(false)} aria-label="Cerrar código QR">×</button>
          <header className="expo-vote-brand"><div><span className="expo-vote-logo"><Image src="/Logo-login.png" alt="Logo de SIGDE" width={54} height={58} priority /></span><p><strong>SIGDE</strong><small>Sistema de Gestión Digital Escolar</small></p></div></header>
          <div className="expo-vote-action"><div><span>¿TE GUSTÓ SIGDE?</span><h3 id="expo-qr-title">¡Califica mi proyecto!</h3><p>Si consideras que SIGDE es creativo, útil, claro y funcional, agradecería una calificación de <strong>5 en cada apartado</strong>.</p><small>Alejandro Hurtado · 11-2</small></div><div className="expo-vote-qr-wrap"><div className="expo-qr-code"><QRCodeSVG value={VOTE_URL} size={340} level="H" marginSize={2} bgColor="#ffffff" fgColor="#071522" /></div><b>ESCANEA PARA VOTAR</b></div></div>
        </section>
      </div>}
    </section>
  </div>;
}

type JourneyKey = 'observer' | 'exit' | 'analysis';

const JOURNEYS: Record<JourneyKey, {
  label: string;
  icon: string;
  title: string;
  intro: string;
  color: string;
  reassurance: string;
  steps: Array<{ title: string; text: string }>;
  preview: { eyebrow: string; title: string; subject: string; lines: string[]; badge: string };
}> = {
  observer: {
    label: 'Observador y Gmail',
    icon: '✉',
    title: 'Un mensaje para conversar, no para señalar',
    intro: 'Mira cómo una anotación se convierte en información clara para la familia.',
    color: '#8d7dff',
    reassurance: 'El correo no dice que el estudiante sea “malo” ni decide un castigo. Informa lo registrado y abre una conversación con la institución.',
    steps: [
      { title: 'Docente · Nuevo reporte', text: 'En Reportes, el docente busca al estudiante y escribe qué ocurrió, cuándo, dónde y qué hizo inicialmente.' },
      { title: 'SIGDE crea el observador', text: 'El sistema guarda motivo, reunión, acuerdos, docente responsable y evidencias en una sola historia.' },
      { title: 'Gmail recibe el observador', text: 'La familia recibe el mismo resumen informativo generado por SIGDE, con fecha, grupo y motivo.' },
      { title: 'Comienza el diálogo', text: 'La familia puede pedir más contexto. La voz del estudiante también hace parte de la historia.' },
    ],
    preview: { eyebrow: 'GMAIL · VISTA DE EJEMPLO', title: 'Nueva anotación en el observador', subject: 'Observador #08 · Estudiante de demostración', lines: ['Fecha, grupo y docente', 'Motivo registrado', 'Acuerdos de la reunión'], badge: 'Correo informativo' },
  },
  exit: {
    label: 'Salida segura',
    icon: '✓',
    title: 'Una confirmación que ayuda a cuidar',
    intro: 'La salida queda registrada para que las personas autorizadas sepan qué ocurrió.',
    color: '#57d7ad',
    reassurance: 'Este correo no es una alerta disciplinaria. Es un comprobante de seguridad y permite reaccionar si alguien no reconoce la salida.',
    steps: [
      { title: 'Portería · Registrar salida', text: 'El personal selecciona al estudiante y registra quién lo recoge, parentesco y documento.' },
      { title: 'Documento verificado', text: 'SIGDE valida la información y protege el número: en el correo solo muestra sus últimos cuatro dígitos.' },
      { title: 'Registro guardado', text: 'La salida aparece con fecha, hora, estudiante, responsable de portería y persona que recoge.' },
      { title: 'Gmail confirma la salida', text: 'Familia y persona que recoge reciben un comprobante. Si no reconocen la salida, pueden avisar al colegio.' },
    ],
    preview: { eyebrow: 'GMAIL · VISTA DE EJEMPLO', title: 'Salida registrada correctamente', subject: 'Salida registrada · Estudiante de demostración', lines: ['Fecha y hora verificadas', 'Persona que recoge', 'Documento protegido ·•••• 4821'], badge: 'Registro completado' },
  },
  analysis: {
    label: 'Análisis de señales',
    icon: '✦',
    title: 'Conectar puntos sin sacar conclusiones rápidas',
    intro: 'SIGDE puede notar repeticiones, pero nunca conoce toda la historia por sí solo.',
    color: '#ffbd59',
    reassurance: 'Una alerta no es una sanción, un diagnóstico ni una prueba de culpabilidad. Es una invitación para mirar el contexto y acompañar mejor.',
    steps: [
      { title: 'Se registran 3 reportes', text: 'La regla institucional detecta tres reportes relacionados dentro de los últimos 30 días.' },
      { title: 'SIGDE genera una alerta', text: 'Seguimiento muestra el patrón, las fechas y los reportes que activaron la regla.' },
      { title: 'Centro de decisión', text: 'El análisis presenta confianza, evidencias, información faltante y una acción sugerida.' },
      { title: 'Coordinación revisa', text: 'Una persona contrasta versiones y registra su decisión. El sistema nunca sanciona automáticamente.' },
    ],
    preview: { eyebrow: 'CENTRO DE DECISIÓN', title: 'Revisión humana necesaria', subject: '3 señales conectadas en 30 días', lines: ['Evidencias relacionadas', 'Información que todavía falta', 'Siguiente paso sugerido'], badge: 'No decide por ti' },
  },
};

function InformationJourney({ isPlaying, onInteraction, onExplore }: { isPlaying: boolean; onInteraction: () => void; onExplore?: (section: ExpoSection) => void }) {
  const [journeyKey, setJourneyKey] = useState<JourneyKey>('observer');
  const [journeyStep, setJourneyStep] = useState(0);
  const journey = JOURNEYS[journeyKey];

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setTimeout(() => {
      if (journeyStep < JOURNEYS[journeyKey].steps.length - 1) {
        setJourneyStep((current) => current + 1);
        return;
      }
      const order: JourneyKey[] = ['observer', 'exit', 'analysis'];
      const currentJourney = order.indexOf(journeyKey);
      if (currentJourney < order.length - 1) {
        setJourneyKey(order[currentJourney + 1]);
        setJourneyStep(0);
      }
    }, 3_400);
    return () => window.clearTimeout(timer);
  }, [isPlaying, journeyKey, journeyStep]);

  function selectJourney(key: JourneyKey) {
    onInteraction();
    setJourneyKey(key);
    setJourneyStep(0);
  }

  return <main className="information-journey" style={{ '--journey-accent': journey.color } as CSSProperties}>
    <header><div><span>MISIÓN 02 · EL VIAJE DE LA INFORMACIÓN</span><h2 id="expo-mode-title">¿Qué pasa después de hacer clic?</h2><p>Elige una historia y sigue sus pasos.</p></div><strong aria-hidden="true">{journey.icon}</strong></header>
    <div className="journey-tabs" role="tablist" aria-label="Historias disponibles">
      {(Object.keys(JOURNEYS) as JourneyKey[]).map((key) => <button key={key} type="button" role="tab" aria-selected={journeyKey === key} className={journeyKey === key ? 'active' : ''} onClick={() => selectJourney(key)}><span aria-hidden="true">{JOURNEYS[key].icon}</span>{JOURNEYS[key].label}</button>)}
    </div>
    <div className="journey-workspace">
      <section className="journey-map" aria-label={`Pasos de ${journey.label}`}>
        <div className="journey-map-heading"><span>{journey.label}</span><h3>{journey.title}</h3><p>{journey.intro}</p></div>
        <ol>{journey.steps.map((item, index) => <li key={item.title} className={index === journeyStep ? 'active' : index < journeyStep ? 'done' : ''}><button type="button" onClick={() => { onInteraction(); setJourneyStep(index); }}><span>{index < journeyStep ? '✓' : index + 1}</span><div><strong>{item.title}</strong>{index === journeyStep && <p>{item.text}</p>}</div></button></li>)}</ol>
      </section>
      <JourneyLivePreview journeyKey={journeyKey} step={journeyStep} reassurance={journey.reassurance} />
    </div>
    <footer>{onExplore && <button type="button" className="journey-open-module" onClick={() => onExplore(journeyKey === 'exit' ? 'salidas' : journeyKey === 'analysis' ? 'seguimiento' : 'reportes')}>Abrir módulo real ↗</button>}<span>{isPlaying ? 'Reproducción automática' : `Paso ${journeyStep + 1} de ${journey.steps.length}`}</span><div><button type="button" disabled={journeyStep === 0} onClick={() => { onInteraction(); setJourneyStep((current) => Math.max(0, current - 1)); }}>← Anterior</button><button type="button" disabled={journeyStep === journey.steps.length - 1} onClick={() => { onInteraction(); setJourneyStep((current) => Math.min(journey.steps.length - 1, current + 1)); }}>Siguiente →</button></div></footer>
  </main>;
}

function JourneyLivePreview({ journeyKey, step, reassurance }: { journeyKey: JourneyKey; step: number; reassurance: string }) {
  return <section className="journey-live-preview" aria-live="polite">
    <div className="journey-demo-label"><span><i /> DEMOSTRACIÓN FICTICIA</span><strong>{step + 1} / 4</strong></div>
    {journeyKey === 'observer' && <ObserverDemo step={step} />}
    {journeyKey === 'exit' && <ExitDemo step={step} />}
    {journeyKey === 'analysis' && <AnalysisDemo step={step} />}
    <p className="journey-reassurance"><span aria-hidden="true">♡</span>{reassurance}</p>
  </section>;
}

function ObserverDemo({ step }: { step: number }) {
  if (step < 2) return <DemoWindow app="SIGDE · Reportes" title={step === 0 ? 'Nuevo reporte' : 'Observador creado'}>
    {step === 0 ? <div className="demo-form"><label>Estudiante<strong>Sofía Martínez · 7-2</strong></label><div><label>Fecha<strong>5 nov 2026</strong></label><label>Lugar<strong>Salón 7-2</strong></label></div><label>¿Qué ocurrió?<p>Durante el trabajo en equipo hubo una discusión. Se escucharon ambas versiones y se acordó conversar al finalizar la clase.</p></label><button>Guardar reporte</button></div> : <div className="demo-record"><span>OBSERVADOR #08 · SITUACIÓN TIPO I</span><h4>Historia registrada sin etiquetas</h4><dl><div><dt>Hecho</dt><dd>Discusión durante trabajo en equipo</dd></div><div><dt>Primera acción</dt><dd>Escucha de ambas versiones</dd></div><div><dt>Acuerdo</dt><dd>Conversación de seguimiento</dd></div></dl><small>Registrado por Docente Demo · Trazabilidad activa</small></div>}
  </DemoWindow>;
  return <GmailDemo subject="Observador #08 - Sofía Martínez" badge="SITUACIÓN TIPO I" color="#f4c430" heading="Nueva anotación en el observador" intro="Hola, familia de Sofía. Se ha registrado una nueva anotación informativa." details={[['GRUPO', '7-2'], ['FECHA', '5 de noviembre de 2026'], ['DOCENTE', 'Docente Demo'], ['MOTIVO', 'Seguimiento a conversación de convivencia']]} footer="Este correo es informativo. Si requiere ampliar la información, comuníquese con la institución." />;
}

function ExitDemo({ step }: { step: number }) {
  if (step < 3) return <DemoWindow app="SIGDE · Control de salidas" title={step === 2 ? 'Salida registrada' : 'Registrar salida'}>
    {step < 2 ? <div className="demo-form"><label>Estudiante<strong>Sofía Martínez · 7-2</strong></label><div><label>Persona que recoge<strong>Laura Martínez</strong></label><label>Parentesco<strong>Madre</strong></label></div><label>Documento verificado<strong>{step === 0 ? 'C.C. 1.•••.4821' : '✓ Identidad confirmada'}</strong></label><button>{step === 0 ? 'Verificar y registrar' : 'Documento protegido'}</button></div> : <div className="demo-exit-ticket"><span>✓</span><div><small>SALIDA CONFIRMADA</small><h4>Sofía Martínez · 7-2</h4><p>5 nov 2026 · 2:34 p. m.</p><strong>Recoge: Laura Martínez · Madre</strong></div></div>}
  </DemoWindow>;
  return <GmailDemo subject="Salida registrada - Sofía Martínez" badge="REGISTRO COMPLETADO" color="#16865f" heading="Confirmación de salida" intro="Se registró correctamente la salida de Sofía Martínez." details={[['FECHA Y HORA', '5 nov 2026 · 2:34 p. m.'], ['PERSONA QUE RECOGE', 'Laura Martínez'], ['PARENTESCO', 'Madre'], ['DOCUMENTO', 'C.C. ••••4821']]} footer="Si no reconoce esta salida, comuníquese de inmediato con la institución." />;
}

function AnalysisDemo({ step }: { step: number }) {
  if (step === 0) return <DemoWindow app="SIGDE · Reportes" title="Tres señales en 30 días"><div className="demo-report-stack">{['Discusión en trabajo grupal', 'Dificultad durante actividad deportiva', 'Nuevo desacuerdo en clase'].map((title, index) => <div key={title}><span>0{index + 1}</span><p><strong>{title}</strong><small>{22 + index * 6} oct 2026 · Tipo I</small></p></div>)}</div></DemoWindow>;
  if (step === 1) return <DemoWindow app="SIGDE · Seguimiento" title="Alerta generada por regla"><div className="demo-alert-detected"><span>✦</span><small>REGLA INSTITUCIONAL</small><h4>Reincidencia de reportes</h4><p>3 reportes en los últimos 30 días</p><strong>Revisión humana recomendada</strong></div></DemoWindow>;
  return <DemoWindow app="SIGDE · Centro de decisión" title="Análisis activo"><div className="demo-decision"><div className="demo-confidence"><strong>82<small>%</small></strong><span>Base consistente</span></div><div><small>SIGUIENTE MEJOR PASO</small><h4>{step === 2 ? 'Revisar evidencias y escuchar el contexto' : 'Decisión registrada por coordinación'}</h4><p>{step === 2 ? '3 evidencias conectadas · Falta contrastar versiones.' : 'Seguimiento acordado · Próxima revisión en 7 días.'}</p></div></div><div className="demo-human-note">◇ <strong>Copiloto, no piloto automático.</strong> La decisión pertenece al equipo institucional.</div></DemoWindow>;
}

function DemoWindow({ app, title, children }: { app: string; title: string; children: React.ReactNode }) {
  return <div className="demo-window"><header><span>{app}</span><strong>{title}</strong><i>•••</i></header><div>{children}</div></div>;
}

function GmailDemo({ subject, badge, color, heading, intro, details, footer }: { subject: string; badge: string; color: string; heading: string; intro: string; details: Array<[string, string]>; footer: string }) {
  return <div className="gmail-demo"><header><strong><i>M</i> Gmail</strong><span>Bandeja de entrada</span></header><div className="gmail-subject"><strong>{subject}</strong><small>SIGDE &lt;notificaciones@colegio.edu.co&gt;</small></div><article><div className="gmail-sigde">SI<span>G</span>DE</div><div className="gmail-banner" style={{ '--mail-color': color } as CSSProperties}><strong>{heading}</strong><span>{badge}</span></div><div className="gmail-body"><p>{intro}</p><dl>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><small>{footer}</small></div></article></div>;
}
