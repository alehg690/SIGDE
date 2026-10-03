import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularNivelAtencion,
  construirResumenCorto,
  crearHuellaAnalisis,
  requiereNuevoAnalisis,
} from './alertas.rules.ts';

test('clasifica los cuatro niveles sin convertir prioridad alta en una acción automática', () => {
  assert.equal(calcularNivelAtencion(0, 3), 'informational');
  assert.equal(calcularNivelAtencion(2, 3), 'low');
  assert.equal(calcularNivelAtencion(3, 3), 'medium');
  assert.equal(calcularNivelAtencion(5, 3), 'high');
});

test('produce un resumen objetivo sin diagnósticos', () => {
  assert.equal(construirResumenCorto(5, 7), '5 reportes en los últimos 7 días');
});

test('solo solicita otro análisis cuando cambian datos o falta el análisis anterior', () => {
  const evidence = [{ reportId: 1, type: 'TIPO_I' }];
  const same = crearHuellaAnalisis(evidence);
  assert.equal(requiereNuevoAnalisis(same, '{"summary":"ok"}', same), false);
  assert.equal(requiereNuevoAnalisis('', null, same), true);
  assert.equal(requiereNuevoAnalisis(same, '{}', crearHuellaAnalisis([...evidence, { reportId: 2 }])), true);
});

test('la huella es determinista para impedir análisis repetidos', () => {
  const input = { ruleId: 'REPORT_RECURRENCE_30D', evidence: [1, 2, 3] };
  assert.equal(crearHuellaAnalisis(input), crearHuellaAnalisis(input));
});
