'use client';

import { FormEvent, useState } from 'react';

export default function ProfileWorkspace({ usuario, onUpdated }: { usuario: { nombre: string; correo: string; rol: string }; onUpdated: () => void }) {
  const [nombre, setNombre] = useState(usuario.nombre);
  const [guardando, setGuardando] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; texto: string } | null>(null);
  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setGuardando(true); setFeedback(null);
    try {
      const response = await fetch('/api/perfil', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar el perfil.');
      setNombre(data.nombre); setFeedback({ error: false, texto: 'Tu nombre se actualizó correctamente.' }); onUpdated();
    } catch (err) { setFeedback({ error: true, texto: err instanceof Error ? err.message : 'No hay conexión con el servidor.' }); }
    finally { setGuardando(false); }
  }
  return <section className="workspace-panel settings-workspace"><header className="module-page-heading"><div className="module-title"><h2>Mi perfil</h2><p>Actualiza tu nombre y consulta los datos de tu cuenta.</p></div></header>
    {feedback && <p className={`feedback ${feedback.error ? 'error' : 'success'}`} role={feedback.error ? 'alert' : 'status'}>{feedback.texto}</p>}
    <form className="settings-form" onSubmit={guardar}><div className="settings-card"><div className="settings-fields"><label><span>Nombre completo</span><input required minLength={3} maxLength={120} value={nombre} disabled={guardando} onChange={(e) => setNombre(e.target.value)} /></label></div><dl className="profile-list"><div><dt>Correo</dt><dd>{usuario.correo}</dd></div><div><dt>Rol</dt><dd>{usuario.rol === 'Porteria' ? 'Portería' : usuario.rol}</dd></div></dl><p>Para cambiar tu correo o rol, contacta a Coordinación.</p><button type="submit" className="primary-button" disabled={guardando || nombre.trim() === usuario.nombre}>{guardando ? 'Guardando...' : 'Guardar cambios'}</button></div></form>
  </section>;
}
