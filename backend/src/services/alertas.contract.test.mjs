import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  }));
  return nested.flat().filter((path) => /\.(ts|tsx|js|jsx)$/.test(path));
}

test('el agente analiza localmente y no transmite reportes a proveedores externos', async () => {
  const frontendRoot = new URL('../../../frontend/src/', import.meta.url).pathname;
  const files = await sourceFiles(frontendRoot);
  const sources = await Promise.all(files.map((file) => readFile(file, 'utf8')));
  assert.equal(sources.some((source) => source.includes('OPENAI_API_KEY')), false);
  assert.equal(sources.some((source) => source.includes('api.openai.com')), false);
  const service = await read('backend/src/services/alertas.service.ts');
  assert.doesNotMatch(service, /OPENAI_API_KEY|api\.openai\.com|fetch\('https:\/\//);
  assert.match(service, /generarAnalisisLocal/);
  assert.match(service, /origen = 'rule\+local'/);
});

test('el ciclo de reportes reevalúa solo al estudiante afectado al crear, corregir, cambiar o anular', async () => {
  const reports = await read('backend/src/services/reportes.service.ts');
  assert.ok((reports.match(/evaluarAlertaEstudiante\(/g) || []).length >= 3);
  const route = await read('frontend/src/app/api/reportes/[id]/route.ts');
  assert.match(route, /export async function DELETE/);
  assert.match(route, /cambiarEstadoReporte\(reporteId, 'Anulado'/);
});

test('las alertas históricas reciben análisis local al abrir seguimiento', async () => {
  const service = await read('backend/src/services/alertas.service.ts');
  assert.match(service, /await sincronizarAnalisisPendientes\(usuario\)/);
  assert.match(service, /a\.analisisIaJson IS NULL OR a\.versionPrompt IS NULL/);
  assert.match(service, /obtenerEvidenciasDeAlerta/);
  assert.match(service, /LIMIT 50/);
  assert.match(service, /action === 'regenerate'[\s\S]*analizarAlertaExistente/);
});

test('el panel existente conserva En vivo, Ver todo, detalle y acciones humanas', async () => {
  const dashboard = await read('frontend/src/components/dashboard/DashboardExperience.tsx');
  const followUp = await read('frontend/src/components/follow-up/FollowUpWorkspace.tsx');
  assert.match(dashboard, /Alertas por reglas/);
  assert.match(dashboard, /En vivo/);
  assert.match(dashboard, /Ver todo/);
  assert.match(dashboard, /15_000/);
  for (const label of ['Marcar como revisada', 'Confirmar', 'Corregir', 'Descartar', 'Cerrar alerta']) assert.match(followUp, new RegExp(label));
  assert.match(followUp, /agente local de SIGDE, sin servicios externos ni costos por uso/);
});

test('la migración elimina solo demos identificados y aplica unicidad activa', async () => {
  const migration = await read('database/libsql-migrations/0002_alertas_por_reglas.sql');
  assert.match(migration, /\[DEMO DASHBOARD\]/);
  assert.match(migration, /CREATE UNIQUE INDEX "Alerta_activa_estudiante_regla_key"/);
  assert.match(migration, /WHERE "estado" IN \('new', 'reviewed', 'monitoring'\)/);
});
