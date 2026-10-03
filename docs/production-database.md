# Base de datos en producción

SIGDE usa Turso/libSQL mediante `@libsql/client` durante la ejecución. Prisma no participa actualmente en el flujo de producción y no se debe ejecutar `prisma migrate deploy`.

Los scripts `migrate:*` son operaciones administrativas manuales. Antes de cualquier cambio de esquema: crear un snapshot o export de Turso, ejecutar el script en staging con una base y token independientes, comparar el esquema, ejecutar consultas de humo, revisar logs y solo entonces autorizar una ejecución manual en producción. Después, repetir las comprobaciones y registrar fecha, operador y resultado.

No ejecutar en producción `prisma migrate reset`, `prisma db push`, `seed:dashboard`, `seed:dashboard:clean` ni `import:11-2`. Los seeds e imports no forman parte del despliegue.

Los respaldos portables se generan con `npm run db:backup`. Cada ejecución restaura el archivo en una base libSQL temporal y compara cantidad de filas y SHA-256 por tabla antes de considerar válido el respaldo. El workflow diario cifra el resultado antes de almacenarlo; consultar `docs/operations.md`.

La siguiente fase debe consolidar las migraciones en una única estrategia versionada para libSQL/Turso, con una tabla de historial, bloqueo de concurrencia y verificación de checksum.
