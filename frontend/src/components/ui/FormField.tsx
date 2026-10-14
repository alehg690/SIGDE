'use client';

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

type SharedProps = { label: string; help?: string; error?: string; id?: string };

function FieldShell({ id, label, help, error, children }: SharedProps & { children: ReactNode }) {
  return <label className="ui-field" htmlFor={id}>
    <span>{label}</span>
    {children}
    {error ? <span className="ui-field__error">{error}</span> : help ? <span className="ui-field__help">{help}</span> : null}
  </label>;
}

export function TextField({ label, help, error, id, className = '', ...props }: SharedProps & InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  return <FieldShell id={controlId} label={label} help={help} error={error}><input {...props} id={controlId} className={`ui-control ${className}`.trim()} aria-invalid={error ? true : undefined} /></FieldShell>;
}

export function TextAreaField({ label, help, error, id, className = '', ...props }: SharedProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  return <FieldShell id={controlId} label={label} help={help} error={error}><textarea {...props} id={controlId} className={`ui-control ${className}`.trim()} aria-invalid={error ? true : undefined} /></FieldShell>;
}

export function SelectField({ label, help, error, id, className = '', children, ...props }: SharedProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  return <FieldShell id={controlId} label={label} help={help} error={error}><select {...props} id={controlId} className={`ui-control ${className}`.trim()} aria-invalid={error ? true : undefined}>{children}</select></FieldShell>;
}
