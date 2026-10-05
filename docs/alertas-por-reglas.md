# Alertas y análisis inteligente local

El módulo evalúa al estudiante afectado después de crear, corregir, cambiar de estado o anular un reporte. La regla actual detecta reincidencia de reportes no académicos dentro del periodo configurado en `alertas.periodoDias` y usa el umbral `alertas.umbralReportes`.

Después de guardar la alerta, SIGDE ejecuta su propio analizador local. No utiliza OpenAI, servicios externos ni tokens. El analizador clasifica la distribución por tipo, reconoce patrones descriptivos como tardanzas, violencia física, presunto consumo de sustancias o lenguaje ofensivo, detecta concentraciones por lugar y tiempo, y genera hipótesis prudentes, acciones sugeridas, señales positivas e información faltante.

El análisis se actualiza automáticamente cada vez que cambia la evidencia del estudiante. Los resultados son orientativos: nunca diagnostican, sancionan ni reemplazan la revisión humana o las rutas establecidas en el Manual de Convivencia.

## Despliegue

1. Aplique `database/prisma/migrations/20261003000000_alertas_por_reglas/migration.sql`, o `database/libsql-migrations/0002_alertas_por_reglas.sql` en el flujo libSQL.
2. Ejecute `npm run test:alerts`, `npm run typecheck`, `npm run lint` y `npm run build`.

La migración conserva alertas reales, convierte los estados anteriores y retira únicamente filas identificadas con `[DEMO DASHBOARD]`. La vista se refresca cada 15 segundos mientras está visible, sin recalcular análisis al abrir el dashboard.

## Privacidad y permisos

Toda la información se procesa dentro del servidor de SIGDE y no se transmite a proveedores de IA. Coordinación puede cambiar estados, regenerar análisis y exportar. Un docente solo consulta alertas de estudiantes sobre los que haya registrado reportes o de grupos que dirija. Cada transición humana o automática se conserva en el historial y en Auditoría.
