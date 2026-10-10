# Despliegue de producción

## Entornos

- Development: `APP_ENV=development`, `NODE_ENV=development`, base independiente y datos ficticios permitidos.
- Production: `APP_ENV=production`, `NODE_ENV=production`, datos reales, backups, sin seeds, imports ni cambios automáticos de esquema.

No compartir `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET` ni `EMAIL_PASS` entre entornos. `EMAIL_PASS` debe ser una contraseña de aplicación de Google cuando Gmail la requiera.

El proveedor de hosting debe configurar `APP_ENV`, las credenciales Turso y los secretos fuera de Git. La ausencia de `APP_ENV` es un error fuera de desarrollo.

## Proceso

1. Crear snapshot/export de Turso y verificar las variables del entorno objetivo.
2. Ejecutar `npm ci`, `npm run lint`, `npm run typecheck` y `npm run build`.
3. Desplegar y ejecutar `npm run start`. No ejecutar migraciones, seeds ni imports automáticamente.
4. Comprobar `GET /api/health`, inicio de sesión, consulta de datos, permisos por rol, correo y logs.

La operación programada, los secretos de GitHub y el procedimiento de restauración están documentados en `docs/operations.md`.

## Conexión de Gmail institucional

1. En un proyecto de Google Cloud de la institución, habilitar **Gmail API**.
2. Configurar la pantalla de consentimiento OAuth para usuarios internos del dominio institucional.
3. Crear un cliente OAuth de tipo **Aplicación web** y registrar exactamente esta URI de redirección:
   `https://www.sigde.xyz/api/integraciones/gmail/callback`.
4. Aplicar `database/libsql-migrations/0006_gmail_integration.sql` a Turso después de crear un backup.
5. Añadir en Vercel `GMAIL_INTEGRATION_ENABLED=true`, `GMAIL_INSTITUTIONAL_ACCOUNT`, `GMAIL_OAUTH_CLIENT_ID`, `GMAIL_OAUTH_CLIENT_SECRET`, `GMAIL_IMPORT_QUERY=label:SIGDE` y un `CRON_SECRET` aleatorio de al menos 32 caracteres.
6. Crear en Gmail la etiqueta **SIGDE** y una regla que la aplique solo a los remitentes o comunicaciones que deban importarse.
7. Desplegar, entrar a **Configuración → Correo institucional** como coordinación y seleccionar **Conectar con Google**.

El permiso solicitado es `gmail.readonly`. El token de acceso permanente se cifra antes de guardarse, los mensajes se deduplican por su identificador de Gmail y las comunicaciones se crean como borradores para revisión humana. Las fechas explícitas encontradas en el texto se agregan al calendario. La tarea de Vercel sincroniza la etiqueta una vez al día; coordinación también puede ejecutar una sincronización manual desde Configuración.

Los scripts `migrate:*`, `auth:unlock`, `seed:dashboard`, `seed:dashboard:clean` e `import:11-2` son operaciones administrativas. `import:11-2` no forma parte de un checkout limpio ni del pipeline de despliegue.
