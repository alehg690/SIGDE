# Checklist de implementación SIGDE

## Implementado en el proyecto

- [x] Términos y Condiciones públicos.
- [x] Política de Tratamiento de Datos pública.
- [x] Identificación de la institución en los documentos.
- [x] Tratamiento detallado por rol y categoría de datos.
- [x] Matriz de tratamiento.
- [x] Tabla de retención para aprobación institucional.
- [x] Procedimiento de consultas y reclamos.
- [x] Protocolo de incidentes.
- [x] Registro de encargados tecnológicos.
- [x] Aviso legal visible desde el inicio de sesión.

## Pendiente de configuración, aprobación o integración

- [ ] Completar variables `LEGAL_*` del archivo `.env`.
- [ ] Designar formalmente al responsable de protección de datos.
- [ ] Crear el registro persistente de autorizaciones con versión, fecha, titular, representante legal, IP y evidencia.
- [ ] Integrar la autorización en cada formulario que capture datos, no únicamente en el login.
- [ ] Aprobar los plazos de retención de la tabla institucional.
- [ ] Verificar contratos/DPA, subencargados y ubicación de Vercel, Turso, correo y almacenamiento de evidencias.
- [ ] Definir y probar el procedimiento interno de incidentes.
- [ ] Definir responsables y tiempos legales de respuesta a consultas y reclamos.
- [ ] Revisar jurídicamente la versión final y aprobarla mediante acta institucional.

Las tareas pendientes que requieren decisión o firma de la institución no pueden resolverse inventando datos desde el código.
