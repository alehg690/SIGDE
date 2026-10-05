import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularNivelAtencion,
  construirResumenCorto,
  crearHuellaAnalisis,
  generarAnalisisLocal,
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

test('el analizador local reconoce patrones sin servicios externos ni diagnósticos', () => {
  const evidence = [
    { reportId: 1, type: 'TIPO_I', occurredAt: '2026-10-01T12:00:00.000Z', description: 'Llegó tarde sin justificación', place: 'Entrada', initialAction: 'Se registró el ingreso' },
    { reportId: 2, type: 'TIPO_II', occurredAt: '2026-10-02T12:00:00.000Z', description: 'Empujó y golpeó a otro estudiante', place: 'Patio', initialAction: 'Se protegió a los involucrados' },
    { reportId: 3, type: 'TIPO_III', occurredAt: '2026-10-03T12:00:00.000Z', description: 'Presunto consumo de sustancia psicoactiva', place: 'Baño', initialAction: 'Se activó la ruta institucional' },
    { reportId: 4, type: 'TIPO_I', occurredAt: '2026-10-04T12:00:00.000Z', description: 'Usó groserías contra la clase', place: 'Salón', initialAction: 'Se realizó diálogo pedagógico' },
  ];
  const analysis = generarAnalisisLocal({ total: evidence.length, periodoDias: 30, evidence });
  assert.deepEqual(analysis.patterns.byType, { TIPO_I: 2, TIPO_II: 1, TIPO_III: 1 });
  assert.equal(analysis.patterns.byCategory.tardanzas, 1);
  assert.equal(analysis.patterns.byCategory.violenciaFisica, 1);
  assert.equal(analysis.patterns.byCategory.sustancias, 1);
  assert.equal(analysis.patterns.byCategory.lenguajeOfensivo, 1);
  assert.match(analysis.summary, /4 reportes/);
  assert.ok(analysis.suggestedActions.some((item) => item.includes('tipo III')));
  assert.ok(analysis.hypotheses.every((item) => item.startsWith('Hipótesis de revisión:')));
  assert.ok(analysis.hypotheses.every((item) => !/culpable|es adicto|padece/i.test(item)));
  assert.ok(analysis.confidence >= 0 && analysis.confidence <= 1);
});

test('el analizador local informa faltantes y conserva revisión humana', () => {
  const analysis = generarAnalisisLocal({
    total: 3,
    periodoDias: 30,
    evidence: [
      { reportId: 1, type: 'TIPO_I', occurredAt: '2026-10-01T12:00:00.000Z' },
      { reportId: 2, type: 'TIPO_I', occurredAt: '2026-10-02T12:00:00.000Z' },
      { reportId: 3, type: 'TIPO_I', occurredAt: '2026-10-03T12:00:00.000Z' },
    ],
  });
  assert.ok(analysis.missingInformation.some((item) => item.includes('3 reportes no registran el lugar')));
  assert.ok(analysis.suggestedActions.some((item) => item.includes('revisión humana')));
  assert.ok(analysis.confidence < 0.9);
});
