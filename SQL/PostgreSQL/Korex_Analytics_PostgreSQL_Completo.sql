/*
============================================================================
PROYECTO: KOREX ANALYTICS
RELEASE: POSTGRESQL (PL/pgSQL) COMPLETO Y AUTÓNOMO
GENERADO: 2026-10-06T18:20:25.797Z
============================================================================
*/


-- >>> INICIO ARCHIVO: 01_CreateDatabase.sql <<<
-- ============================================================================
-- PROYECTO: KOREX ANALYTICS
-- OBJETO: Creación de Base de Datos y Schema
-- MOTOR: PostgreSQL (PL/pgSQL)
-- ============================================================================

-- Crear base de datos si no existe (ejecutar conectado a la base postgres o de administración)
-- CREATE DATABASE "Korex_Analytics" WITH ENCODING 'UTF8';

-- Crear Schema si no existe
CREATE SCHEMA IF NOT EXISTS public;
COMMENT ON SCHEMA public IS 'Esquema principal de Korex Analytics';


-- >>> INICIO ARCHIVO: 02_Tables.sql <<<
-- ============================================================================
-- PROYECTO: KOREX ANALYTICS
-- OBJETO: Creación de Tablas Nativas e Índices
-- MOTOR: PostgreSQL (PL/pgSQL)
-- ============================================================================

-- 1. TABLA: KAX_Role (Roles y Permisos del Sistema)
CREATE TABLE IF NOT EXISTS public."KAX_Role" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL UNIQUE,
    "description" VARCHAR(255) NULL,
    "permissions" JSONB NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TABLA: KAX_User (Usuarios de la Plataforma)
CREATE TABLE IF NOT EXISTS public."KAX_User" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "passwordHash" VARCHAR(255) NOT NULL,
    "roleId" INT NOT NULL REFERENCES public."KAX_Role"("id"),
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "lastLoginAt" TIMESTAMPTZ NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "IX_KAX_User_RoleId" ON public."KAX_User"("roleId");
CREATE INDEX IF NOT EXISTS "IX_KAX_User_Email" ON public."KAX_User"("email");

-- 3. TABLA: KAX_UserParameter (Parámetros y Preferencias por Usuario)
CREATE TABLE IF NOT EXISTS public."KAX_UserParameter" (
    "id" SERIAL PRIMARY KEY,
    "userId" INT NOT NULL REFERENCES public."KAX_User"("id") ON DELETE CASCADE,
    "paramKey" VARCHAR(100) NOT NULL,
    "paramValue" TEXT NULL,
    "category" VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    "description" VARCHAR(255) NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "UQ_KAX_UserParameter_User_Key" UNIQUE ("userId", "paramKey")
);
CREATE INDEX IF NOT EXISTS "IX_KAX_UserParameter_UserId" ON public."KAX_UserParameter"("userId");

-- 4. TABLA: KAX_SQLConnectionProfile (Perfiles de Conexión a Servidores y Bases SQL Server / Zeus ERP)
CREATE TABLE IF NOT EXISTS public."KAX_SQLConnectionProfile" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(150) NOT NULL UNIQUE,
    "server" VARCHAR(255) NOT NULL,
    "instance" VARCHAR(100) NULL,
    "port" INT NULL DEFAULT 1433,
    "defaultDatabase" VARCHAR(150) NOT NULL,
    "allowedDatabases" TEXT NULL,
    "username" VARCHAR(150) NOT NULL,
    "encryptedPassword" TEXT NOT NULL,
    "encrypt" BOOLEAN NOT NULL DEFAULT FALSE,
    "trustServerCertificate" BOOLEAN NOT NULL DEFAULT TRUE,
    "connectionTimeout" INT NOT NULL DEFAULT 15,
    "requestTimeout" INT NOT NULL DEFAULT 180,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TABLA: KAX_ExecutionProcedure (Catálogo de Procedimientos Almacenados Analíticos)
CREATE TABLE IF NOT EXISTS public."KAX_ExecutionProcedure" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(200) NOT NULL UNIQUE,
    "spName" VARCHAR(255) NOT NULL,
    "description" TEXT NULL,
    "category" VARCHAR(100) NOT NULL DEFAULT 'ANALYTICS',
    "parametersConfig" TEXT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TABLA: KAX_ExecutionPreset (Presets de Filtros, Columnas y Totales Guardados por Usuario)
CREATE TABLE IF NOT EXISTS public."KAX_ExecutionPreset" (
    "id" SERIAL PRIMARY KEY,
    "procedureId" INT NOT NULL REFERENCES public."KAX_ExecutionProcedure"("id") ON DELETE CASCADE,
    "userId" INT NOT NULL REFERENCES public."KAX_User"("id") ON DELETE CASCADE,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(255) NULL,
    "filterValues" TEXT NULL,
    "filterConfig" TEXT NULL,
    "columnConfigs" TEXT NULL,
    "selectedTotals" TEXT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "IX_KAX_ExecutionPreset_ProcUser" ON public."KAX_ExecutionPreset"("procedureId", "userId");

-- 7. TABLA: KAX_ExecutionRun (Historial y Trazabilidad de Ejecuciones)
CREATE TABLE IF NOT EXISTS public."KAX_ExecutionRun" (
    "id" BIGSERIAL PRIMARY KEY,
    "traceId" VARCHAR(50) NOT NULL UNIQUE,
    "userId" INT NOT NULL REFERENCES public."KAX_User"("id"),
    "userName" VARCHAR(150) NOT NULL,
    "profileId" INT NULL REFERENCES public."KAX_SQLConnectionProfile"("id") ON DELETE SET NULL,
    "serverHost" VARCHAR(255) NOT NULL,
    "targetDatabase" VARCHAR(150) NOT NULL,
    "procedureId" INT NULL REFERENCES public."KAX_ExecutionProcedure"("id") ON DELETE SET NULL,
    "spName" VARCHAR(255) NOT NULL,
    "parametersPayload" TEXT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'RUNNING',
    "recordsCount" INT NOT NULL DEFAULT 0,
    "durationMs" INT NOT NULL DEFAULT 0,
    "errorMessage" TEXT NULL,
    "errorDetails" TEXT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "finishedAt" TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS "IX_KAX_ExecutionRun_TraceId" ON public."KAX_ExecutionRun"("traceId");
CREATE INDEX IF NOT EXISTS "IX_KAX_ExecutionRun_UserId" ON public."KAX_ExecutionRun"("userId");
CREATE INDEX IF NOT EXISTS "IX_KAX_ExecutionRun_CreatedAt" ON public."KAX_ExecutionRun"("createdAt" DESC);

-- 8. TABLA: KAX_SystemAuditLog (Auditoría Integral y Compliance)
CREATE TABLE IF NOT EXISTS public."KAX_SystemAuditLog" (
    "id" BIGSERIAL PRIMARY KEY,
    "userId" INT NULL REFERENCES public."KAX_User"("id") ON DELETE SET NULL,
    "userName" VARCHAR(150) NOT NULL DEFAULT 'SYSTEM',
    "module" VARCHAR(50) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "ipAddress" VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
    "userAgent" VARCHAR(255) NULL,
    "details" TEXT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "IX_KAX_SystemAuditLog_UserId" ON public."KAX_SystemAuditLog"("userId");
CREATE INDEX IF NOT EXISTS "IX_KAX_SystemAuditLog_CreatedAt" ON public."KAX_SystemAuditLog"("createdAt" DESC);

-- 9. TABLA: KAX_Dashboard (Tableros Analíticos Configurables y Widgets Guardados)
CREATE TABLE IF NOT EXISTS public."KAX_Dashboard" (
    "id" SERIAL PRIMARY KEY,
    "procedureId" INT NOT NULL REFERENCES public."KAX_ExecutionProcedure"("id") ON DELETE CASCADE,
    "userId" INT NOT NULL REFERENCES public."KAX_User"("id") ON DELETE CASCADE,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(255) NULL,
    "layoutConfig" TEXT NULL,
    "widgetsConfig" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "UQ_KAX_Dashboard_User_Proc_Name" UNIQUE ("userId", "procedureId", "name")
);
CREATE INDEX IF NOT EXISTS "IX_KAX_Dashboard_ProcedureId" ON public."KAX_Dashboard"("procedureId");
CREATE INDEX IF NOT EXISTS "IX_KAX_Dashboard_UserId" ON public."KAX_Dashboard"("userId");

-- 10. TABLA: KAX_License (Control Criptográfico de Licenciamiento del Software)
CREATE TABLE IF NOT EXISTS public."KAX_License" (
    "id" SERIAL PRIMARY KEY,
    "clientName" VARCHAR(255) NOT NULL,
    "nit" VARCHAR(50) NOT NULL,
    "licenseKey" TEXT NOT NULL,
    "expirationDate" DATE NOT NULL,
    "issuedDate" DATE NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "activatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- >>> INICIO ARCHIVO: 03_InitialData.sql <<<
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

INSERT INTO public."KAX_User" ("name", "email", "passwordHash", "roleId", "isActive")
SELECT 
    'Eduardo Barrera',
    'ebarrera@zagencias.com',
    '$2b$10$3iwWpMl/ZOeY7Sw.U3p1/uu3ckrGHrUCl8UQvEP/0QUqHMjeHWnfa',
    (SELECT "id" FROM public."KAX_Role" WHERE "name" = 'SUPER_ADMIN' LIMIT 1),
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM public."KAX_User" WHERE "email" = 'ebarrera@zagencias.com');


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


-- >>> INICIO ARCHIVO: 04_StoredProcedures.sql <<<
-- ============================================================================
-- PROYECTO: KOREX ANALYTICS
-- OBJETO: Procedimientos Almacenados y Funciones del Sistema Interno
-- MOTOR: PostgreSQL (PL/pgSQL)
-- ============================================================================

-- 1. FUNCIÓN / PROCEDIMIENTO: spKAX_RegistrarInicioEjecucion
CREATE OR REPLACE FUNCTION public.spkax_registrarinicioejecucion(
    p_traceid VARCHAR(50),
    p_userid INT,
    p_username VARCHAR(150),
    p_profileid INT,
    p_serverhost VARCHAR(255),
    p_targetdatabase VARCHAR(150),
    p_procedureid INT,
    p_spname VARCHAR(255),
    p_parameterspayload TEXT
) RETURNS BIGINT AS $$
DECLARE
    v_newid BIGINT;
BEGIN
    INSERT INTO public."KAX_ExecutionRun" (
        "traceId",
        "userId",
        "userName",
        "profileId",
        "serverHost",
        "targetDatabase",
        "procedureId",
        "spName",
        "parametersPayload",
        "status",
        "recordsCount",
        "durationMs",
        "createdAt"
    )
    VALUES (
        p_traceid,
        p_userid,
        p_username,
        p_profileid,
        p_serverhost,
        p_targetdatabase,
        p_procedureid,
        p_spname,
        p_parameterspayload,
        'RUNNING',
        0,
        0,
        NOW()
    )
    RETURNING "id" INTO v_newid;

    RETURN v_newid;
END;
$$ LANGUAGE plpgsql;

-- 2. PROCEDIMIENTO: spKAX_FinalizarEjecucion
CREATE OR REPLACE PROCEDURE public.spkax_finalizarejecucion(
    p_traceid VARCHAR(50),
    p_status VARCHAR(30),
    p_recordscount INT,
    p_durationms INT,
    p_errormessage TEXT,
    p_errordetails TEXT
) AS $$
BEGIN
    UPDATE public."KAX_ExecutionRun"
    SET "status" = p_status,
        "recordsCount" = p_recordscount,
        "durationMs" = p_durationms,
        "errorMessage" = p_errormessage,
        "errorDetails" = p_errordetails,
        "finishedAt" = NOW()
    WHERE "traceId" = p_traceid;
END;
$$ LANGUAGE plpgsql;

-- 3. FUNCIÓN / PROCEDIMIENTO: spKAX_RegistrarAuditoria
CREATE OR REPLACE FUNCTION public.spkax_registrarauditoria(
    p_userid INT,
    p_username VARCHAR(150),
    p_module VARCHAR(50),
    p_action VARCHAR(100),
    p_ipaddress VARCHAR(45),
    p_useragent VARCHAR(255),
    p_details TEXT
) RETURNS BIGINT AS $$
DECLARE
    v_newid BIGINT;
BEGIN
    INSERT INTO public."KAX_SystemAuditLog" (
        "userId",
        "userName",
        "module",
        "action",
        "ipAddress",
        "userAgent",
        "details",
        "createdAt"
    )
    VALUES (
        p_userid,
        COALESCE(p_username, 'SYSTEM'),
        p_module,
        p_action,
        COALESCE(p_ipaddress, '127.0.0.1'),
        p_useragent,
        p_details,
        NOW()
    )
    RETURNING "id" INTO v_newid;

    RETURN v_newid;
END;
$$ LANGUAGE plpgsql;

-- 4. FUNCIÓN: spkax_dashboardguardar
CREATE OR REPLACE FUNCTION public.spkax_dashboardguardar(
    p_id INT,
    p_procedureid INT,
    p_userid INT,
    p_name VARCHAR(150),
    p_description VARCHAR(255),
    p_layoutconfig TEXT,
    p_widgetsconfig TEXT,
    p_isdefault BOOLEAN
) RETURNS INT AS $$
DECLARE
    v_saved_id INT;
BEGIN
    IF p_isdefault = TRUE THEN
        UPDATE public."KAX_Dashboard"
        SET "isDefault" = FALSE
        WHERE "procedureId" = p_procedureid AND "userId" = p_userid;
    END IF;

    IF p_id IS NOT NULL AND EXISTS (SELECT 1 FROM public."KAX_Dashboard" WHERE "id" = p_id) THEN
        UPDATE public."KAX_Dashboard"
        SET "name" = p_name,
            "description" = p_description,
            "layoutConfig" = p_layoutconfig,
            "widgetsConfig" = p_widgetsconfig,
            "isDefault" = COALESCE(p_isdefault, FALSE),
            "updatedAt" = NOW()
        WHERE "id" = p_id;

        v_saved_id := p_id;
    ELSE
        INSERT INTO public."KAX_Dashboard" (
            "procedureId", "userId", "name", "description",
            "layoutConfig", "widgetsConfig", "isDefault",
            "createdAt", "updatedAt"
        )
        VALUES (
            p_procedureid, p_userid, p_name, p_description,
            p_layoutconfig, p_widgetsconfig, COALESCE(p_isdefault, FALSE),
            NOW(), NOW()
        )
        RETURNING "id" INTO v_saved_id;
    END IF;

    RETURN v_saved_id;
END;
$$ LANGUAGE plpgsql;

-- 5. FUNCIÓN: spkax_dashboardlistar
CREATE OR REPLACE FUNCTION public.spkax_dashboardlistar(
    p_procedureid INT,
    p_userid INT DEFAULT NULL
) RETURNS TABLE (
    "id" INT,
    "procedureId" INT,
    "userId" INT,
    "userName" VARCHAR(150),
    "name" VARCHAR(150),
    "description" VARCHAR(255),
    "layoutConfig" TEXT,
    "widgetsConfig" TEXT,
    "isDefault" BOOLEAN,
    "createdAt" TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d."id",
        d."procedureId",
        d."userId",
        u."name"::VARCHAR(150) AS "userName",
        d."name",
        d."description",
        d."layoutConfig",
        d."widgetsConfig",
        d."isDefault",
        d."createdAt",
        d."updatedAt"
    FROM public."KAX_Dashboard" d
    LEFT JOIN public."KAX_User" u ON u."id" = d."userId"
    WHERE d."procedureId" = p_procedureid
      AND (p_userid IS NULL OR d."userId" = p_userid)
    ORDER BY d."isDefault" DESC, d."name" ASC;
END;
$$ LANGUAGE plpgsql;

-- 6. PROCEDIMIENTO: spkax_dashboardeliminar
CREATE OR REPLACE PROCEDURE public.spkax_dashboardeliminar(
    p_id INT,
    p_userid INT DEFAULT NULL
) AS $$
BEGIN
    DELETE FROM public."KAX_Dashboard"
    WHERE "id" = p_id
      AND (p_userid IS NULL OR "userId" = p_userid);
END;
$$ LANGUAGE plpgsql;

-- 7. FUNCIÓN: spkax_licenseconsultar
CREATE OR REPLACE FUNCTION public.spkax_licenseconsultar()
RETURNS TABLE (
    "id" INT,
    "clientName" VARCHAR(255),
    "nit" VARCHAR(50),
    "licenseKey" TEXT,
    "expirationDate" DATE,
    "issuedDate" DATE,
    "status" VARCHAR(50),
    "activatedAt" TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ,
    "isExpired" BOOLEAN,
    "daysRemaining" INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l."id",
        l."clientName",
        l."nit",
        l."licenseKey",
        l."expirationDate",
        l."issuedDate",
        l."status",
        l."activatedAt",
        l."updatedAt",
        (l."expirationDate" < CURRENT_DATE) AS "isExpired",
        (l."expirationDate" - CURRENT_DATE)::INT AS "daysRemaining"
    FROM public."KAX_License" l
    ORDER BY l."id" DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 8. FUNCIÓN: spkax_licenseaplicar
CREATE OR REPLACE FUNCTION public.spkax_licenseaplicar(
    p_clientname VARCHAR(255),
    p_nit VARCHAR(50),
    p_licensekey TEXT,
    p_expirationdate DATE,
    p_issueddate DATE DEFAULT NULL,
    p_status VARCHAR(50) DEFAULT 'ACTIVE'
) RETURNS INT AS $$
DECLARE
    v_saved_id INT;
BEGIN
    UPDATE public."KAX_License"
    SET "status" = 'INACTIVE', "updatedAt" = NOW()
    WHERE "status" = 'ACTIVE';

    INSERT INTO public."KAX_License" (
        "clientName", "nit", "licenseKey", "expirationDate",
        "issuedDate", "status", "activatedAt", "updatedAt"
    )
    VALUES (
        p_clientname, p_nit, p_licensekey, p_expirationdate,
        COALESCE(p_issueddate, CURRENT_DATE), p_status, NOW(), NOW()
    )
    RETURNING "id" INTO v_saved_id;

    RETURN v_saved_id;
END;
$$ LANGUAGE plpgsql;

-- 9. FUNCIÓN: spkax_userlistar
CREATE OR REPLACE FUNCTION public.spkax_userlistar(
    p_isactive BOOLEAN DEFAULT NULL
) RETURNS TABLE (
    "id" INT,
    "name" VARCHAR(150),
    "email" VARCHAR(255),
    "roleId" INT,
    "roleName" VARCHAR(100),
    "rolePermissions" JSONB,
    "isActive" BOOLEAN,
    "lastLoginAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u."id",
        u."name",
        u."email",
        u."roleId",
        r."name" AS "roleName",
        r."permissions" AS "rolePermissions",
        u."isActive",
        u."lastLoginAt",
        u."createdAt",
        u."updatedAt"
    FROM public."KAX_User" u
    INNER JOIN public."KAX_Role" r ON r."id" = u."roleId"
    WHERE (p_isactive IS NULL OR u."isActive" = p_isactive)
    ORDER BY u."name" ASC;
END;
$$ LANGUAGE plpgsql;

-- 10. FUNCIÓN: spkax_userguardar
CREATE OR REPLACE FUNCTION public.spkax_userguardar(
    p_id INT,
    p_name VARCHAR(150),
    p_email VARCHAR(255),
    p_passwordhash VARCHAR(255),
    p_roleid INT,
    p_isactive BOOLEAN DEFAULT TRUE
) RETURNS INT AS $$
DECLARE
    v_saved_id INT;
BEGIN
    IF p_id IS NOT NULL AND EXISTS (SELECT 1 FROM public."KAX_User" WHERE "id" = p_id) THEN
        UPDATE public."KAX_User"
        SET "name" = p_name,
            "email" = p_email,
            "roleId" = p_roleid,
            "isActive" = p_isactive,
            "passwordHash" = CASE 
                WHEN p_passwordhash IS NOT NULL AND LENGTH(TRIM(p_passwordhash)) > 0 THEN p_passwordhash 
                ELSE "passwordHash" 
            END,
            "updatedAt" = NOW()
        WHERE "id" = p_id;

        v_saved_id := p_id;
    ELSE
        INSERT INTO public."KAX_User" (
            "name", "email", "passwordHash", "roleId", "isActive", "createdAt", "updatedAt"
        )
        VALUES (
            p_name, p_email, COALESCE(p_passwordhash, ''), p_roleid, p_isactive, NOW(), NOW()
        )
        RETURNING "id" INTO v_saved_id;
    END IF;

    RETURN v_saved_id;
END;
$$ LANGUAGE plpgsql;

-- 11. FUNCIÓN: spkax_rolelistar
CREATE OR REPLACE FUNCTION public.spkax_rolelistar(
    p_isactive BOOLEAN DEFAULT NULL
) RETURNS TABLE (
    "id" INT,
    "name" VARCHAR(100),
    "description" VARCHAR(255),
    "permissions" JSONB,
    "isActive" BOOLEAN,
    "createdAt" TIMESTAMPTZ,
    "updatedAt" TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r."id",
        r."name",
        r."description",
        r."permissions",
        r."isActive",
        r."createdAt",
        r."updatedAt"
    FROM public."KAX_Role" r
    WHERE (p_isactive IS NULL OR r."isActive" = p_isactive)
    ORDER BY r."id" ASC;
END;
$$ LANGUAGE plpgsql;


