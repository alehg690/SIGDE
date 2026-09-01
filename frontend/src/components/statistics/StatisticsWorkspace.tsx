'use client';

type StatisticsData = {
  metricas: {
    estudiantes: number;
    reportes: number;
    reportesPendientes: number;
    alertasActivas: number;
    salidasHoy: number;
  };
  resumenSemanal: {
    reportes: number;
    reportesSemanaAnterior: number;
    gradoMayorActividad: string | null;
    registrosGrado: number;
    salidasAutorizadas: number;
  };
  graficas: {
    actividadSemanal: Array<{ dia: string; tipoI: number; tipoII: number; tipoIII: number }>;
    reportesPorTipo: Array<{ tipo: string; total: number }>;
    salidasPorEstado: Array<{ estado: string; total: number }>;
    tendenciasMensuales: Array<{ mes: string; reportes: number; salidas: number }>;
  };
};

function tipoLabel(value: string) {
  if (value === 'TIPO_I') return 'Tipo I';
  if (value === 'TIPO_II') return 'Tipo II';
  if (value === 'TIPO_III') return 'Tipo III';
  return value.replaceAll('_', ' ');
}

export default function StatisticsWorkspace({ stats, loading, canExport }: { stats: StatisticsData; loading: boolean; canExport: boolean }) {
  const diferencia = stats.resumenSemanal.reportes - stats.resumenSemanal.reportesSemanaAnterior;
  const maxActividad = Math.max(1, ...stats.graficas.actividadSemanal.flatMap((item) => [item.tipoI, item.tipoII, item.tipoIII]));
  const maxTendencia = Math.max(1, ...stats.graficas.tendenciasMensuales.flatMap((item) => [item.reportes, item.salidas]));

  return <section className="workspace-panel statistics-workspace">
    <header className="module-page-heading"><div className="module-title"><h2>Estadísticas institucionales</h2><p>Analiza tendencias reales de convivencia y control de salidas.</p></div>{canExport && <div className="statistics-export-actions"><a href="/api/informes/exportar?tipo=resumen&formato=pdf">Resumen PDF</a><a href="/api/informes/exportar?tipo=reportes&formato=excel">Reportes Excel</a><a href="/api/informes/exportar?tipo=salidas&formato=excel">Salidas Excel</a></div>}</header>
    {loading ? <p className="module-loading">Actualizando indicadores...</p> : <>
      <div className="module-kpi-grid statistics-kpis">
        <article><span>Reportes totales</span><strong>{stats.metricas.reportes}</strong><small>{stats.metricas.reportesPendientes} pendientes</small></article>
        <article><span>Semana actual</span><strong>{stats.resumenSemanal.reportes}</strong><small className={diferencia > 0 ? 'trend-up' : 'trend-down'}>{diferencia === 0 ? 'Sin cambio' : `${diferencia > 0 ? '+' : ''}${diferencia} frente a la anterior`}</small></article>
        <article><span>Alertas activas</span><strong>{stats.metricas.alertasActivas}</strong><small>Generadas por umbrales</small></article>
        <article><span>Salidas autorizadas</span><strong>{stats.resumenSemanal.salidasAutorizadas}</strong><small>Durante esta semana</small></article>
      </div>
      <div className="statistics-grid">
        <article className="statistics-card statistics-card--wide"><header><div><h3>Actividad de la semana</h3><p>Reportes diarios según el tipo de situación</p></div><div className="statistics-legend"><span><i className="type-one" />Tipo I</span><span><i className="type-two" />Tipo II</span><span><i className="type-three" />Tipo III</span></div></header><div className="weekly-bars">{stats.graficas.actividadSemanal.map((dia) => <div className="weekly-bar-group" key={dia.dia}><div className="weekly-bar-stack"><i className="type-one" style={{ height: `${Math.max(dia.tipoI ? 8 : 0, (dia.tipoI / maxActividad) * 100)}%` }} title={`${dia.tipoI} Tipo I`} /><i className="type-two" style={{ height: `${Math.max(dia.tipoII ? 8 : 0, (dia.tipoII / maxActividad) * 100)}%` }} title={`${dia.tipoII} Tipo II`} /><i className="type-three" style={{ height: `${Math.max(dia.tipoIII ? 8 : 0, (dia.tipoIII / maxActividad) * 100)}%` }} title={`${dia.tipoIII} Tipo III`} /></div><strong>{dia.dia}</strong><small>{dia.tipoI + dia.tipoII + dia.tipoIII}</small></div>)}</div></article>
        <article className="statistics-card"><header><div><h3>Reportes por tipo</h3><p>Distribución de la semana actual</p></div></header><div className="statistics-breakdown">{stats.graficas.reportesPorTipo.length ? stats.graficas.reportesPorTipo.map((item) => { const total = Math.max(1, stats.graficas.reportesPorTipo.reduce((sum, current) => sum + current.total, 0)); return <div key={item.tipo}><span><strong>{tipoLabel(item.tipo)}</strong><small>{item.total}</small></span><i><b style={{ width: `${Math.min(100, (item.total / total) * 100)}%` }} /></i></div>; }) : <p>Sin reportes registrados esta semana.</p>}</div></article>
        <article className="statistics-card"><header><div><h3>Lectura operativa</h3><p>Datos destacados del periodo</p></div></header><dl className="statistics-insights"><div><dt>Grado con mayor actividad</dt><dd>{stats.resumenSemanal.gradoMayorActividad || 'Sin datos'}</dd></div><div><dt>Reportes de ese grado</dt><dd>{stats.resumenSemanal.registrosGrado}</dd></div><div><dt>Estudiantes activos</dt><dd>{stats.metricas.estudiantes}</dd></div><div><dt>Salidas de hoy</dt><dd>{stats.metricas.salidasHoy}</dd></div></dl></article>
        <article className="statistics-card statistics-card--wide"><header><div><h3>Tendencia mensual</h3><p>Comparación entre reportes y salidas</p></div></header>{stats.graficas.tendenciasMensuales.length ? <div className="monthly-trends">{stats.graficas.tendenciasMensuales.map((item) => <div key={item.mes}><span>{item.mes}</span><div><i className="monthly-report" style={{ width: `${(item.reportes / maxTendencia) * 100}%` }}><small>{item.reportes}</small></i><i className="monthly-exit" style={{ width: `${(item.salidas / maxTendencia) * 100}%` }}><small>{item.salidas}</small></i></div></div>)}</div> : <div className="module-empty-state"><strong>Aún no hay tendencia mensual</strong><p>Se construirá automáticamente con la actividad del sistema.</p></div>}</article>
      </div>
    </>}
  </section>;
}
