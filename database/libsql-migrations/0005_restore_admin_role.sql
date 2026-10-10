-- Restaura la cuenta administradora que fue degradada por la migración 0003.
-- Solo actúa cuando no existe Admin y hay un único Coordinador activo, evitando
-- elevar privilegios de forma ambigua en instituciones con varios coordinadores.
UPDATE "Usuario"
SET "rol" = 'Admin',
    "versionSesion" = "versionSesion" + 1
WHERE "id" = (
  SELECT MIN("id") FROM "Usuario"
  WHERE "rol" = 'Coordinador' AND "activo" = 1 AND "eliminadoEn" IS NULL
)
AND NOT EXISTS (
  SELECT 1 FROM "Usuario" WHERE "rol" = 'Admin' AND "eliminadoEn" IS NULL
)
AND 1 = (
  SELECT COUNT(*) FROM "Usuario"
  WHERE "rol" = 'Coordinador' AND "activo" = 1 AND "eliminadoEn" IS NULL
);
