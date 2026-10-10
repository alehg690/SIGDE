# SIGDE — Sistema de Gestión Digital Escolar

SIGDE es una plataforma web full-stack para apoyar la gestión de convivencia escolar. Centraliza estudiantes y acudientes, reportes disciplinarios, Ruta de Atención Integral (RAICE), alertas configurables, comunicaciones, salidas, calendario, estadísticas y auditoría.

El proyecto fue desarrollado como proyecto escolar y no pretende reemplazar el Manual de Convivencia, el debido proceso ni las decisiones de los órganos institucionales. Las alertas funcionan mediante reglas y umbrales configurables; no utilizan inteligencia artificial ni realizan valoraciones automáticas sobre los estudiantes.

## Roles

- **Coordinación:** administra usuarios, estudiantes, reportes, convivencia, alertas, comunicaciones, salidas, calendario, configuración, informes y auditoría.
- **Docente:** consulta estudiantes, crea y edita sus reportes dentro del periodo permitido, consulta alertas, registra procesos de convivencia y comunicaciones.
- **Portería:** consulta y registra salidas del turno, revisa la agenda institucional y accede a su perfil.

Los acudientes no reciben cuentas de acceso. El sistema conserva sus datos de contacto para las notificaciones institucionales autorizadas.

## Tecnologías

- Next.js 16 con App Router, React y TypeScript
- Tailwind CSS 4 y estilos CSS accesibles
- Prisma, SQLite local y Turso/libSQL en producción
- Autenticación con cookies HTTP-only, `jose` y `bcryptjs`
- Nodemailer para correo institucional opcional
- Integración OAuth de Gmail para importar comunicaciones y fechas institucionales
- Arquitectura por capas con controladores API delgados y servicios de dominio

## Ejecución local

Requisitos: Node.js 22 y npm. El proyecto fija esta versión en el campo `engines` de `package.json`.

```bash
npm install
npx prisma migrate deploy --schema database/prisma/schema.prisma
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Antes de aplicar las migraciones, crea un archivo `.env` en la raíz del proyecto. Para usar SQLite local durante el desarrollo, configúralo así:

```env
DATABASE_URL="file:./database/prisma/dev.db"
TURSO_DATABASE_URL="file:./database/prisma/dev.db"
TURSO_AUTH_TOKEN=""
APP_ENV="development"
EMAIL_ENABLED="false"
JWT_SECRET="una-clave-aleatoria-de-al-menos-32-caracteres"
```

El envío de correo requiere `EMAIL_USER` y `EMAIL_PASS`. Si no están configurados, SIGDE registra la comunicación o salida sin afirmar que el correo fue entregado y muestra un aviso claro al usuario.

## Datos de demostración

```bash
npm run seed:dashboard
```

El proceso reemplaza únicamente los reportes identificados con la marca de demostración. Requiere un docente activo y al menos cinco estudiantes activos ya registrados. **No crea cuentas ni estudiantes**, y no hay credenciales de demostración predeterminadas.

Ejecuta este comando únicamente contra una base de pruebas: los reportes son ficticios y se vinculan a los estudiantes existentes en esa base.

Para retirar exclusivamente los datos de demostración:

```bash
npm run seed:dashboard:clean
```

## Validación antes de entregar

```bash
npm run lint
npm run typecheck
npm run build
```

## Despliegue

SIGDE es una aplicación web, no una APK. La entrega desplegada debe realizarse mediante un enlace web, por ejemplo en Vercel.

1. Crea una base de datos Turso y configura `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`.
2. Define `APP_ENV=production`, `JWT_SECRET` (mínimo 32 caracteres) y `EMAIL_ENABLED` en las variables de entorno del despliegue.
3. Configura `EMAIL_USER` y `EMAIL_PASS` únicamente si `EMAIL_ENABLED=true`.
4. Aplica, después de crear un backup, las migraciones de `database/libsql-migrations` que aún no estén registradas en la base de producción. No ejecutes automáticamente migraciones destructivas durante el despliegue.
5. Importa el repositorio en Vercel y ejecuta la compilación con `npm run build`.

La configuración de Gmail institucional y su URI de redirección se documentan en `docs/production-deployment.md`.

No publiques archivos `.env`, tokens, contraseñas de aplicación ni datos reales de estudiantes en el repositorio.
