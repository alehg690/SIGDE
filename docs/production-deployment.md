# Despliegue de producción

## Entornos

- Development: `APP_ENV=development`, `NODE_ENV=development`, base independiente y datos ficticios permitidos.
- Staging: `APP_ENV=staging`, `NODE_ENV=production`, base Turso, token, secreto JWT y correo de pruebas independientes.
- Production: `APP_ENV=production`, `NODE_ENV=production`, datos reales, backups, sin seeds, imports ni cambios automáticos de esquema.

No compartir `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET` ni `EMAIL_PASS` entre entornos. Staging debe definir `EMAIL_ENABLED=false` hasta tener un buzón de pruebas controlado. `EMAIL_PASS` debe ser una contraseña de aplicación de Google cuando Gmail la requiera.

El proveedor de hosting debe configurar `APP_ENV`, las credenciales Turso y los secretos fuera de Git. La ausencia de `APP_ENV` es un error fuera de desarrollo.

## Proceso

1. Crear snapshot/export de Turso y verificar las variables del entorno objetivo.
2. Ejecutar `npm ci`, `npm run lint`, `npm run typecheck` y `npm run build`.
3. Desplegar y ejecutar `npm run start`. No ejecutar migraciones, seeds ni imports automáticamente.
4. Comprobar `GET /api/health`, inicio de sesión, consulta de datos, permisos por rol, correo y logs.

La operación programada, los secretos de GitHub y el procedimiento de restauración están documentados en `docs/operations.md`.

Los scripts `migrate:*`, `auth:unlock`, `seed:dashboard`, `seed:dashboard:clean` e `import:11-2` son operaciones administrativas. `import:11-2` no forma parte de un checkout limpio ni del pipeline de despliegue.
