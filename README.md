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
- Arquitectura por capas con controladores API delgados y servicios de dominio

## Ejecución local

Requisitos: Node.js 20 o superior y npm.

```bash
npm install
copy .env.example .env
npx prisma migrate deploy --schema database/prisma/schema.prisma
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Para usar SQLite local durante el desarrollo, configura en `.env`:

```env
DATABASE_URL="file:./database/prisma/dev.db"
TURSO_DATABASE_URL="file:./database/prisma/dev.db"
TURSO_AUTH_TOKEN=""
JWT_SECRET="una-clave-segura-de-al-menos-24-caracteres"
```

El envío de correo requiere `EMAIL_USER` y `EMAIL_PASS`. Si no están configurados, SIGDE registra la comunicación o salida sin afirmar que el correo fue entregado y muestra un aviso claro al usuario.

## Datos de demostración

```bash
npm run seed:dashboard
```

El proceso es idempotente y reemplaza únicamente los registros identificados como `DEMO`.

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Coordinación | `demo.coordinacion@sigde.local` | `Demo2026` |
| Docente | `demo.docente@sigde.local` | `Demo2026` |
| Portería | `demo.porteria@sigde.local` | `Demo2026` |

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
2. Define `JWT_SECRET` y los datos institucionales indicados en `.env.example`.
3. Configura `EMAIL_USER` y `EMAIL_PASS` únicamente si se habilitará correo.
4. Aplica las migraciones contra la base de producción. Para el endurecimiento de autenticación ejecuta `npm run migrate:security` con las variables de Turso configuradas.
5. Importa el repositorio en Vercel y ejecuta la compilación con `npm run build`.

No publiques archivos `.env`, tokens, contraseñas de aplicación ni datos reales de estudiantes en el repositorio.
