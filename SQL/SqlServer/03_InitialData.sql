-- ============================================================================
-- PROYECTO: KOREX ANALYTICS
-- OBJETO: DML - Sembrado Inicial de Roles, Usuarios y Parámetros
-- MOTOR: SQL Server (T-SQL)
-- ============================================================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

-- 1. Sembrado de Roles del Sistema
IF NOT EXISTS (SELECT 1 FROM dbo.[KAX_Role] WHERE [name] = 'SUPER_ADMIN')
BEGIN
    INSERT INTO dbo.[KAX_Role] ([name], [description], [permissions], [isActive])
    VALUES ('SUPER_ADMIN', 'Control total y administración de Korex Analytics', '{"all": true}', 1);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[KAX_Role] WHERE [name] = 'ADMIN')
BEGIN
    INSERT INTO dbo.[KAX_Role] ([name], [description], [permissions], [isActive])
    VALUES ('ADMIN', 'Administrador operativo y gestión de usuarios', '{"users": true, "parameters": true, "sqlProfiles": true, "executions": true}', 1);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[KAX_Role] WHERE [name] = 'ANALYST')
BEGIN
    INSERT INTO dbo.[KAX_Role] ([name], [description], [permissions], [isActive])
    VALUES ('ANALYST', 'Operador de análisis y ejecuciones de procedimientos', '{"executions": true, "presets": true, "viewReports": true}', 1);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[KAX_Role] WHERE [name] = 'AUDITOR')
BEGIN
    INSERT INTO dbo.[KAX_Role] ([name], [description], [permissions], [isActive])
    VALUES ('AUDITOR', 'Consulta de trazabilidad, historiales y métricas del sistema', '{"audit": true, "viewHistory": true}', 1);
END;

-- 2. Sembrado de Usuario Inicial SuperAdmin (Password: Admin2026!* -> Bcrypt Hash)
DECLARE @SuperAdminRoleId INT = (SELECT TOP 1 [id] FROM dbo.[KAX_Role] WHERE [name] = 'SUPER_ADMIN');

IF @SuperAdminRoleId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.[KAX_User] WHERE [email] = 'admin@korexanalytics.com')
BEGIN
    -- Hash generado para 'Admin2026!*' con bcrypt rounds = 10
    INSERT INTO dbo.[KAX_User] ([name], [email], [passwordHash], [roleId], [isActive])
    VALUES (
        'Administrador Korex Analytics',
        'admin@korexanalytics.com',
        '$2a$10$wT0lVl.7yJdCgUfF3E6C4.jN7B8jL3V9B4v0Tq1mB9i7W4f5L6J7y',
        @SuperAdminRoleId,
        1
    );
END;

-- 3. Sembrado de Procedimientos Analíticos de Ejemplo
IF NOT EXISTS (SELECT 1 FROM dbo.[KAX_ExecutionProcedure] WHERE [name] = 'Análisis de Ventas por Período')
BEGIN
    INSERT INTO dbo.[KAX_ExecutionProcedure] ([name], [spName], [description], [category], [parametersConfig], [isActive])
    VALUES (
        'Análisis de Ventas por Período',
        'spAnalisisVentasPeriodo',
        'Reporte consolidado de ventas y movimientos por rango de fechas y sucursal.',
        'VENTAS',
        '[{"name":"fechaInicial","label":"Fecha Inicial","type":"date","required":true},{"name":"fechaFinal","label":"Fecha Final","type":"date","required":true},{"name":"idCliente","label":"Cliente","type":"text","required":false}]',
        1
    );
END;
