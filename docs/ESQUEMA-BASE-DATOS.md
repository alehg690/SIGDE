# Esquema de base de datos de SIGDE

**Fuente:** `database/prisma/schema.prisma`, migraciones y tablas verificadas en Turso/SQLite.
**Corte de datos para exposición:** 28 de septiembre de 2026.

SIGDE organiza sus datos en cinco áreas: personas y grupos, reportes y convivencia, comunicaciones, salidas y calendario, y seguridad. Las relaciones dibujadas con líneas corresponden a claves foráneas reales. Al final se indican asociaciones por texto que no son claves foráneas.

## 1. Personas, grupos y seguimiento

```mermaid
erDiagram
    Usuario {
      int id PK
      string nombre
      string correo UK
      string rol
      boolean activo
    }
    Acudiente {
      int id PK
      string nombre
      string correo
      string telefono
    }
    Estudiante {
      int id PK
      string nombre
      string correo UK
      string grado
      string grupo
      string jornada
      int acudienteId FK
    }
    EstudianteAcudiente {
      int estudianteId PK,FK
      int acudienteId PK,FK
      boolean esPrincipal
    }
    GrupoEscolar {
      int id PK
      string grado
      string grupo
      string jornada
      int directorId FK
    }
    Reporte {
      int id PK
      int estudianteId FK
      int docenteId FK
      string tipoFalta
      string estado
      boolean confidencial
      string descripcion
      string observador
    }
    EvidenciaReporte {
      int id PK
      int reporteId FK
      string nombre
      string mimeType
      bytes contenido
    }
    ObservacionReporte {
      int id PK
      int reporteId FK
      int usuarioId FK
      string texto
    }
    Alerta {
      int id PK
      int estudianteId FK
      int cantidadReportes
      string estado
    }

    Acudiente ||--o{ Estudiante : acudiente_principal
    Estudiante ||--o{ EstudianteAcudiente : tiene
    Acudiente ||--o{ EstudianteAcudiente : vinculado_a
    Usuario |o--o{ GrupoEscolar : dirige
    Estudiante ||--o{ Reporte : recibe
    Usuario ||--o{ Reporte : registra
    Reporte ||--o{ EvidenciaReporte : adjunta
    Reporte ||--o{ ObservacionReporte : contiene
    Usuario ||--o{ ObservacionReporte : escribe
    Estudiante ||--o{ Alerta : genera
```

**Nota:** `Estudiante.grado` y `Estudiante.grupo` se corresponden con `GrupoEscolar.grado` y `GrupoEscolar.grupo`, pero **no existe una clave foránea** entre esas tablas. `EstudianteAcudiente` permite varios acudientes vinculados, además del `acudienteId` principal del estudiante.

## 2. Comunicaciones, salidas y calendario

```mermaid
erDiagram
    Usuario {
      int id PK
      string nombre
      string rol
    }
    Comunicacion {
      int id PK
      int autorId FK
      string titulo
      string tipo
      string destinatarios
      string contenido
      string estado
      int visualizaciones
      datetime publicadoEn
    }
    ComunicacionArchivo {
      int id PK
      int comunicacionId FK
      string nombre
      string mimeType
      int tamano
      bytes contenido
    }
    Acudiente {
      int id PK
      string nombre
    }
    Estudiante {
      int id PK
      string nombre
    }
    Reporte {
      int id PK
      string estado
    }
    Notificacion {
      int id PK
      int acudienteId FK
      int reporteId FK
      string canal
      boolean leida
    }
    NotificacionUsuario {
      int id PK
      int usuarioId FK
      int reporteId FK
      string canal
      boolean leida
    }
    Salida {
      string id PK
      int estudianteId FK
      int acudienteId FK
      int registradoPorId FK
      string estado
      string tipo
    }
    Evento {
      int id PK
      string titulo
      datetime iniciaEn
      string tipo
      string color
      boolean todoElDia
    }

    Usuario ||--o{ Comunicacion : publica
    Comunicacion ||--o{ ComunicacionArchivo : adjunta
    Acudiente ||--o{ Notificacion : recibe
    Reporte |o--o{ Notificacion : origina
    Usuario ||--o{ NotificacionUsuario : recibe
    Reporte |o--o{ NotificacionUsuario : origina
    Estudiante ||--o{ Salida : solicita
    Acudiente ||--o{ Salida : acompana
    Usuario ||--o{ Salida : registra
```

`Evento` es una tabla independiente. El campo `destinatarios` de `Comunicacion` guarda una categoría o grupo como texto; **no es una relación con usuarios o estudiantes ni envía notificaciones por sí solo**.

## 3. Seguridad y registros complementarios

| Tabla | Clave principal | Función |
|---|---|---|
| `AuditLog` | `id` | Registro de acciones; `usuarioId` es una clave foránea opcional a `Usuario`. |
| `AuthRateLimit` | `clave` | Control de intentos de autenticación. |
| `ConfiguracionSistema` | `clave` | Parámetros del sistema. |
| `ConvivenciaReporte` | `id` | Registro específico de convivencia. Guarda `estudianteId` como texto, sin clave foránea. |

## 4. Tablas históricas presentes en la base física

La base Turso también conserva tablas que **no aparecen en el esquema Prisma actual ni tienen referencias en el código vigente**. Se documentan para no confundirlas con las funciones actuales:

```mermaid
erDiagram
    Reporte ||--o{ ProcesoConvivencia : inicia
    Estudiante ||--o{ ProcesoConvivencia : relacionado
    Usuario ||--o{ ProcesoConvivencia : crea
    ProcesoConvivencia ||--o{ AccionConvivencia : acciones
    Usuario ||--o{ AccionConvivencia : responsable
    ProcesoConvivencia ||--o{ PasoRaice : pasos
    ProcesoConvivencia ||--o{ ProtocoloConvivencia : protocolos
    Usuario ||--o{ ProtocoloConvivencia : registra
    ProcesoConvivencia ||--o{ SiuceRegistro : registros
    Usuario ||--o{ SiuceRegistro : responsable
```

Otras tablas sin claves foráneas declaradas: `AlertaIa`, `NotificacionAcudiente`, `SalidaEstudiante` y `Estudiante_legacy_20260604001138`. La tabla `_prisma_migrations` registra migraciones técnicas.

## 5. Cifras para la exposición

| Dato | Cantidad |
|---|---:|
| Estudiantes registrados | 564 |
| Grupos escolares | 28 |
| Grupos con director asignado | 8 |
| Grupos pendientes de director | 20 |
| Comunicaciones publicadas | 5 |
| Eventos registrados | 2 |

**Lectura rápida:** un estudiante pertenece a un grado y grupo, tiene acudientes vinculados y puede tener reportes, alertas y salidas. Un usuario registra reportes, dirige grupos o publica comunicaciones según su rol. Los reportes pueden incluir observaciones y evidencias; las comunicaciones pueden incluir archivos adjuntos.
