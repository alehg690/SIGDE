import assert from 'node:assert/strict';
import test from 'node:test';
import { crearCorreoSalida } from './exit-email.ts';

test('crea un correo institucional completo y protege el documento', () => {
  const correo = crearCorreoSalida({
    estudiante: 'Ana <Prueba>',
    grado: '11°',
    grupo: '2',
    jornada: 'Mañana',
    recogeNombre: 'María',
    recogeApellido: 'Pérez',
    recogeParentesco: 'Madre',
    recogeTipoDocumento: 'CC',
    recogeDocumento: '1234567890',
    registradoPor: 'Portería SIGDE',
    registradoEn: '2026-11-01 18:30:00',
  });

  assert.equal(correo.subject, 'Salida registrada - Ana <Prueba>');
  assert.match(correo.html, /SALIDA REGISTRADA/);
  assert.match(correo.html, /Ana &lt;Prueba&gt;/);
  assert.match(correo.html, /María Pérez/);
  assert.match(correo.html, /••••••7890/);
  assert.doesNotMatch(correo.html, /1234567890/);
  assert.match(correo.text, /Institución Educativa Técnica Industrial Rafael Navia Varón/);
});
