-- CreateTable
CREATE TABLE "Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "contrasena" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eliminadoEn" DATETIME,
    "ultimoAcceso" DATETIME,
    "tokenRecuperacion" TEXT,
    "tokenExpira" DATETIME,
    "versionSesion" INTEGER NOT NULL DEFAULT 1,
    "requiereCambioContrasena" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Comunicacion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "destinatarios" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Borrador',
    "autorId" INTEGER NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publicadoEn" DATETIME,
    "visualizaciones" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Comunicacion_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ComunicacionArchivo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "comunicacionId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "contenido" BLOB NOT NULL,
    CONSTRAINT "ComunicacionArchivo_comunicacionId_fkey" FOREIGN KEY ("comunicacionId") REFERENCES "Comunicacion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Acudiente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "primerNombre" TEXT,
    "segundoNombre" TEXT,
    "primerApellido" TEXT,
    "segundoApellido" TEXT,
    "tipoDocumento" TEXT,
    "contacto" TEXT NOT NULL,
    "correo" TEXT,
    "telefono" TEXT,
    "documento" TEXT,
    "parentesco" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Estudiante" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "primerNombre" TEXT,
    "segundoNombre" TEXT,
    "primerApellido" TEXT,
    "segundoApellido" TEXT,
    "tipoDocumento" TEXT,
    "documento" TEXT,
    "correo" TEXT,
    "grado" TEXT NOT NULL,
    "grupo" TEXT NOT NULL,
    "jornada" TEXT NOT NULL DEFAULT 'Sin registrar',
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "archivado" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acudienteId" INTEGER NOT NULL,
    CONSTRAINT "Estudiante_acudienteId_fkey" FOREIGN KEY ("acudienteId") REFERENCES "Acudiente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reporte" (
    "observador" TEXT,
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "estudianteId" INTEGER NOT NULL,
    "docenteId" INTEGER NOT NULL,
    "tipoFalta" TEXT NOT NULL,
    "fechaHecho" DATETIME,
    "lugar" TEXT,
    "situacion" TEXT,
    "descripcion" TEXT NOT NULL,
    "actuacionInicial" TEXT,
    "evidenciaUrl" TEXT,
    "observaciones" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "confidencial" BOOLEAN NOT NULL DEFAULT false,
    "editableHasta" DATETIME,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reporte_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Estudiante" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reporte_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alerta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "estudianteId" INTEGER NOT NULL,
    "cantidadReportes" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "notas" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alerta_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Estudiante" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Salida" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "estudianteId" INTEGER NOT NULL,
    "acudienteId" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'ordinaria',
    "urgencia" BOOLEAN NOT NULL DEFAULT false,
    "recogeNombre" TEXT,
    "recogeApellido" TEXT,
    "recogeCedula" TEXT,
    "recogeParentesco" TEXT,
    "recogeCorreo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "firmaDirector" BOOLEAN NOT NULL DEFAULT false,
    "firmaDocente" BOOLEAN NOT NULL DEFAULT false,
    "firmaCoordinacion" BOOLEAN NOT NULL DEFAULT false,
    "firmaAcudiente" BOOLEAN NOT NULL DEFAULT false,
    "registradoPorId" INTEGER NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Salida_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Estudiante" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Salida_acudienteId_fkey" FOREIGN KEY ("acudienteId") REFERENCES "Acudiente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Salida_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "acudienteId" INTEGER NOT NULL,
    "reporteId" INTEGER,
    "canal" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "enviadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notificacion_acudienteId_fkey" FOREIGN KEY ("acudienteId") REFERENCES "Acudiente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Notificacion_reporteId_fkey" FOREIGN KEY ("reporteId") REFERENCES "Reporte" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER,
    "usuarioNombre" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "detalle" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConfiguracionSistema" (
    "clave" TEXT NOT NULL PRIMARY KEY,
    "valor" TEXT NOT NULL,
    "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuthRateLimit" (
    "clave" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "ventanaInicia" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bloqueadoHasta" DATETIME,
    "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NotificacionUsuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER NOT NULL,
    "reporteId" INTEGER,
    "canal" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "enviadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificacionUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "NotificacionUsuario_reporteId_fkey" FOREIGN KEY ("reporteId") REFERENCES "Reporte" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GrupoEscolar" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "grado" TEXT NOT NULL,
    "grupo" TEXT NOT NULL,
    "jornada" TEXT NOT NULL,
    "directorId" INTEGER,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GrupoEscolar_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EstudianteAcudiente" (
    "estudianteId" INTEGER NOT NULL,
    "acudienteId" INTEGER NOT NULL,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("estudianteId", "acudienteId"),
    CONSTRAINT "EstudianteAcudiente_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Estudiante" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EstudianteAcudiente_acudienteId_fkey" FOREIGN KEY ("acudienteId") REFERENCES "Acudiente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "ubicacion" TEXT,
    "iniciaEn" DATETIME NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'Evento',
    "color" TEXT NOT NULL DEFAULT 'azul',
    "todoElDia" BOOLEAN NOT NULL DEFAULT false,
    "finalizaEn" DATETIME,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EvidenciaReporte" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reporteId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "contenido" BLOB,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvidenciaReporte_reporteId_fkey" FOREIGN KEY ("reporteId") REFERENCES "Reporte" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ObservacionReporte" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reporteId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ObservacionReporte_reporteId_fkey" FOREIGN KEY ("reporteId") REFERENCES "Reporte" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ObservacionReporte_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConvivenciaReporte" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "estudianteId" TEXT NOT NULL,
    "estudiante" TEXT NOT NULL,
    "grado" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "etapa" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "notificacionAcudiente" TEXT NOT NULL,
    "requiereSiuce" BOOLEAN NOT NULL DEFAULT false,
    "creadoPorId" INTEGER NOT NULL,
    "creadoPorNombre" TEXT NOT NULL,
    "creadoPorRol" TEXT NOT NULL,
    "evidencia" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'abierto',
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- CreateIndex
CREATE INDEX "Comunicacion_estado_publicadoEn_idx" ON "Comunicacion"("estado", "publicadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "Estudiante_correo_key" ON "Estudiante"("correo");

-- CreateIndex
CREATE INDEX "Reporte_docenteId_fecha_idx" ON "Reporte"("docenteId", "fecha");

-- CreateIndex
CREATE INDEX "Reporte_estudianteId_fecha_idx" ON "Reporte"("estudianteId", "fecha");

-- CreateIndex
CREATE INDEX "Reporte_estado_fecha_idx" ON "Reporte"("estado", "fecha");

-- CreateIndex
CREATE INDEX "AuthRateLimit_tipo_actualizadoEn_idx" ON "AuthRateLimit"("tipo", "actualizadoEn");

-- CreateIndex
CREATE INDEX "NotificacionUsuario_usuarioId_leida_idx" ON "NotificacionUsuario"("usuarioId", "leida");

-- CreateIndex
CREATE INDEX "GrupoEscolar_directorId_idx" ON "GrupoEscolar"("directorId");

-- CreateIndex
CREATE UNIQUE INDEX "GrupoEscolar_grado_grupo_key" ON "GrupoEscolar"("grado", "grupo");

-- CreateIndex
CREATE INDEX "Evento_iniciaEn_activo_idx" ON "Evento"("iniciaEn", "activo");

-- CreateIndex
CREATE INDEX "EvidenciaReporte_reporteId_creadoEn_idx" ON "EvidenciaReporte"("reporteId", "creadoEn");

-- CreateIndex
CREATE INDEX "ObservacionReporte_reporteId_creadoEn_idx" ON "ObservacionReporte"("reporteId", "creadoEn");

-- CreateIndex
CREATE INDEX "ConvivenciaReporte_estudianteId_idx" ON "ConvivenciaReporte"("estudianteId");

-- CreateIndex
CREATE INDEX "ConvivenciaReporte_estado_creadoEn_idx" ON "ConvivenciaReporte"("estado", "creadoEn");

