import type { ReactNode } from 'react';

type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'reserved';

export default function StatusBadge({ tone = 'info', children }: { tone?: StatusTone; children: ReactNode }) {
  return <span className={`ui-status ui-status--${tone}`}>{children}</span>;
}
