# Base de datos en producción

SIGDE usa Turso/libSQL mediante `@libsql/client` durante la ejecución. Prisma no participa actualmente en el flujo de producción y no se debe ejecutar `prisma migrate deploy`.

Los scripts `migrate:*` son operaciones administrativas manuales. Antes de cualquier cambio de esquema: crear un snapshot o export de Turso, ejecutar el script en staging con una base y token independientes, comparar el esquema, ejecutar consultas de humo, revisar logs y solo entonces autorizar una ejecución manual en producción. Después, repetir las comprobaciones y registrar fecha, operador y resultado.

No ejecutar en producción `prisma migrate reset`, `prisma db push`, `seed:dashboard`, `seed:dashboard:clean` ni `import:11-2`. Los seeds e imports no forman parte del despliegue.

La siguiente fase debe consolidar las migraciones en una única estrategia versionada para libSQL/Turso, con una tabla de historial, bloqueo de concurrencia, verificación de checksum y procedimiento de reversión probado en staging.
