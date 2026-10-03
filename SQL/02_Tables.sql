-- ============================================================================
-- PROYECTO: KOREX ANALYTICS
-- OBJETO: DDL - Creación de Tablas Internas del Sistema
-- MOTOR: SQL Server (T-SQL)
-- REGLA: Independencia Total de AgenciasNew. Integridad referencial estricta.
-- ============================================================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

-- 1. TABLA: KAX_Role (Roles y Permisos del Sistema)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KAX_Role' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.[KAX_Role] (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_KAX_Role PRIMARY KEY CLUSTERED,
        [name] NVARCHAR(100) NOT NULL CONSTRAINT UQ_KAX_Role_Name UNIQUE,
        [description] NVARCHAR(255) NULL,
        [permissions] NVARCHAR(MAX) NULL, -- JSON estructurado de permisos
        [isActive] BIT NOT NULL CONSTRAINT DF_KAX_Role_IsActive DEFAULT 1,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT DF_KAX_Role_CreatedAt DEFAULT SYSUTCDATETIME(),
        [updatedAt] DATETIME2 NOT NULL CONSTRAINT DF_KAX_Role_UpdatedAt DEFAULT SYSUTCDATETIME()
    );
END;

-- 2. TABLA: KAX_User (Usuarios de Korex Analytics)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KAX_User' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.[KAX_User] (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_KAX_User PRIMARY KEY CLUSTERED,
        [name] NVARCHAR(150) NOT NULL,
        [email] NVARCHAR(255) NOT NULL CONSTRAINT UQ_KAX_User_Email UNIQUE,
        [passwordHash] NVARCHAR(255) NOT NULL,
        [roleId] INT NOT NULL CONSTRAINT FK_KAX_User_Role FOREIGN KEY REFERENCES dbo.[KAX_Role]([id]),
        [isActive] BIT NOT NULL CONSTRAINT DF_KAX_User_IsActive DEFAULT 1,
        [lastLoginAt] DATETIME2 NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT DF_KAX_User_CreatedAt DEFAULT SYSUTCDATETIME(),
        [updatedAt] DATETIME2 NOT NULL CONSTRAINT DF_KAX_User_UpdatedAt DEFAULT SYSUTCDATETIME()
    );
    CREATE NONCLUSTERED INDEX IX_KAX_User_RoleId ON dbo.[KAX_User]([roleId]);
    CREATE NONCLUSTERED INDEX IX_KAX_User_Email ON dbo.[KAX_User]([email]);
END;

-- 3. TABLA: KAX_UserParameter (Parámetros y Preferencias por Usuario)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KAX_UserParameter' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.[KAX_UserParameter] (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_KAX_UserParameter PRIMARY KEY CLUSTERED,
        [userId] INT NOT NULL CONSTRAINT FK_KAX_UserParameter_User FOREIGN KEY REFERENCES dbo.[KAX_User]([id]) ON DELETE CASCADE,
        [paramKey] NVARCHAR(100) NOT NULL,
        [paramValue] NVARCHAR(MAX) NULL,
        [category] NVARCHAR(50) NOT NULL CONSTRAINT DF_KAX_UserParameter_Category DEFAULT 'GENERAL',
        [description] NVARCHAR(255) NULL,
        [updatedAt] DATETIME2 NOT NULL CONSTRAINT DF_KAX_UserParameter_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_KAX_UserParameter_User_Key UNIQUE ([userId], [paramKey])
    );
    CREATE NONCLUSTERED INDEX IX_KAX_UserParameter_UserId ON dbo.[KAX_UserParameter]([userId]);
END;

-- 4. TABLA: KAX_SQLConnectionProfile (Perfiles de Conexión a Servidores y Bases SQL Server)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KAX_SQLConnectionProfile' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.[KAX_SQLConnectionProfile] (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_KAX_SQLConnectionProfile PRIMARY KEY CLUSTERED,
        [name] NVARCHAR(150) NOT NULL CONSTRAINT UQ_KAX_SQLConnectionProfile_Name UNIQUE,
        [server] NVARCHAR(255) NOT NULL, -- Host o IP
        [instance] NVARCHAR(100) NULL,   -- Instancia (ej: SQLEXPRESS)
        [port] INT NULL CONSTRAINT DF_KAX_SQLConnectionProfile_Port DEFAULT 1433,
        [defaultDatabase] NVARCHAR(150) NOT NULL,
        [allowedDatabases] NVARCHAR(MAX) NULL, -- JSON Array de bases permitidas
        [username] NVARCHAR(150) NOT NULL,
        [encryptedPassword] NVARCHAR(MAX) NOT NULL, -- Cifrado AES-256
        [encrypt] BIT NOT NULL CONSTRAINT DF_KAX_SQLConnectionProfile_Encrypt DEFAULT 0,
        [trustServerCertificate] BIT NOT NULL CONSTRAINT DF_KAX_SQLConnectionProfile_TrustCert DEFAULT 1,
        [connectionTimeout] INT NOT NULL CONSTRAINT DF_KAX_SQLConnectionProfile_ConnTimeout DEFAULT 15,
        [requestTimeout] INT NOT NULL CONSTRAINT DF_KAX_SQLConnectionProfile_ReqTimeout DEFAULT 180,
        [isActive] BIT NOT NULL CONSTRAINT DF_KAX_SQLConnectionProfile_IsActive DEFAULT 1,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT DF_KAX_SQLConnectionProfile_CreatedAt DEFAULT SYSUTCDATETIME(),
        [updatedAt] DATETIME2 NOT NULL CONSTRAINT DF_KAX_SQLConnectionProfile_UpdatedAt DEFAULT SYSUTCDATETIME()
    );
END;

-- 5. TABLA: KAX_ExecutionProcedure (Catálogo de Procedimientos Almacenados Analíticos)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KAX_ExecutionProcedure' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.[KAX_ExecutionProcedure] (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_KAX_ExecutionProcedure PRIMARY KEY CLUSTERED,
        [name] NVARCHAR(200) NOT NULL CONSTRAINT UQ_KAX_ExecutionProcedure_Name UNIQUE,
        [spName] NVARCHAR(255) NOT NULL, -- Nombre del SP en SQL Server
        [description] NVARCHAR(MAX) NULL,
        [category] NVARCHAR(100) NOT NULL CONSTRAINT DF_KAX_ExecutionProcedure_Category DEFAULT 'ANALYTICS',
        [parametersConfig] NVARCHAR(MAX) NULL, -- JSON con definición de parámetros, tipos, lookups
        [isActive] BIT NOT NULL CONSTRAINT DF_KAX_ExecutionProcedure_IsActive DEFAULT 1,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT DF_KAX_ExecutionProcedure_CreatedAt DEFAULT SYSUTCDATETIME(),
        [updatedAt] DATETIME2 NOT NULL CONSTRAINT DF_KAX_ExecutionProcedure_UpdatedAt DEFAULT SYSUTCDATETIME()
    );
END;

-- 6. TABLA: KAX_ExecutionPreset (Presets de Filtros, Columnas y Totales Guardados por Usuario)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KAX_ExecutionPreset' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.[KAX_ExecutionPreset] (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_KAX_ExecutionPreset PRIMARY KEY CLUSTERED,
        [procedureId] INT NOT NULL CONSTRAINT FK_KAX_ExecutionPreset_Procedure FOREIGN KEY REFERENCES dbo.[KAX_ExecutionProcedure]([id]) ON DELETE CASCADE,
        [userId] INT NOT NULL CONSTRAINT FK_KAX_ExecutionPreset_User FOREIGN KEY REFERENCES dbo.[KAX_User]([id]) ON DELETE CASCADE,
        [name] NVARCHAR(150) NOT NULL,
        [description] NVARCHAR(255) NULL,
        [filterValues] NVARCHAR(MAX) NULL,   -- JSON con valores de filtros
        [filterConfig] NVARCHAR(MAX) NULL,   -- JSON con orden y visibilidad de filtros
        [columnConfigs] NVARCHAR(MAX) NULL,  -- JSON con renombrado y visibilidad de columnas
        [selectedTotals] NVARCHAR(MAX) NULL, -- JSON con columnas de totales
        [createdAt] DATETIME2 NOT NULL CONSTRAINT DF_KAX_ExecutionPreset_CreatedAt DEFAULT SYSUTCDATETIME(),
        [updatedAt] DATETIME2 NOT NULL CONSTRAINT DF_KAX_ExecutionPreset_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_KAX_ExecutionPreset_User_Proc_Name UNIQUE ([userId], [procedureId], [name])
    );
    CREATE NONCLUSTERED INDEX IX_KAX_ExecutionPreset_ProcId ON dbo.[KAX_ExecutionPreset]([procedureId]);
    CREATE NONCLUSTERED INDEX IX_KAX_ExecutionPreset_UserId ON dbo.[KAX_ExecutionPreset]([userId]);
END;

-- 7. TABLA: KAX_ExecutionRun (Registro Inmutable de Ejecuciones y Trazabilidad TRC-XXXX)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KAX_ExecutionRun' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.[KAX_ExecutionRun] (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_KAX_ExecutionRun PRIMARY KEY CLUSTERED,
        [traceId] NVARCHAR(50) NOT NULL CONSTRAINT UQ_KAX_ExecutionRun_TraceId UNIQUE,
        [userId] INT NOT NULL CONSTRAINT FK_KAX_ExecutionRun_User FOREIGN KEY REFERENCES dbo.[KAX_User]([id]),
        [userName] NVARCHAR(150) NOT NULL,
        [profileId] INT NOT NULL CONSTRAINT FK_KAX_ExecutionRun_Profile FOREIGN KEY REFERENCES dbo.[KAX_SQLConnectionProfile]([id]),
        [serverHost] NVARCHAR(255) NOT NULL,
        [targetDatabase] NVARCHAR(150) NOT NULL,
        [procedureId] INT NULL CONSTRAINT FK_KAX_ExecutionRun_Procedure FOREIGN KEY REFERENCES dbo.[KAX_ExecutionProcedure]([id]),
        [spName] NVARCHAR(255) NOT NULL,
        [parametersPayload] NVARCHAR(MAX) NULL, -- Parámetros JSON sanitizados
        [status] NVARCHAR(50) NOT NULL, -- PENDING, RUNNING, SUCCESS, ERROR, CANCELLED
        [recordsCount] INT NOT NULL CONSTRAINT DF_KAX_ExecutionRun_RecordsCount DEFAULT 0,
        [durationMs] INT NOT NULL CONSTRAINT DF_KAX_ExecutionRun_DurationMs DEFAULT 0,
        [errorMessage] NVARCHAR(MAX) NULL,
        [errorDetails] NVARCHAR(MAX) NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT DF_KAX_ExecutionRun_CreatedAt DEFAULT SYSUTCDATETIME(),
        [completedAt] DATETIME2 NULL
    );
    CREATE NONCLUSTERED INDEX IX_KAX_ExecutionRun_User_Date ON dbo.[KAX_ExecutionRun]([userId], [createdAt] DESC);
    CREATE NONCLUSTERED INDEX IX_KAX_ExecutionRun_Status ON dbo.[KAX_ExecutionRun]([status]);
    CREATE NONCLUSTERED INDEX IX_KAX_ExecutionRun_TraceId ON dbo.[KAX_ExecutionRun]([traceId]);
END;

-- 8. TABLA: KAX_SystemAuditLog (Auditoría de Seguridad y Eventos del Sistema)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KAX_SystemAuditLog' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.[KAX_SystemAuditLog] (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_KAX_SystemAuditLog PRIMARY KEY CLUSTERED,
        [userId] INT NULL CONSTRAINT FK_KAX_SystemAuditLog_User FOREIGN KEY REFERENCES dbo.[KAX_User]([id]),
        [action] NVARCHAR(100) NOT NULL, -- LOGIN, LOGOUT, CREATE_PROFILE, UPDATE_USER, EXECUTE_SP, etc.
        [module] NVARCHAR(100) NOT NULL, -- AUTH, USERS, SQLSERVER, EXECUTIONS, PARAMETERS
        [ipAddress] NVARCHAR(50) NULL,
        [userAgent] NVARCHAR(255) NULL,
        [details] NVARCHAR(MAX) NULL, -- JSON con detalles de la acción
        [createdAt] DATETIME2 NOT NULL CONSTRAINT DF_KAX_SystemAuditLog_CreatedAt DEFAULT SYSUTCDATETIME()
    );
    CREATE NONCLUSTERED INDEX IX_KAX_SystemAuditLog_Action ON dbo.[KAX_SystemAuditLog]([action], [createdAt] DESC);
    CREATE NONCLUSTERED INDEX IX_KAX_SystemAuditLog_User ON dbo.[KAX_SystemAuditLog]([userId]);
END;
