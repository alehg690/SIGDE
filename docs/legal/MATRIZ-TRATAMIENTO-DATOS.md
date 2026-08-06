# Matriz de tratamiento de datos personales

Versión: `[COMPLETAR]` · Aprobó: `[COMPLETAR]` · Fecha: `[COMPLETAR]`

| Grupo / datos | Fuente | Finalidad | Acceso mínimo | Riesgo | Control requerido |
|---|---|---|---|---|---|
| Estudiante: identificación, curso y estado | Institución / acudiente autorizado | Identificación, gestión académica y convivencia | Docente asignado, Coordinación, Administrador | Divulgación o perfilamiento | RBAC, trazabilidad y minimización |
| Estudiante: reportes, observaciones y alertas | Docente / Coordinación | Seguimiento pedagógico y debido proceso | Docente autorizado, Coordinación, Administrador | Estigmatización o decisión automatizada | Revisión humana, confidencialidad y corrección |
| Estudiante: salidas y autorizaciones | Acudiente / institución / Portería | Seguridad y control de retiro | Portería y Coordinación | Retiro no autorizado | Acceso por turno, registro y verificación |
| Acudiente: identidad, parentesco y contacto | Acudiente / institución | Verificar representación y notificar | Coordinación, Administrador, módulo autorizado | Contacto con persona incorrecta | Verificación documental y control de cambios |
| Usuario: correo, rol y credenciales | Administrador / usuario | Autenticación y permisos | Sistema, Administrador autorizado | Toma de cuenta | Hash de contraseñas, cookies seguras y recuperación limitada |
| Auditoría: usuario, acción, entidad y fecha | Sistema | Seguridad, trazabilidad y defensa de derechos | Administrador autorizado / auditor | Manipulación o exposición | Integridad, acceso restringido y retención definida |
| Evidencias y archivos | Usuario autorizado | Sustentar un reporte | Participantes autorizados del caso | Datos sensibles o malware | Validación de tipo, tamaño, acceso privado y antivirus |
| Notificaciones | Sistema | Informar al destinatario autorizado | Destinatario y personal necesario | Divulgación por correo | Minimización del mensaje y dirección verificada |
| IP, navegador y eventos técnicos | Sistema / proveedor | Seguridad, diagnóstico y prevención de fraude | Equipo técnico autorizado | Seguimiento excesivo | Plazo limitado, aviso y acceso restringido |

## Reglas obligatorias

1. No recolectar un campo si no tiene una finalidad aprobada.
2. No usar datos de convivencia para publicidad, venta, ranking público o perfilamiento comercial.
3. No convertir una alerta por umbral en una decisión disciplinaria automática.
4. No publicar reportes, evidencias, documentos o listados de estudiantes.
5. Registrar quién accede, modifica, exporta o elimina información.
6. Separar ambientes de desarrollo y producción; no copiar datos reales a desarrollo.
7. Revisar permisos y encargados al menos semestralmente.
