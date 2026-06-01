# Estructura del proyecto

El proyecto esta organizado con el modelo **frontend + backend + database**, siguiendo la idea de la referencia visual, pero adaptado a Next.js.

```txt
sistema-escolar/
  frontend/
    public/                  # Archivos estaticos: logos, imagenes e iconos
    src/
      app/                   # Rutas, layouts y API routes de Next.js
        (auth)/
          page.tsx           # Login en /
        api/
          auth/
            route.ts         # Endpoint de autenticacion
        layout.tsx
        globals.css
      assets/                # Recursos importados desde componentes
      components/            # Componentes reutilizables de UI
        auth/
          LoginExperience.tsx
          LoginPanel.tsx
      context/               # Contextos globales futuros
      hooks/                 # Hooks reutilizables futuros
      pages/                 # Vistas futuras no enrutadas por App Router
      services/              # Llamadas al API desde el cliente
      types/                 # Tipos del frontend
      utils/                 # Helpers del frontend
    next.config.ts
    postcss.config.mjs
    proxy.ts
    tsconfig.json

  backend/
    src/
      config/                # Configuracion de DB, email y servicios externos
      controllers/           # Controladores futuros
      middleware/            # Middlewares backend futuros
      models/                # Modelos futuros
      routes/                # Rutas backend futuras
      services/              # Logica de negocio
      utils/                 # Helpers de backend, JWT y seguridad

  database/
    prisma/
      schema.prisma
      migrations/
    dev.db

  docs/
  package.json
  tsconfig.json
  prisma.config.ts
```

## Reglas

- Todo lo visual vive en `frontend`.
- La logica de servidor, base de datos, correo y JWT vive en `backend`.
- Prisma, migraciones y archivos de base de datos viven en `database`.
- `frontend/src/app/api` solo expone endpoints; la logica real debe ir en `backend/src/services`.
- No se versionan carpetas generadas como `frontend/.next`, `node_modules` o archivos `.env`.

## Scripts principales

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
```
