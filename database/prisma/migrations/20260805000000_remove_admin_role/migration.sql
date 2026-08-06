-- El rol Coordinador reemplaza al antiguo rol Admin como máximo responsable del sistema.
UPDATE "Usuario" SET "rol" = 'Coordinador' WHERE "rol" = 'Admin';
