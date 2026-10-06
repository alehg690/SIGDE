-- Turso/libSQL no ejecuta automáticamente el historial de Prisma.
-- Normaliza cuentas creadas antes de que Coordinador sustituyera a Admin
-- y revoca cualquier sesión emitida con el rol anterior.
UPDATE "Usuario"
SET "rol" = 'Coordinador',
    "versionSesion" = "versionSesion" + 1
WHERE lower(trim("rol")) IN ('admin', 'administrador', 'administradora');
