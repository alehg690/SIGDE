export type Fortaleza = {
  nivel: number;
  texto: string;
  color: string;
};

export function calcularFortaleza(pass: string): Fortaleza {
  let puntos = 0;
  if (pass.length >= 8) puntos++;
  if (pass.length >= 12) puntos++;
  if (/[A-ZÁÉÍÓÚÑ]/.test(pass)) puntos++;
  if (/[0-9]/.test(pass)) puntos++;
  if (/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(pass)) puntos++;

  if (puntos <= 1) return { nivel: 1, texto: 'Muy débil', color: '#e53e3e' };
  if (puntos === 2) return { nivel: 2, texto: 'Débil', color: '#dd6b20' };
  if (puntos === 3) return { nivel: 3, texto: 'Aceptable', color: '#d69e2e' };
  if (puntos === 4) return { nivel: 4, texto: 'Fuerte', color: '#38a169' };
  return { nivel: 5, texto: 'Muy fuerte', color: '#2f855a' };
}
