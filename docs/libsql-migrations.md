# Migraciones libSQL

`database/libsql-migrations` conserva el historial de migraciones de SIGDE. El archivo `0001_baseline.sql` representa el esquema final esperado y no reutiliza las migraciones históricas de Prisma ni scripts administrativos.

No hay un runner remoto activo. Las migraciones no deben aplicarse automáticamente durante el despliegue.

Las migraciones históricas, imports, seeds demo y limpiezas destructivas quedan fuera de este historial. Antes de cambiar producción, se debe crear un backup y validar el cambio en una base temporal independiente.
