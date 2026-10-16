'use client';

import ModuleHeader from '@/components/ui/ModuleHeader';
import KpiGrid from '@/components/ui/KpiGrid';
import { MonthlyTrendChart, ReportTypesDonut, WeeklyStatisticsChart } from '@/components/statistics/StatisticsCharts';

type StatisticsData = {
  metricas: { estudiantes: number; reportes: number; reportesPendientes: number; alertasActivas: number; salidasHoy: number };
  resumenSemanal: { reportes: number; reportesSemanaAnterior: number; gradoMayorActividad: string | null; registrosGrado: number; salidasAutorizadas: number };
  graficas: {
    actividadSemanal: Array<{ dia: string; tipoI: number; tipoII: number; tipoIII: number }>;
    reportesPorTipo: Array<{ tipo: string; total: number }>;
    salidasPorEstado: Array<{ estado: string; total: number }>;
    tendenciasMensuales: Array<{ mes: string; reportes: number; salidas: number }>;
  };
};

function ExportIcon({ type }: { type: 'pdf' | 'excel' }) {
  return type === 'pdf'
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h9l3 3v14H6z"/><path d="M15 3.5v3h3M9 11h6m-6 3h6m-6 3h4"/></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4zM9 4v16m5-16v16M4 9h16M4 14h16"/></svg>;
}

export default function StatisticsWorkspace({ stats, loading, canExport }: { stats: StatisticsData; loading: boolean; canExport: boolean }) {
  const diferencia = stats.resumenSemanal.reportes - stats.resumenSemanal.reportesSemanaAnterior;

  const exportActions = canExport ? <div className="statistics-export-actions" aria-label="Exportar estadísticas">
    <a className="statistics-export statistics-export--pdf" href="/api/informes/exportar?tipo=resumen&formato=pdf" title="Descargar resumen en PDF"><ExportIcon type="pdf" /><span>PDF</span></a>
    <div className="statistics-export-group"><span>Excel</span><a className="statistics-export statistics-export--excel" href="/api/informes/exportar?tipo=reportes&formato=excel" title="Descargar reportes en Excel"><ExportIcon type="excel" /><span>Reportes</span></a><a className="statistics-export statistics-export--excel" href="/api/informes/exportar?tipo=salidas&formato=excel" title="Descargar salidas en Excel"><ExportIcon type="excel" /><span>Salidas</span></a></div>
  </div> : undefined;

  return <section className="workspace-panel statistics-workspace">
    <ModuleHeader icon={<svg viewBox="0 0 24 24"><path d="M5 20V10m7 10V4m7 16v-7M3 20h18"/></svg>} kicker="Análisis institucional" title="Estadísticas institucionales" description="Consulta indicadores y tendencias para orientar el seguimiento institucional." action={exportActions} />
    {loading ? <div className="module-empty-state statistics-loading" aria-live="polite"><strong>Actualizando estadísticas…</strong><p>Estamos preparando los indicadores y las gráficas.</p></div> : <>
      <KpiGrid label="Resumen estadístico" items={[
        { label: 'Reportes', value: stats.metricas.reportes, detail: `${stats.resumenSemanal.reportes} registrados esta semana`, icon: '01' },
        { label: 'Pendientes', value: stats.metricas.reportesPendientes, detail: 'Requieren revisión institucional', icon: '02' },
        { label: 'Estudiantes', value: stats.metricas.estudiantes, detail: 'Con matrícula activa', icon: '03' },
        { label: 'Salidas', value: stats.resumenSemanal.salidasAutorizadas, detail: 'Autorizadas esta semana', icon: '04' },
      ]} />

      <div className="statistics-grid">
        <article className="statistics-card statistics-card--wide">
          <header><div><span>ACTIVIDAD SEMANAL</span><h3>Reportes por día</h3><p>Comparación diaria según el tipo de situación.</p></div><div className="statistics-legend" aria-label="Tipos de situación"><span><i className="type-one" />Tipo I</span><span><i className="type-two" />Tipo II</span><span><i className="type-three" />Tipo III</span></div></header>
          <div className="statistics-chart-scroll"><WeeklyStatisticsChart data={stats.graficas.actividadSemanal} /></div>
        </article>

        <article className="statistics-card">
          <header><div><span>DISTRIBUCIÓN</span><h3>Reportes por tipo</h3><p>Participación de cada clasificación durante la semana.</p></div></header>
          {stats.graficas.reportesPorTipo.length ? <ReportTypesDonut data={stats.graficas.reportesPorTipo} /> : <div className="module-empty-state statistics-empty"><strong>Sin reportes clasificados</strong><p>Aún no hay información para comparar.</p></div>}
        </article>

        <article className="statistics-card">
          <header><div><span>LECTURA OPERATIVA</span><h3>Datos destacados</h3><p>Información útil para priorizar la revisión.</p></div></header>
          <dl className="statistics-insights"><div><dt>Grado con mayor actividad</dt><dd>{stats.resumenSemanal.gradoMayorActividad || 'Sin datos'}</dd></div><div><dt>Reportes del grado</dt><dd>{stats.resumenSemanal.registrosGrado}</dd></div><div><dt>Variación semanal</dt><dd className={diferencia > 0 ? 'trend-up' : 'trend-down'}>{diferencia === 0 ? 'Sin cambio' : `${diferencia > 0 ? '+' : ''}${diferencia} reportes`}</dd></div><div><dt>Salidas de hoy</dt><dd>{stats.metricas.salidasHoy}</dd></div></dl>
        </article>

        <article className="statistics-card statistics-card--wide">
          <header><div><span>TENDENCIA MENSUAL</span><h3>Reportes y salidas</h3><p>Evolución comparativa de los últimos meses.</p></div><div className="statistics-legend"><span><i className="monthly-report" />Reportes</span><span><i className="monthly-exit" />Salidas</span></div></header>
          {stats.graficas.tendenciasMensuales.length ? <div className="statistics-chart-scroll"><MonthlyTrendChart data={stats.graficas.tendenciasMensuales} /></div> : <div className="module-empty-state statistics-empty"><strong>Aún no hay tendencia mensual</strong><p>Se construirá automáticamente con la actividad del sistema.</p></div>}
        </article>
      </div>
    </>}
  </section>;
}
