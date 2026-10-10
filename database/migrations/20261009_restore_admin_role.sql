UPDATE Usuario
SET rol = 'Admin', versionSesion = versionSesion + 1
WHERE id = (
  SELECT MIN(id) FROM Usuario
  WHERE rol = 'Coordinador' AND activo = 1 AND eliminadoEn IS NULL
)
AND NOT EXISTS (SELECT 1 FROM Usuario WHERE rol = 'Admin' AND eliminadoEn IS NULL)
AND 1 = (SELECT COUNT(*) FROM Usuario WHERE rol = 'Coordinador' AND activo = 1 AND eliminadoEn IS NULL);
