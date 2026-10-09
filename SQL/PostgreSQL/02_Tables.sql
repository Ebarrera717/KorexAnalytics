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
    "dashboardsConfig" TEXT NULL,
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
