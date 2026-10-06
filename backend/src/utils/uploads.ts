const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function iniciaCon(contenido: Uint8Array, firma: number[]) {
  return firma.every((valor, indice) => contenido[indice] === valor);
}

export function firmaArchivoValida(contenido: Uint8Array, mimeType: string) {
  if (mimeType === 'application/pdf') return iniciaCon(contenido, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (mimeType === 'image/jpeg') return iniciaCon(contenido, [0xff, 0xd8, 0xff]);
  if (mimeType === 'image/png') return iniciaCon(contenido, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mimeType === 'image/webp') {
    return iniciaCon(contenido, [0x52, 0x49, 0x46, 0x46])
      && String.fromCharCode(...contenido.slice(8, 12)) === 'WEBP';
  }
  if (mimeType === DOCX_MIME) return iniciaCon(contenido, [0x50, 0x4b, 0x03, 0x04]);
  return false;
}

export function nombreArchivoSeguro(nombre: string, maximo: number) {
  const base = nombre.split(/[\\/]/).pop()?.trim() || '';
  if (!base || base.length > maximo || /[\u0000-\u001f\u007f]/.test(base)) return null;
  return base;
}

export function contenidoBinario(value: unknown) {
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return null;
}
