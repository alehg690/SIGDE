# Estructura del proyecto

El proyecto esta organizado con el modelo **frontend + backend + database**, adaptado a Next.js App Router y con scripts auxiliares separados por responsabilidad.

```txt
sistema-escolar/
  frontend/
    public/                  # Archivos estaticos servidos por Next.js
      Logo.png               # Logo principal
      Logo-login.png         # Logo usado en login y favicon
    src/
      app/                   # App Router: rutas, layouts y API routes de Next.js
        (auth)/
          page.tsx           # Login en /
        dashboard/
          page.tsx           # Dashboard protegido
        api/
          _utils/
            session.ts       # Utilidades compartidas para validar sesion
          auth/
            route.ts         # Endpoint de autenticacion
          dashboard/
            route.ts
            estadisticas/
              route.ts
          estudiantes/
            route.ts
            [id]/
              route.ts
          reportes/
            route.ts
            [id]/
              route.ts
          salidas/
            route.ts
            [id]/
              route.ts
          alertas/
            route.ts
            [id]/
              route.ts
        layout.tsx
        globals.css
        loading.tsx
        loading.css
      components/            # Componentes React reutilizables, agrupados por dominio
        auth/
          LoginExperience.tsx
          LoginPanel.tsx
        dashboard/
          DashboardExperience.tsx
        ui/
          RouteLoadingOverlay.tsx
      types/                 # Tipos del frontend
        auth.ts              # Tipos usados por la experiencia de autenticacion
    next.config.ts
    postcss.config.mjs
    proxy.ts
    tsconfig.json

  backend/
    src/
      config/                # Configuracion de DB, email y servicios externos
        database.ts
        email.ts
      middleware/            # Validacion de sesion, roles y permisos
        rol.middleware.ts
      services/              # Logica de negocio consumida por API routes
        acudientes.service.ts
        alertas.service.ts
        auditoria.service.ts
        auth.service.ts
        configuracion.service.ts
        dashboard.service.ts
        estudiantes.service.ts
        informe.service.ts
        manual-convivencia.service.ts
        notificaciones.service.ts
        reportes.service.ts
        salidas.service.ts
        usuarios.service.ts
      types/                 # Tipos compartidos del backend
        roles.ts
      utils/                 # Helpers transversales del backend
        jwt.ts

  database/
    prisma/
      schema.prisma          # Esquema Prisma principal
      migrations/            # Migraciones Prisma versionadas
      dev.db                 # Base SQLite local generada por Prisma; no se versiona
    migrations/
      20260620_backend_core.sql
                            # Pendiente de revision: migracion SQL manual usada por scripts/db/apply-backend-core-migration.mjs

  scripts/
    db/
      apply-backend-core-migration.mjs
                            # Script manual para aplicar la migracion SQL de backend core
    docs/
      build-flujo-figma-html.mjs
      generate-sigde-flujo-png.mjs
                            # Scripts de generacion de artefactos visuales en docs/

  logs/                      # Logs locales de ejecuciones Next/dev; ignorados por git
  docs/                      # Documentacion y artefactos visuales del proyecto
  package.json               # Scripts npm y dependencias
  tsconfig.json              # Configuracion TypeScript raiz
  eslint.config.mjs          # Configuracion ESLint raiz
  prisma.config.ts           # Configuracion Prisma
```

## Reglas

- Todo lo visual vive en `frontend`.
- La logica de servidor, base de datos, correo y JWT vive en `backend`.
- Prisma, migraciones y archivos de base de datos viven en `database`.
- `frontend/src/app/api` solo expone endpoints; la logica real debe ir en `backend/src/services`.
- `frontend/src/app` es la unica carpeta de rutas del frontend. No se usa `frontend/src/pages` porque el proyecto esta en App Router.
- `frontend/public` es el lugar actual para logos, imagenes e iconos servidos como archivos estaticos. No se mantiene `frontend/src/assets` mientras no haya recursos importados desde componentes.
- `frontend/src/components` se organiza por dominio real (`auth`, `dashboard`) y por UI compartida (`ui`). Nuevos dominios como `estudiantes`, `reportes`, `alertas` o `salidas` deben crearse cuando tengan componentes reales.
- Carpetas como `context`, `hooks`, `services` o `utils` en frontend deben agregarse solo cuando exista codigo que justifique esa responsabilidad. Por ahora las llamadas `fetch()` permanecen cerca de los componentes que las usan.
- `backend/src` solo conserva carpetas con codigo real. No se mantienen `controllers`, `models` ni `routes` vacias mientras las API routes consuman directamente `backend/src/services`.
- `scripts/docs` agrupa generacion de documentos visuales; `scripts/db` agrupa tareas manuales de base de datos.
- `logs/` centraliza logs locales y esta ignorada por git.
- No se versionan carpetas generadas como `frontend/.next`, `node_modules`, `logs`, bases SQLite locales (`*.db`) o archivos `.env`.

## Estado de database

- `DATABASE_URL` apunta a `file:./database/prisma/dev.db`, por lo que `database/prisma/dev.db` es la base SQLite local activa para Prisma.
- `database/prisma/dev.db` se genera localmente y no se versiona. Para recrearla desde cero, ejecuta `npx prisma migrate dev` desde la raiz del proyecto.
- `database/dev.db` fue retirado como base local huerfana, porque no coincide con el `DATABASE_URL` actual.
- `database/migrations/20260620_backend_core.sql` queda pendiente de revision porque duplica historicamente parte del flujo de migraciones Prisma y es consumido por `scripts/db/apply-backend-core-migration.mjs`.

## Scripts principales

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
```
