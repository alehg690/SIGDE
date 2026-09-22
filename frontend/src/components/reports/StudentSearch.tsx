'use client';

import { useId, useRef, useState } from 'react';
import type { Estudiante } from '@/types/students';
import styles from './StudentSearch.module.css';

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
}

export default function StudentSearch({ estudiantes, value, onChange }: {
  estudiantes: Estudiante[];
  value: string;
  onChange: (estudiante: Estudiante | null) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement | null>(null);
  const [consulta, setConsulta] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(-1);
  const seleccionado = estudiantes.find(item => String(item.id) === value);
  const texto = seleccionado?.nombre ?? consulta;
  const palabras = normalizar(texto).split(/\s+/).filter(Boolean);
  const resultados = palabras.length ? estudiantes.filter(item => {
    const nombre = normalizar(item.nombre);
    return palabras.every(palabra => nombre.includes(palabra));
  }) : [];
  const mostrar = abierto && palabras.length > 0;

  function seleccionar(alumno: Estudiante) {
    setConsulta('');
    setAbierto(false);
    setActivo(-1);
    input.current?.setCustomValidity('');
    onChange(alumno);
  }

  return <div className={styles.root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setAbierto(false);
  }}>
    <label htmlFor={id}><span>Estudiante *</span></label>
    <input id={id} ref={element => {
      input.current = element;
      element?.setCustomValidity(seleccionado ? '' : 'Selecciona un estudiante de los resultados.');
    }} role="combobox" aria-autocomplete="list" aria-expanded={mostrar} aria-controls={`${id}-resultados`}
      aria-activedescendant={mostrar && activo >= 0 && resultados[activo] ? `${id}-opcion-${activo}` : undefined}
      aria-describedby={`${id}-ayuda`} autoComplete="off" placeholder="Escribe nombres o apellidos…" value={texto} required
      onFocus={() => setAbierto(true)} onChange={event => {
        setConsulta(event.target.value);
        setActivo(-1);
        setAbierto(true);
        onChange(null);
      }} onKeyDown={event => {
        if (event.key === 'Escape') { setAbierto(false); setActivo(-1); return; }
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && resultados.length) {
          event.preventDefault();
          setAbierto(true);
          const siguiente = event.key === 'ArrowDown' ? Math.min(activo + 1, resultados.length - 1) : Math.max(activo - 1, 0);
          setActivo(siguiente);
          document.getElementById(`${id}-opcion-${siguiente}`)?.scrollIntoView({ block: 'nearest' });
        }
        if (event.key === 'Enter' && mostrar) {
          event.preventDefault();
          if (activo >= 0 && resultados[activo]) seleccionar(resultados[activo]);
          else if (resultados.length === 1) seleccionar(resultados[0]);
        }
      }} />
    <small id={`${id}-ayuda`} className={styles.help} aria-live="polite">{seleccionado
      ? `Seleccionado: ${seleccionado.grado}-${seleccionado.grupo} · ${seleccionado.jornada}`
      : palabras.length ? `${resultados.length} coincidencias. Añade apellidos para afinar y selecciona al estudiante.`
      : 'Busca por nombres o apellidos y selecciona un resultado.'}</small>
    {mostrar && <ul id={`${id}-resultados`} role="listbox" aria-label="Estudiantes encontrados" className={styles.results}>
      {resultados.map((alumno, index) => <li key={alumno.id} id={`${id}-opcion-${index}`} role="option"
        aria-selected={String(alumno.id) === value} className={index === activo ? styles.active : undefined}
        onMouseDown={event => event.preventDefault()} onClick={() => seleccionar(alumno)}>
        <strong>{alumno.nombre}</strong><small>{alumno.grado}-{alumno.grupo} · {alumno.jornada}</small>
      </li>)}
      {!resultados.length && <li className={styles.empty} role="presentation">No hay coincidencias. Revisa el nombre o los apellidos.</li>}
    </ul>}
  </div>;
}
