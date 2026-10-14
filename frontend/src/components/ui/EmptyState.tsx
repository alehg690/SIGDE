import type { ReactNode } from 'react';

export default function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="ui-empty-state"><span className="ui-empty-state__icon" aria-hidden="true">{icon}</span><strong>{title}</strong><p>{description}</p>{action}</div>;
}
