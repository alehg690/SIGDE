# Operación de SIGDE

## Respaldo automático

El workflow `Database backup` se ejecuta diariamente, exporta el esquema y los datos de Turso, restaura el resultado en una base libSQL temporal y valida:

- `PRAGMA integrity_check`;
- ausencia de violaciones de claves foráneas;
- cantidad de filas y SHA-256 del contenido de cada tabla.

Solo después de superar la restauración genera un artefacto cifrado AES-256 con retención de 30 días. Configurar estos secretos en GitHub Actions:

- `TURSO_DATABASE_URL`;
- `TURSO_AUTH_TOKEN`;
- `BACKUP_ENCRYPTION_KEY`, con una frase aleatoria larga guardada fuera del repositorio.

Para ejecutar y verificar un respaldo local:

```bash
npm run db:backup
```

Los archivos locales se escriben bajo `backups/`, que está excluido de Git. Para abrir un artefacto descargado:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
  -in sigde-backup.tar.gz.enc -out sigde-backup.tar.gz \
  -pass env:BACKUP_ENCRYPTION_KEY
```

## Monitoreo y alertas

El workflow `Production monitor` se ejecuta cada 15 minutos y comprueba:

- carga de `https://www.sigde.xyz`;
- conexión real a Turso mediante `/api/health`;
- presencia de CSP y `X-Robots-Tag`;
- bloqueo completo en `/robots.txt`.

GitHub marca y notifica los fallos del workflow. Para alertas inmediatas en Slack o Discord, crear el secreto opcional `ALERT_WEBHOOK_URL` en GitHub y la misma variable en Vercel. Los errores no controlados del servidor, los límites globales del frontend y los fallos de envío de correo se registran como JSON en Vercel y se envían al webhook cuando está configurado. El endpoint del frontend acepta únicamente cargas pequeñas del mismo origen y limita reportes por cliente.

## Respuesta a incidentes

1. Confirmar el fallo en `Production monitor` y `/api/health`.
2. Revisar los logs de Vercel por los campos `level=error` y `event`.
3. Si hay riesgo para datos, detener escrituras antes de intervenir la base.
4. Descargar el último respaldo válido, descifrarlo y revisar `verification.json`.
5. Restaurar primero en una base Turso separada y ejecutar las pruebas de humo.
6. Cambiar producción a la base restaurada solo después de validar acceso, permisos y conteos.
