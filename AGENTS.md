<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Contexto permanente del proyecto SIGDE

- Alejandro, estudiante colombiano de grado 11 (17 años), desarrolla SIGDE como proyecto escolar para una exposición próxima. La prioridad es un sistema funcional, presentable y honesto frente a la rúbrica.
- SIGDE es una plataforma full-stack para gestionar reportes disciplinarios, salidas de estudiantes, notificaciones a acudientes, alertas de comportamiento y acceso por roles: Administrador, Coordinador, Docente, Portería y Acudiente.
- El repositorio es un monorepo Next.js App Router con `frontend/`, `backend/` y `database/`. El backend está considerablemente más avanzado que el frontend.
- Arquitectura: Layered Architecture con Service Layer; los `route.ts` deben ser controladores delgados que delegan en `backend/src/services/*.service.ts`.
- Stack: Next.js 16, React, TypeScript, Tailwind CSS v4, Tabler Icons, Prisma, `@libsql/client`, `jose`, `bcryptjs`, Nodemailer, SQLite local/Turso en producción y Vercel.
- Restricciones importantes: `jose` en lugar de `jsonwebtoken` para Vercel Edge; `@libsql/client` en lugar de `better-sqlite3`; `middleware.ts` debe estar en `/src/middleware.ts`; las alertas son lógica de umbrales, no machine learning.
- Bloqueadores y prioridades: corregir la referencia de `ConvivenciaReporte` ausente en el schema Prisma; agregar tipos frontend para `Acudiente` y `Porteria`; conectar los botones del dashboard a APIs y comenzar por crear reportes; después completar CRUD, evidencia, observaciones, portal de acudientes, HU-08 y filtro de reportes por docente.
- El sistema es web y no tiene APK; debe aclararse ese criterio con el docente y usar el enlace de Vercel como despliegue.
- Preferencias de trabajo: comunicación directa en español, diagnóstico → plan → confirmación humana → ejecución → validación; entregar código completo listo para pegar; usar PowerShell en Windows; no inventar ni exagerar resultados.
- Preferencia visual: interfaz cálida, accesible y humana para docentes, evitando estética clínica, genérica o de dashboard empresarial. Colores de referencia: `#0a1628` (sidebar) y `#1f6fb8` (azul principal).
