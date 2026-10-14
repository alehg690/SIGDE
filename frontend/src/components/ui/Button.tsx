import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'neutral' | 'danger';
type ButtonSize = 'small' | 'normal' | 'icon';

export default function Button({ variant = 'neutral', size = 'normal', loading = false, children, className = '', disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}) {
  return <button
    {...props}
    className={`ui-button ui-button--${variant}${size !== 'normal' ? ` ui-button--${size}` : ''} ${className}`.trim()}
    aria-busy={loading || undefined}
    disabled={disabled || loading}
  >{children}</button>;
}
