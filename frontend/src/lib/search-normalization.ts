export function normalizarBusqueda(valor: unknown) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim()
    .replace(/\s+/g, ' ');
}

function claveFonetica(palabra: string) {
  return palabra.replaceAll('h', '');
}

export function coincideBusqueda(consulta: string, valores: unknown[]) {
  const palabras = normalizarBusqueda(consulta).split(/[^a-z0-9]+/).filter(Boolean).map(claveFonetica);
  if (palabras.length === 0) return true;
  const contenido = normalizarBusqueda(valores.join(' ')).split(/[^a-z0-9]+/).filter(Boolean).map(claveFonetica);
  return palabras.every((palabra) => contenido.some((termino) => termino.startsWith(palabra)));
}
