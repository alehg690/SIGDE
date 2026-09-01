UPDATE "Estudiante"
SET "grupo" = CASE "documento"
  WHEN 'DEMO-EST-001' THEN '1'
  WHEN 'DEMO-EST-002' THEN '3'
  WHEN 'DEMO-EST-003' THEN '4'
  WHEN 'DEMO-EST-004' THEN '1'
  WHEN 'DEMO-EST-005' THEN '5'
  WHEN 'DEMO-EST-006' THEN '3'
  WHEN 'DEMO-EST-007' THEN '2'
  WHEN 'DEMO-EST-008' THEN '2'
  ELSE "grupo"
END
WHERE "documento" LIKE 'DEMO-EST-%';

UPDATE "Estudiante"
SET "grupo" = CASE UPPER("grupo")
  WHEN 'A' THEN '1'
  WHEN 'B' THEN '2'
  WHEN 'C' THEN '3'
  WHEN 'D' THEN '4'
  WHEN 'E' THEN '5'
  WHEN 'F' THEN '6'
  ELSE "grupo"
END
WHERE UPPER("grupo") IN ('A', 'B', 'C', 'D', 'E', 'F');

UPDATE "Estudiante"
SET "jornada" = CASE
  WHEN REPLACE("grado", '°', '') || '-' || "grupo" IN (
    '6-4', '6-5',
    '7-4', '7-5', '7-6',
    '8-3', '8-4', '8-5',
    '9-3', '9-4',
    '10-3', '10-4',
    '11-3', '11-4'
  ) THEN 'Tarde'
  ELSE 'Mañana'
END
WHERE REPLACE("grado", '°', '') IN ('6', '7', '8', '9', '10', '11');
