import type { ReactNode } from 'react';

export default function ModuleHeader({ icon, kicker, title, description, action }: {
  icon: ReactNode;
  kicker: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return <header className="ui-module-header">
    <div className="ui-module-header__copy">
      <span className="ui-module-header__icon" aria-hidden="true">{icon}</span>
      <div><span className="ui-module-header__kicker">{kicker}</span><h2>{title}</h2><p>{description}</p></div>
    </div>
    {action && <div className="ui-module-header__action">{action}</div>}
  </header>;
}
