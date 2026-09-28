# Estado de entrega de SIGDE

## Alcance confirmado

Aplicación web con tres roles: Coordinación, Docente y Portería. Los acudientes reciben comunicaciones por correo y no tienen portal ni cuentas propias. Se conserva el diseño existente y la arquitectura por capas. Las alertas utilizan reglas y umbrales.

## Evidencia disponible

- Reportes: creación y consulta probadas en navegador con una base aislada. Listado propio por docente; historial por estudiante con autor; reportes reservados protegidos.
- Servicios de reportes: pruebas aisladas de validación, edición, evidencias, observaciones y restricciones de autoría.
- Usuarios: pruebas aisladas de eliminación, conservación del historial y rollback.
- Autenticación: pruebas aisladas de cambio de contraseña, revocación de sesiones y exclusión de secretos de auditoría.
- Perfil, configuración, calendario y alertas: pruebas aisladas de servicios; no equivalen a cobertura completa de interfaz.
- Correo: recepción real de un código confirmada por el usuario. Nueva plantilla OTP comprobada en navegador; falta confirmar su presentación en Gmail y móvil.
- Fechas de reportes: pruebas de interpretación UTC de SQLite y presentación en Colombia.
- Controladores API: 83 comprobaciones de lectura y escrituras denegadas en 15 rutas, con JWT y SQLite en memoria; revocación de cuenta inactiva y comprobaciones adicionales de autoría, confidencialidad e historial de reportes. Estas pruebas invocan los controladores directamente y no sustituyen pruebas HTTP completas.
- Salidas: creación y validación probadas mediante el controlador; Portería consulta el día colombiano, con pruebas de ambos límites de medianoche. La tabla interpreta las fechas SQLite como UTC y muestra hora de Colombia.
- Formulario de salidas: manejo de errores de carga, bloqueo de envíos simultáneos y separación entre guardado confirmado y actualización del historial. Los errores de registro aparecen dentro del modal; falta probar estos escenarios de red en navegador.
- Validación técnica del 28 de septiembre de 2026: lint, typecheck y build completados correctamente después de corregir las fechas de salidas.

## Pendiente para declarar la entrega terminada

- Validar rutas HTTP y permisos de los tres roles en todos los módulos con datos ficticios.
- Probar en interfaz CRUD de usuarios y estudiantes, convivencia, comunicaciones, salidas, calendario, configuración, estadísticas, exportación y auditoría.
- Comprobar errores de red, formularios, navegación con teclado y pantallas pequeñas en los flujos principales.
- Verificar consistencia de fechas fuera del módulo de reportes.
- Completar instrucciones reproducibles de instalación y primera cuenta para una base vacía.
- Confirmar el formato del nuevo correo en Gmail y móvil.
- Preparar y verificar el despliegue final en Vercel, incluidas las variables del nuevo remitente. Los cambios locales no prueban el estado publicado.
- Ejecutar lint, typecheck, build y pruebas finales sobre la versión que se entregará.

## Comandos de pruebas aisladas

Estos comandos usan bases en memoria o temporales y no modifican Turso:

```bash
node scripts/test-avance.cjs
node scripts/test-users-password.cjs
node scripts/db/test-user-deletion.mjs
node scripts/db/test-observador.mjs
node scripts/test-report-dates.mjs
node scripts/test-api-roles.cjs
```

El objetivo continúa activo. Este documento distingue las verificaciones realizadas del trabajo pendiente; no certifica que la aplicación esté terminada.
