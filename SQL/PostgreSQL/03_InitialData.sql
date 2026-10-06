-- ============================================================================
-- PROYECTO: KOREX ANALYTICS
-- OBJETO: Sembrado de Datos Iniciales (Roles, Usuario Admin y Catálogo)
-- MOTOR: PostgreSQL (PL/pgSQL)
-- ============================================================================

-- 1. Sembrado de Roles Predeterminados
INSERT INTO public."KAX_Role" ("name", "description", "permissions", "isActive")
SELECT 'SUPER_ADMIN', 'Acceso irrestricto a todas las funcionalidades, seguridad y gestión de servidores', '{"all": true}'::jsonb, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public."KAX_Role" WHERE "name" = 'SUPER_ADMIN');

INSERT INTO public."KAX_Role" ("name", "description", "permissions", "isActive")
SELECT 'ANALYST', 'Ejecución de Stored Procedures, visualización y exportación de datos analíticos', '{"executions": true, "export": true}'::jsonb, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public."KAX_Role" WHERE "name" = 'ANALYST');

INSERT INTO public."KAX_Role" ("name", "description", "permissions", "isActive")
SELECT 'AUDITOR', 'Acceso de solo lectura a métricas de trazabilidad y registros de auditoría', '{"audit": true, "history": true}'::jsonb, TRUE
WHERE NOT EXISTS (SELECT 1 FROM public."KAX_Role" WHERE "name" = 'AUDITOR');

-- 2. Sembrado de Usuario Administrador Inicial
-- Hash bcrypt para 'Admin2026!*'
INSERT INTO public."KAX_User" ("name", "email", "passwordHash", "roleId", "isActive")
SELECT 
    'Administrador Korex Analytics',
    'admin@korexanalytics.com',
    '$2a$10$wT0lVl.7yJdCgUfF3E6C4.jN7B8jL3V9B4v0Tq1mB9i7W4f5L6J7y',
    (SELECT "id" FROM public."KAX_Role" WHERE "name" = 'SUPER_ADMIN' LIMIT 1),
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM public."KAX_User" WHERE "email" = 'admin@korexanalytics.com');

-- 3. Sembrado de Procedimientos Analíticos de Catálogo
INSERT INTO public."KAX_ExecutionProcedure" ("name", "spName", "description", "category", "parametersConfig", "isActive")
SELECT 
    'Análisis de Ventas por Período',
    'spAnalisisVentasPeriodo',
    'Reporte consolidado de ventas y movimientos por rango de fechas y sucursal.',
    'VENTAS',
    '[{"name":"fechaInicial","label":"Fecha Inicial","type":"date","defaultValue":"FIRST_DAY_OF_MONTH","required":true},{"name":"fechaFinal","label":"Fecha Final","type":"date","defaultValue":"TODAY","required":true},{"name":"cd_cliente","label":"Cliente","type":"text","lookupType":"clientes","required":false}]',
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM public."KAX_ExecutionProcedure" WHERE "name" = 'Análisis de Ventas por Período');
