import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@libsql/client';

test('la migración preserva datos reales y garantiza historial, evidencia, unicidad y alcance docente', async () => {
  const dbPath = join(tmpdir(), `sigde-alerts-${randomUUID()}.db`);
  const client = createClient({ url: `file:${dbPath}` });
  try {
    const baseline = await readFile(new URL('./libsql-migrations/0001_baseline.sql', import.meta.url), 'utf8');
    const migration = await readFile(new URL('./libsql-migrations/0002_alertas_por_reglas.sql', import.meta.url), 'utf8');
    await client.executeMultiple(baseline);
    await client.batch([
      { sql: "INSERT INTO Acudiente (nombre, contacto) VALUES ('Acudiente', '3000000000')" },
      { sql: "INSERT INTO Estudiante (nombre, grado, grupo, acudienteId) VALUES ('Real Uno', '11', '2', 1)" },
      { sql: "INSERT INTO Alerta (estudianteId, cantidadReportes, estado, notas) VALUES (1, 3, 'activa', 'Registro real')" },
      { sql: "INSERT INTO Alerta (estudianteId, cantidadReportes, estado, notas) VALUES (1, 8, 'resuelta', '[DEMO DASHBOARD] caso de muestra')" },
    ], 'write');
    await client.executeMultiple(migration);

    const migrated = await client.execute('SELECT id, estado, notas FROM Alerta ORDER BY id');
    assert.equal(migrated.rows.length, 1, 'solo se retira la fila marcada explícitamente como demo');
    assert.equal(String(migrated.rows[0].estado), 'new');
    assert.equal(String(migrated.rows[0].notas), 'Registro real');
    const history = await client.execute('SELECT COUNT(*) AS total FROM AlertaHistorial WHERE alertaId = 1');
    assert.equal(Number(history.rows[0].total), 1);

    await assert.rejects(
      client.execute("INSERT INTO Alerta (estudianteId, cantidadReportes, estado) VALUES (1, 4, 'new')"),
      /UNIQUE constraint failed/,
      'la regla no puede crear dos alertas activas para el mismo estudiante',
    );
    await client.execute("UPDATE Alerta SET estado = 'resolved' WHERE id = 1");
    const reopened = await client.execute("INSERT INTO Alerta (estudianteId, cantidadReportes, estado) VALUES (1, 4, 'new') RETURNING id");
    const activeAlertId = Number(reopened.rows[0].id);

    await client.batch([
      { sql: "INSERT INTO Usuario (nombre, correo, contrasena, rol) VALUES ('Docente Alcance', 'scope@example.test', 'hash', 'Docente')" },
      { sql: "INSERT INTO Usuario (nombre, correo, contrasena, rol) VALUES ('Docente Ajeno', 'other@example.test', 'hash', 'Docente')" },
      { sql: "INSERT INTO Estudiante (nombre, grado, grupo, acudienteId) VALUES ('Estudiante Dirigido', '10', 'A', 1)" },
      { sql: "INSERT INTO Estudiante (nombre, grado, grupo, acudienteId) VALUES ('Estudiante Ajeno', '9', 'B', 1)" },
      { sql: "INSERT INTO GrupoEscolar (grado, grupo, jornada, directorId) VALUES ('10', 'A', 'Mañana', 1)" },
      { sql: "INSERT INTO Reporte (estudianteId, docenteId, tipoFalta, descripcion) VALUES (1, 1, 'TIPO_I', 'Reporte relacionado para evidencia')" },
      { sql: `INSERT INTO AlertaEvidencia (alertaId, reporteId, tipoEvidencia) VALUES (${activeAlertId}, 1, 'reporte')` },
      { sql: "INSERT INTO Alerta (estudianteId, cantidadReportes, estado) VALUES (2, 3, 'new')" },
      { sql: "INSERT INTO Alerta (estudianteId, cantidadReportes, estado) VALUES (3, 3, 'new')" },
    ], 'write');

    const evidence = await client.execute({ sql: 'SELECT reporteId FROM AlertaEvidencia WHERE alertaId = ?', args: [activeAlertId] });
    assert.equal(Number(evidence.rows[0].reporteId), 1);

    const scoped = await client.execute({
      sql: `SELECT e.nombre FROM Alerta a INNER JOIN Estudiante e ON e.id = a.estudianteId
        WHERE a.estado IN ('new', 'reviewed', 'monitoring') AND (
          EXISTS (SELECT 1 FROM Reporte r WHERE r.estudianteId = e.id AND r.docenteId = ?)
          OR EXISTS (SELECT 1 FROM GrupoEscolar g WHERE g.directorId = ? AND g.grado = REPLACE(e.grado, '°', '') AND g.grupo = e.grupo)
        ) ORDER BY e.nombre`,
      args: [1, 1],
    });
    assert.deepEqual(scoped.rows.map((row) => String(row.nombre)), ['Estudiante Dirigido', 'Real Uno']);

    const ruleOnly = await client.execute({ sql: 'SELECT analisisIaJson, origen FROM Alerta WHERE id = ?', args: [activeAlertId] });
    assert.equal(ruleOnly.rows[0].analisisIaJson, null, 'la alerta sigue siendo válida sin respuesta de IA');
    assert.equal(String(ruleOnly.rows[0].origen), 'rule');
  } finally {
    client.close();
    await unlink(dbPath).catch(() => undefined);
  }
});
