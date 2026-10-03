# Migraciones libSQL

`database/libsql-migrations` es el único historial futuro de migraciones de SIGDE. El archivo `0001_baseline.sql` representa el esquema final esperado y no reutiliza las migraciones históricas de Prisma ni scripts administrativos.

Ejecuta staging con `node --env-file=.env.staging scripts/db/libsql-migrate.mjs apply`. Usa `status` o `dry-run` para inspección sin cambios. El runner exige `APP_ENV=staging`, conserva SHA-256 por archivo y se detiene si falta una versión o cambia un checksum aplicado.

Las migraciones históricas, imports, seeds demo y limpiezas destructivas quedan fuera de este flujo. Antes de habilitar el runner para producción, debe añadirse un control explícito de entorno, backup y validación en staging.
