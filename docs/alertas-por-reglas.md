# Alertas por reglas

El módulo evalúa al estudiante afectado después de crear, corregir, cambiar de estado o anular un reporte. La regla actual detecta reincidencia de reportes no académicos dentro del periodo configurado en `alertas.periodoDias` y usa el umbral `alertas.umbralReportes`.

La alerta basada en reglas se guarda antes de solicitar el enriquecimiento de IA. Si OpenAI no está configurado, falla o supera el tiempo de espera, la alerta, sus evidencias y su historial siguen disponibles.

## Despliegue

1. Aplique `database/prisma/migrations/20261003000000_alertas_por_reglas/migration.sql`, o `database/libsql-migrations/0002_alertas_por_reglas.sql` en el flujo libSQL.
2. Configure `OPENAI_API_KEY` solo en el servidor y, opcionalmente, `OPENAI_ALERTS_MODEL`.
3. Ejecute `npm run test:alerts`, `npm run typecheck`, `npm run lint` y `npm run build`.

La migración conserva alertas reales, convierte los estados anteriores y retira únicamente filas identificadas con `[DEMO DASHBOARD]`. La vista se refresca cada 15 segundos mientras está visible, sin solicitar análisis de IA al abrir el dashboard.

## Privacidad y permisos

OpenAI recibe un identificador interno y metadatos mínimos de los reportes, nunca el nombre completo del estudiante. Coordinación puede cambiar estados, regenerar análisis y exportar. Un docente solo consulta alertas de estudiantes sobre los que haya registrado reportes o de grupos que dirija. Cada transición humana o automática se conserva en el historial y en Auditoría.
