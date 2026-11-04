# Despliegue completo en Hostinger

## Requisitos

- Plan Business Web Hosting o Cloud con aplicaciones Node.js.
- Repositorio de GitHub conectado a Hostinger.
- Base Turso de producción creada, migrada y respaldada.
- Node.js 22.x.

## Configuración del build

Configurar la aplicación como Next.js con estos valores:

- Rama: `main`.
- Directorio raíz: `./`.
- Comando de build: `npm run build`.
- Directorio de salida: `frontend/.next/standalone`.
- El proyecto genera y normaliza la salida autónoma en `frontend/.next/standalone` mediante `output: "standalone"` y el script `postbuild`.

No subir `node_modules`, `.next`, el archivo `.env` ni una copia manual de `standalone`. Hostinger debe instalar las dependencias y generar el build desde el repositorio.

## Variables de entorno

Agregar sin comillas en el panel de Hostinger:

```env
APP_ENV=production
NODE_ENV=production
HOSTING_PROVIDER=hostinger
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
JWT_SECRET=...
EMAIL_ENABLED=false
LEGAL_CONTACT_EMAIL=...
LEGAL_DATA_EMAIL=...
LEGAL_SECURITY_EMAIL=...
LEGAL_CONTACT_PHONE=...
LEGAL_EFFECTIVE_DATE=YYYY-MM-DD
```

Si se habilita el correo, cambiar `EMAIL_ENABLED=true` y agregar:

```env
EMAIL_USER=...
EMAIL_PASS=...
```

`ALERT_WEBHOOK_URL` es opcional. `DATABASE_URL`, `BACKUP_ENCRYPTION_KEY`, `PRODUCTION_URL` y las variables `IMPORT_*` no pertenecen al runtime de Hostinger.

## Puesta en producción

1. Crear y verificar un respaldo de Turso.
2. Confirmar que las migraciones libSQL requeridas ya están aplicadas. No ejecutar migraciones ni seeds automáticamente durante el despliegue.
3. Importar el repositorio desde GitHub y revisar que Hostinger detecte Next.js y Node.js 22.
4. Agregar las variables de entorno y ejecutar el despliegue.
5. Mantener Hostinger CDN habilitado para que `X-Real-IP` y `X-Forwarded-For` provengan del proxy confiable.
6. Activar SSL y comprobar tanto el dominio raíz como `www`.

## Verificación posterior

- `GET /api/health` responde `200` con base de datos `ok`.
- La portada y los archivos estáticos cargan sin errores.
- El inicio y cierre de sesión funcionan sobre HTTPS.
- Las cookies de sesión tienen `Secure`, `HttpOnly` y el prefijo `__Host-`.
- Los permisos de Coordinación, Docente y Portería se comportan correctamente.
- El envío de correo funciona si está habilitado.
- Los Runtime logs no contienen eventos de nivel `error`.
- Las cabeceras CSP, HSTS y `Cross-Origin-Resource-Policy` están presentes.

Si el despliegue falla, conservar la última versión exitosa, revisar los logs del build y no modificar manualmente los archivos generados por Hostinger.
