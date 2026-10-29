'use client';

import { useState } from 'react';

const WEEKLY_SERIES = [
  { key: 'tipoI', label: 'Tipo I', color: '#E4B648' },
  { key: 'tipoII', label: 'Tipo II', color: '#E17C2E' },
  { key: 'tipoIII', label: 'Tipo III', color: '#E65E67' },
] as const;

const MONTHLY_SERIES = [
  { key: 'reportes', label: 'Reportes', color: '#8C73D6' },
  { key: 'salidas', label: 'Salidas', color: '#55B69A' },
] as const;

const TYPE_COLORS: Record<string, string> = { TIPO_I: '#E4B648', TIPO_II: '#E17C2E', TIPO_III: '#E65E67' };

function smoothLinePath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

export function WeeklyStatisticsChart({ data }: { data: Array<{ dia: string; tipoI: number; tipoII: number; tipoIII: number }> }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const width = 760; const height = 260; const padding = { top: 24, right: 20, bottom: 32, left: 40 };
  const chartWidth = width - padding.left - padding.right; const chartHeight = height - padding.top - padding.bottom;
  const highest = Math.max(0, ...data.flatMap((item) => WEEKLY_SERIES.map((serie) => item[serie.key])));
  const maxValue = Math.max(4, Math.ceil(highest / 4) * 4);
  const xFor = (index: number) => padding.left + (chartWidth / Math.max(1, data.length - 1)) * index;
  const yFor = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const hovered = hoveredIndex === null ? null : data[hoveredIndex];
  const hoveredX = hoveredIndex === null ? 0 : xFor(hoveredIndex);
  const tooltipX = hoveredX > width / 2 ? hoveredX - 166 : hoveredX + 12;
  const tooltipY = 12;
  const descripcion = data.length
    ? data.map((item) => `${item.dia}: ${item.tipoI} tipo I, ${item.tipoII} tipo II y ${item.tipoIII} tipo III`).join('. ')
    : 'No hay reportes registrados esta semana.';

  return <div className="statistics-line-chart activity-chart-wrap" onMouseLeave={() => setHoveredIndex(null)}>
    <p id="weekly-statistics-description" className="sr-only">{descripcion}</p>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Reportes diarios de la semana clasificados por tipo" aria-describedby="weekly-statistics-description">
      {Array.from({ length: 5 }, (_, index) => Math.round((maxValue / 4) * index)).map((tick) => { const y = yFor(tick); return <g key={tick}><line className="activity-grid-line" x1={padding.left} x2={width - padding.right} y1={y} y2={y} /><text className="activity-axis-label" x={padding.left - 9} y={y + 4} textAnchor="end">{tick}</text></g>; })}
      {data.map((item, index) => <line key={item.dia} className="activity-grid-line activity-grid-line--vertical" x1={xFor(index)} x2={xFor(index)} y1={padding.top} y2={height - padding.bottom} />)}
      {WEEKLY_SERIES.map((serie) => <path key={serie.key} className="activity-series-line" d={smoothLinePath(data.map((item, index) => ({ x: xFor(index), y: yFor(item[serie.key]) })))} stroke={serie.color} />)}
      {data.map((item, index) => <text key={item.dia} className="activity-axis-label activity-day-label" x={xFor(index)} y={height - 9} textAnchor="middle">{item.dia}</text>)}
      {hovered && <><line className="activity-hover-line" x1={hoveredX} x2={hoveredX} y1={padding.top} y2={height - padding.bottom} />{WEEKLY_SERIES.map((serie) => <circle key={serie.key} cx={hoveredX} cy={yFor(hovered[serie.key])} r="4.5" fill={serie.color} stroke="#eaf5ff" strokeWidth="2" />)}<g className="activity-tooltip" transform={`translate(${tooltipX} ${tooltipY})`}><rect width="154" height="88" rx="9"/><text className="activity-tooltip-day" x="12" y="20">{hovered.dia}</text>{WEEKLY_SERIES.map((serie, index) => <g key={serie.key} transform={`translate(0 ${32 + index * 17})`}><circle cx="14" cy="0" r="4" fill={serie.color}/><text x="25" y="4">{serie.label}: <tspan>{hovered[serie.key]}</tspan></text></g>)}</g></>}
      {data.map((item, index) => { const step = chartWidth / Math.max(1, data.length - 1); return <rect key={`hit-${item.dia}`} className="activity-hit-area" x={Math.max(padding.left, xFor(index) - step / 2)} y={padding.top} width={index === 0 || index === data.length - 1 ? step / 2 : step} height={chartHeight} onMouseEnter={() => setHoveredIndex(index)} onFocus={() => setHoveredIndex(index)} tabIndex={0} aria-label={`${item.dia}: ${item.tipoI} Tipo I, ${item.tipoII} Tipo II y ${item.tipoIII} Tipo III`} />; })}
    </svg>
    {!highest && <div className="dashboard-chart-empty"><strong>Sin reportes esta semana</strong><span>La gráfica se actualizará con la próxima actividad registrada.</span></div>}
  </div>;
}

export function ReportTypesDonut({ data }: { data: Array<{ tipo: string; total: number }> }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const total = data.reduce((sum, item) => sum + item.total, 0); const radius = 58; const circumference = 2 * Math.PI * radius;
  const label = (tipo: string) => tipo === 'TIPO_I' ? 'Tipo I' : tipo === 'TIPO_II' ? 'Tipo II' : tipo === 'TIPO_III' ? 'Tipo III' : tipo.replaceAll('_', ' ');
  const descripcion = total ? data.map((item) => `${label(item.tipo)}: ${item.total}`).join('. ') : 'No hay reportes para distribuir.';
  return <div className="statistics-donut-layout" onMouseLeave={() => setHoveredIndex(null)}><p id="report-types-description" className="sr-only">{descripcion}</p><div className="statistics-donut"><svg viewBox="0 0 180 180" role="img" aria-label={`Distribución de ${total} reportes`} aria-describedby="report-types-description"><circle className="donut-track" cx="90" cy="90" r={radius}/><g transform="rotate(-90 90 90)">{data.map((item, index) => { const length = total ? (item.total / total) * circumference : 0; const previous = data.slice(0, index).reduce((sum, entry) => sum + entry.total, 0); const offset = total ? -(previous / total) * circumference : 0; return <circle key={item.tipo} className={hoveredIndex === index ? 'donut-segment donut-segment--active' : 'donut-segment'} cx="90" cy="90" r={radius} stroke={TYPE_COLORS[item.tipo] || '#42B8D5'} strokeDasharray={`${Math.max(0, length - 2)} ${circumference}`} strokeDashoffset={offset} onMouseEnter={() => setHoveredIndex(index)} onFocus={() => setHoveredIndex(index)} tabIndex={0} aria-label={`${label(item.tipo)}: ${item.total}`}/>; })}</g><text className="donut-total" x="90" y="86" textAnchor="middle">{hoveredIndex === null ? total : data[hoveredIndex]?.total}</text><text className="donut-total-label" x="90" y="104" textAnchor="middle">{hoveredIndex === null ? 'Reportes' : label(data[hoveredIndex]?.tipo || '')}</text></svg></div><div className="distribution-legend">{data.map((item, index) => <button type="button" key={item.tipo} className={hoveredIndex === index ? 'distribution-legend-item distribution-legend-item--active' : 'distribution-legend-item'} onMouseEnter={() => setHoveredIndex(index)} onFocus={() => setHoveredIndex(index)} onBlur={() => setHoveredIndex(null)}><span><i style={{ background: TYPE_COLORS[item.tipo] || '#42B8D5' }}/>{label(item.tipo)}</span><strong>{item.total}</strong></button>)}</div></div>;
}

export function MonthlyTrendChart({ data }: { data: Array<{ mes: string; reportes: number; salidas: number }> }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const width = 760; const height = 270; const padding = { top: 24, right: 20, bottom: 36, left: 40 };
  const chartWidth = width - padding.left - padding.right; const chartHeight = height - padding.top - padding.bottom;
  const highest = Math.max(0, ...data.flatMap((item) => MONTHLY_SERIES.map((serie) => item[serie.key])));
  const maxValue = Math.max(4, Math.ceil(highest / 4) * 4);
  const xFor = (index: number) => padding.left + (chartWidth / Math.max(1, data.length - 1)) * index;
  const yFor = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const hovered = hoveredIndex === null ? null : data[hoveredIndex]; const hoveredX = hoveredIndex === null ? 0 : xFor(hoveredIndex);
  const tooltipX = hoveredX > width / 2 ? hoveredX - 166 : hoveredX + 12;
  const descripcion = data.length ? data.map((item) => `${item.mes}: ${item.reportes} reportes y ${item.salidas} salidas`).join('. ') : 'No hay datos mensuales disponibles.';
  return <div className="statistics-line-chart activity-chart-wrap" onMouseLeave={() => setHoveredIndex(null)}><p id="monthly-trend-description" className="sr-only">{descripcion}</p><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tendencia mensual de reportes y salidas" aria-describedby="monthly-trend-description">{Array.from({ length: 5 }, (_, index) => Math.round((maxValue / 4) * index)).map((tick) => { const y = yFor(tick); return <g key={tick}><line className="activity-grid-line" x1={padding.left} x2={width - padding.right} y1={y} y2={y}/><text className="activity-axis-label" x={padding.left - 9} y={y + 4} textAnchor="end">{tick}</text></g>; })}{data.map((item, index) => <line key={item.mes} className="activity-grid-line activity-grid-line--vertical" x1={xFor(index)} x2={xFor(index)} y1={padding.top} y2={height - padding.bottom}/>)}{MONTHLY_SERIES.map((serie) => <path key={serie.key} className="activity-series-line" d={smoothLinePath(data.map((item, index) => ({ x: xFor(index), y: yFor(item[serie.key]) })))} stroke={serie.color}/>)}{data.map((item, index) => <text key={item.mes} className="activity-axis-label activity-day-label" x={xFor(index)} y={height - 10} textAnchor="middle">{item.mes}</text>)}{hovered && <><line className="activity-hover-line" x1={hoveredX} x2={hoveredX} y1={padding.top} y2={height - padding.bottom}/>{MONTHLY_SERIES.map((serie) => <circle key={serie.key} cx={hoveredX} cy={yFor(hovered[serie.key])} r="4.5" fill={serie.color} stroke="#eaf5ff" strokeWidth="2"/>)}<g className="activity-tooltip" transform={`translate(${tooltipX} 18)`}><rect width="154" height="70" rx="9"/><text className="activity-tooltip-day" x="12" y="20">{hovered.mes}</text>{MONTHLY_SERIES.map((serie, index) => <g key={serie.key} transform={`translate(0 ${34 + index * 18})`}><circle cx="14" cy="0" r="4" fill={serie.color}/><text x="25" y="4">{serie.label}: <tspan>{hovered[serie.key]}</tspan></text></g>)}</g></>}{data.map((item, index) => { const step = chartWidth / Math.max(1, data.length - 1); return <rect key={`hit-${item.mes}`} className="activity-hit-area" x={Math.max(padding.left, xFor(index) - step / 2)} y={padding.top} width={index === 0 || index === data.length - 1 ? step / 2 : step} height={chartHeight} onMouseEnter={() => setHoveredIndex(index)} onFocus={() => setHoveredIndex(index)} tabIndex={0} aria-label={`${item.mes}: ${item.reportes} reportes y ${item.salidas} salidas`}/>; })}</svg></div>;
}
