# Estructura del proyecto

La organización sigue el modelo **frontend + backend + database**.

```txt
sistema-escolar/
  frontend/
    public/                  # Archivos estáticos del cliente
    src/
      app/                   # Rutas, layouts y API routes de Next.js
        (auth)/
          page.tsx           # Login en /
        api/
          auth/
            route.ts         # Endpoint de autenticación
        layout.tsx
        globals.css
      assets/                # Recursos importados por componentes
      components/            # Componentes reutilizables
        auth/
          LoginExperience.tsx
          LoginPanel.tsx
      pages/                 # Vistas futuras no enrutadas por App Router
      hooks/                 # Hooks reutilizables
      context/               # Contextos globales
      services/              # Llamadas al API desde cliente
      types/                 # Tipos del frontend
      utils/                 # Helpers del frontend
    next.config.ts
    postcss.config.mjs
    middleware.ts
    tsconfig.json

  backend/
    src/
      config/                # Configuración de DB, email y servicios externos
      controllers/           # Controladores futuros
      models/                # Modelos futuros
      routes/                # Rutas backend futuras
      middleware/            # Middlewares backend futuros
      services/              # Lógica de negocio
      utils/                 # Helpers de backend, JWT, seguridad

  database/
    prisma/
      schema.prisma
      migrations/
    dev.db

  docs/
  package.json
  tsconfig.json
```

## Reglas

- UI, pantallas y estilos van en `frontend`.
- Lógica del servidor, base de datos, correo y JWT van en `backend`.
- Prisma, migraciones y archivos de base de datos van en `database`.
- `frontend/src/app/api` solo expone endpoints; la lógica real vive en `backend/src/services`.
