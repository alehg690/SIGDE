import type { ReactNode } from 'react';

export type KpiItem = { label: string; value: ReactNode; detail: string; icon?: ReactNode };

export default function KpiGrid({ items, label = 'Resumen del módulo' }: { items: KpiItem[]; label?: string }) {
  return <div className="ui-kpi-grid" aria-label={label}>{items.map((item, index) => <article className="ui-kpi-card" key={item.label}>
    <span className="ui-kpi-card__marker" aria-hidden="true">{item.icon ?? String(index + 1).padStart(2, '0')}</span><span className="ui-kpi-card__label">{item.label}</span><strong className="ui-kpi-card__value">{item.value}</strong><small className="ui-kpi-card__detail">{item.detail}</small>
  </article>)}</div>;
}
