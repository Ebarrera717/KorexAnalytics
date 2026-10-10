/*
============================================================================
PROYECTO: KOREX ANALYTICS
RELEASE: SQL SERVER (T-SQL) COMPLETO Y AUTÓNOMO
GENERADO: 2026-10-09T18:04:04.031Z
============================================================================
*/


-- >>> INICIO ARCHIVO: 01_CreateDatabase.sql <<<
-- ============================================================================
-- PROYECTO: KOREX ANALYTICS
-- OBJETO: Creación de la Base de Datos Interna en Blanco
-- MOTOR: SQL Server (T-SQL)
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = 'Korex_Analytics')
BEGIN
    CREATE DATABASE [Korex_Analytics]
    COLLATE SQL_Latin1_General_CP1_CI_AS;
    PRINT 'Base de datos [Korex_Analytics] creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'La base de datos [Korex_Analytics] ya existe.';
END
GO

GO

-- >>> INICIO ARCHIVO: 02_Tables.sql <<<
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
        [dashboardsConfig] NVARCHAR(MAX) NULL, -- JSON con tableros analíticos específicos de esta plantilla
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

-- 9. TABLA: KAX_Dashboard (Tableros Analíticos Configurables y Widgets Guardados)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KAX_Dashboard' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.[KAX_Dashboard] (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_KAX_Dashboard PRIMARY KEY CLUSTERED,
        [procedureId] INT NOT NULL CONSTRAINT FK_KAX_Dashboard_Procedure FOREIGN KEY REFERENCES dbo.[KAX_ExecutionProcedure]([id]) ON DELETE CASCADE,
        [userId] INT NOT NULL CONSTRAINT FK_KAX_Dashboard_User FOREIGN KEY REFERENCES dbo.[KAX_User]([id]) ON DELETE CASCADE,
        [name] NVARCHAR(150) NOT NULL,
        [description] NVARCHAR(255) NULL,
        [layoutConfig] NVARCHAR(MAX) NULL,   -- JSON con grid layout y filtros globales
        [widgetsConfig] NVARCHAR(MAX) NOT NULL, -- JSON con arreglo de widgets (KPIs, Charts, Tablas dinámicas)
        [isDefault] BIT NOT NULL CONSTRAINT DF_KAX_Dashboard_IsDefault DEFAULT 0,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT DF_KAX_Dashboard_CreatedAt DEFAULT SYSUTCDATETIME(),
        [updatedAt] DATETIME2 NOT NULL CONSTRAINT DF_KAX_Dashboard_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_KAX_Dashboard_User_Proc_Name UNIQUE ([userId], [procedureId], [name])
    );
    CREATE NONCLUSTERED INDEX IX_KAX_Dashboard_ProcId ON dbo.[KAX_Dashboard]([procedureId]);
    CREATE NONCLUSTERED INDEX IX_KAX_Dashboard_UserId ON dbo.[KAX_Dashboard]([userId]);
END;

-- 10. TABLA: KAX_License (Control Criptográfico de Licenciamiento del Software)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KAX_License' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.[KAX_License] (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_KAX_License PRIMARY KEY CLUSTERED,
        [clientName] NVARCHAR(255) NOT NULL,
        [nit] NVARCHAR(50) NOT NULL,
        [licenseKey] NVARCHAR(MAX) NOT NULL,
        [expirationDate] DATE NOT NULL,
        [issuedDate] DATE NULL,
        [status] NVARCHAR(50) NOT NULL CONSTRAINT DF_KAX_License_Status DEFAULT 'ACTIVE',
        [activatedAt] DATETIME2 NOT NULL CONSTRAINT DF_KAX_License_ActivatedAt DEFAULT SYSUTCDATETIME(),
        [updatedAt] DATETIME2 NOT NULL CONSTRAINT DF_KAX_License_UpdatedAt DEFAULT SYSUTCDATETIME()
    );
END;

-- 11. TABLA: KAX_FareBasisRule (Maestro de Configuración de Extracción de Fare Basis por Aerolínea)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'KAX_FareBasisRule' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.[KAX_FareBasisRule] (
        [id] INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_KAX_FareBasisRule PRIMARY KEY CLUSTERED,
        [airlineCode] NVARCHAR(20) NOT NULL CONSTRAINT UQ_KAX_FareBasisRule_Code UNIQUE,
        [airlineName] NVARCHAR(150) NOT NULL,
        [startPos] INT NOT NULL CONSTRAINT DF_KAX_FareBasisRule_StartPos DEFAULT 1,
        [length] INT NOT NULL CONSTRAINT DF_KAX_FareBasisRule_Length DEFAULT 2,
        [separator] NVARCHAR(10) NOT NULL CONSTRAINT DF_KAX_FareBasisRule_Separator DEFAULT '/',
        [isActive] BIT NOT NULL CONSTRAINT DF_KAX_FareBasisRule_IsActive DEFAULT 1,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT DF_KAX_FareBasisRule_CreatedAt DEFAULT SYSUTCDATETIME(),
        [updatedAt] DATETIME2 NOT NULL CONSTRAINT DF_KAX_FareBasisRule_UpdatedAt DEFAULT SYSUTCDATETIME()
    );
    CREATE NONCLUSTERED INDEX IX_KAX_FareBasisRule_AirlineCode ON dbo.[KAX_FareBasisRule]([airlineCode]);
    CREATE NONCLUSTERED INDEX IX_KAX_FareBasisRule_IsActive ON dbo.[KAX_FareBasisRule]([isActive]);
END;


GO

-- >>> INICIO ARCHIVO: 03_InitialData.sql <<<
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

IF @SuperAdminRoleId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.[KAX_User] WHERE [email] = 'ebarrera@zagencias.com')
BEGIN
    -- Hash generado para 'admin123' con bcrypt
    INSERT INTO dbo.[KAX_User] ([name], [email], [passwordHash], [roleId], [isActive])
    VALUES (
        'Eduardo Barrera',
        'ebarrera@zagencias.com',
        '$2b$10$3iwWpMl/ZOeY7Sw.U3p1/uu3ckrGHrUCl8UQvEP/0QUqHMjeHWnfa',
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

-- 4. Sembrado de Reglas Iniciales de Fare Basis (Ejemplo: American Airlines 001)
IF NOT EXISTS (SELECT 1 FROM dbo.[KAX_FareBasisRule] WHERE [airlineCode] = '001')
BEGIN
    INSERT INTO dbo.[KAX_FareBasisRule] ([airlineCode], [airlineName], [startPos], [length], [separator], [isActive])
    VALUES ('001', 'American Airlines', 3, 2, '/', 1);
END;



GO

-- >>> INICIO ARCHIVO: 04_StoredProcedures.sql <<<
-- ============================================================================
-- PROYECTO: KOREX ANALYTICS
-- OBJETO: Procedimientos Almacenados del Sistema Interno
-- MOTOR: SQL Server (T-SQL)
-- ============================================================================

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- 1. SP: spKAX_RegistrarInicioEjecucion
CREATE OR ALTER PROCEDURE dbo.spKAX_RegistrarInicioEjecucion
    @traceId NVARCHAR(50),
    @userId INT,
    @userName NVARCHAR(150),
    @profileId INT,
    @serverHost NVARCHAR(255),
    @targetDatabase NVARCHAR(150),
    @procedureId INT = NULL,
    @spName NVARCHAR(255),
    @parametersPayload NVARCHAR(MAX) = NULL,
    @newExecutionId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    INSERT INTO dbo.[KAX_ExecutionRun] (
        [traceId],
        [userId],
        [userName],
        [profileId],
        [serverHost],
        [targetDatabase],
        [procedureId],
        [spName],
        [parametersPayload],
        [status],
        [recordsCount],
        [durationMs],
        [createdAt]
    )
    VALUES (
        @traceId,
        @userId,
        @userName,
        @profileId,
        @serverHost,
        @targetDatabase,
        @procedureId,
        @spName,
        @parametersPayload,
        'RUNNING',
        0,
        0,
        SYSUTCDATETIME()
    );

    SET @newExecutionId = SCOPE_IDENTITY();
END;
GO

-- 2. SP: spKAX_FinalizarEjecucion
CREATE OR ALTER PROCEDURE dbo.spKAX_FinalizarEjecucion
    @executionId INT,
    @status NVARCHAR(50), -- SUCCESS, ERROR, CANCELLED
    @recordsCount INT = 0,
    @durationMs INT = 0,
    @errorMessage NVARCHAR(MAX) = NULL,
    @errorDetails NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.[KAX_ExecutionRun]
    SET [status] = @status,
        [recordsCount] = @recordsCount,
        [durationMs] = @durationMs,
        [errorMessage] = @errorMessage,
        [errorDetails] = @errorDetails,
        [completedAt] = SYSUTCDATETIME()
    WHERE [id] = @executionId;
END;
GO

-- 3. SP: spKAX_RegistrarAuditoria
CREATE OR ALTER PROCEDURE dbo.spKAX_RegistrarAuditoria
    @userId INT = NULL,
    @action NVARCHAR(100),
    @module NVARCHAR(100),
    @ipAddress NVARCHAR(50) = NULL,
    @userAgent NVARCHAR(255) = NULL,
    @details NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.[KAX_SystemAuditLog] (
        [userId],
        [action],
        [module],
        [ipAddress],
        [userAgent],
        [details],
        [createdAt]
    )
    VALUES (
        @userId,
        @action,
        @module,
        @ipAddress,
        @userAgent,
        @details,
        SYSUTCDATETIME()
    );
END;
GO

-- 4. SP: spKAX_DashboardGuardar
CREATE OR ALTER PROCEDURE dbo.spKAX_DashboardGuardar
    @id INT = NULL,
    @procedureId INT,
    @userId INT,
    @name NVARCHAR(150),
    @description NVARCHAR(255) = NULL,
    @layoutConfig NVARCHAR(MAX) = NULL,
    @widgetsConfig NVARCHAR(MAX),
    @isDefault BIT = 0,
    @savedId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @isDefault = 1
    BEGIN
        UPDATE dbo.[KAX_Dashboard]
        SET [isDefault] = 0
        WHERE [procedureId] = @procedureId AND [userId] = @userId;
    END

    IF @id IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.[KAX_Dashboard] WHERE [id] = @id)
    BEGIN
        UPDATE dbo.[KAX_Dashboard]
        SET [name] = @name,
            [description] = @description,
            [layoutConfig] = @layoutConfig,
            [widgetsConfig] = @widgetsConfig,
            [isDefault] = @isDefault,
            [updatedAt] = SYSUTCDATETIME()
        WHERE [id] = @id;

        SET @savedId = @id;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.[KAX_Dashboard] (
            [procedureId], [userId], [name], [description],
            [layoutConfig], [widgetsConfig], [isDefault],
            [createdAt], [updatedAt]
        )
        VALUES (
            @procedureId, @userId, @name, @description,
            @layoutConfig, @widgetsConfig, @isDefault,
            SYSUTCDATETIME(), SYSUTCDATETIME()
        );

        SET @savedId = SCOPE_IDENTITY();
    END
END;
GO

-- 5. SP: spKAX_DashboardListar
CREATE OR ALTER PROCEDURE dbo.spKAX_DashboardListar
    @procedureId INT,
    @userId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        d.[id],
        d.[procedureId],
        d.[userId],
        u.[name] AS [userName],
        d.[name],
        d.[description],
        d.[layoutConfig],
        d.[widgetsConfig],
        d.[isDefault],
        d.[createdAt],
        d.[updatedAt]
    FROM dbo.[KAX_Dashboard] d
    LEFT JOIN dbo.[KAX_User] u ON u.[id] = d.[userId]
    WHERE d.[procedureId] = @procedureId
      AND (@userId IS NULL OR d.[userId] = @userId)
    ORDER BY d.[isDefault] DESC, d.[name] ASC;
END;
GO

-- 6. SP: spKAX_DashboardEliminar
CREATE OR ALTER PROCEDURE dbo.spKAX_DashboardEliminar
    @id INT,
    @userId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.[KAX_Dashboard]
    WHERE [id] = @id
      AND (@userId IS NULL OR [userId] = @userId);
END;
GO

-- 7. SP: spKAX_LicenseConsultar
CREATE OR ALTER PROCEDURE dbo.spKAX_LicenseConsultar
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        [id],
        [clientName],
        [nit],
        [licenseKey],
        [expirationDate],
        [issuedDate],
        [status],
        [activatedAt],
        [updatedAt],
        CASE 
            WHEN [expirationDate] < CAST(SYSUTCDATETIME() AS DATE) THEN 1 
            ELSE 0 
        END AS [isExpired],
        DATEDIFF(day, CAST(SYSUTCDATETIME() AS DATE), [expirationDate]) AS [daysRemaining]
    FROM dbo.[KAX_License]
    ORDER BY [id] DESC;
END;
GO

-- 8. SP: spKAX_LicenseAplicar
CREATE OR ALTER PROCEDURE dbo.spKAX_LicenseAplicar
    @clientName NVARCHAR(255),
    @nit NVARCHAR(50),
    @licenseKey NVARCHAR(MAX),
    @expirationDate DATE,
    @issuedDate DATE = NULL,
    @status NVARCHAR(50) = 'ACTIVE',
    @savedId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    UPDATE dbo.[KAX_License]
    SET [status] = 'INACTIVE', [updatedAt] = SYSUTCDATETIME()
    WHERE [status] = 'ACTIVE';

    INSERT INTO dbo.[KAX_License] (
        [clientName],
        [nit],
        [licenseKey],
        [expirationDate],
        [issuedDate],
        [status],
        [activatedAt],
        [updatedAt]
    )
    VALUES (
        @clientName,
        @nit,
        @licenseKey,
        @expirationDate,
        COALESCE(@issuedDate, CAST(SYSUTCDATETIME() AS DATE)),
        @status,
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
    );

    SET @savedId = SCOPE_IDENTITY();
END;
GO

-- 9. SP: spKAX_UserListar
CREATE OR ALTER PROCEDURE dbo.spKAX_UserListar
    @isActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        u.[id],
        u.[name],
        u.[email],
        u.[roleId],
        r.[name] AS [roleName],
        r.[permissions] AS [rolePermissions],
        u.[isActive],
        u.[lastLoginAt],
        u.[createdAt],
        u.[updatedAt]
    FROM dbo.[KAX_User] u
    INNER JOIN dbo.[KAX_Role] r ON r.[id] = u.[roleId]
    WHERE (@isActive IS NULL OR u.[isActive] = @isActive)
    ORDER BY u.[name] ASC;
END;
GO

-- 10. SP: spKAX_UserGuardar
CREATE OR ALTER PROCEDURE dbo.spKAX_UserGuardar
    @id INT = NULL,
    @name NVARCHAR(150),
    @email NVARCHAR(255),
    @passwordHash NVARCHAR(255) = NULL,
    @roleId INT,
    @isActive BIT = 1,
    @savedId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @id IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.[KAX_User] WHERE [id] = @id)
    BEGIN
        UPDATE dbo.[KAX_User]
        SET [name] = @name,
            [email] = @email,
            [roleId] = @roleId,
            [isActive] = @isActive,
            [passwordHash] = CASE 
                WHEN @passwordHash IS NOT NULL AND LEN(TRIM(@passwordHash)) > 0 THEN @passwordHash 
                ELSE [passwordHash] 
            END,
            [updatedAt] = SYSUTCDATETIME()
        WHERE [id] = @id;

        SET @savedId = @id;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.[KAX_User] (
            [name], [email], [passwordHash], [roleId], [isActive], [createdAt], [updatedAt]
        )
        VALUES (
            @name, @email, COALESCE(@passwordHash, ''), @roleId, @isActive, SYSUTCDATETIME(), SYSUTCDATETIME()
        );

        SET @savedId = SCOPE_IDENTITY();
    END
END;
GO

-- 11. SP: spKAX_RoleListar
CREATE OR ALTER PROCEDURE dbo.spKAX_RoleListar
    @isActive BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        [id],
        [name],
        [description],
        [permissions],
        [isActive],
        [createdAt],
        [updatedAt]
    FROM dbo.[KAX_Role]
    WHERE (@isActive IS NULL OR [isActive] = @isActive)
    ORDER BY [id] ASC;
END;
GO

-- 12. FUNCIÓN ESCALAR: fnKAX_CalcularFarebasisReal
-- Aplica la regla de extracción de caracteres individualmente a cada segmento separado por el delimitador (por defecto '/')
CREATE OR ALTER FUNCTION dbo.fnKAX_CalcularFarebasisReal
(
    @fareBasisOriginal VARCHAR(500),
    @startPos INT,
    @length INT,
    @separator VARCHAR(10) = '/'
)
RETURNS VARCHAR(500)
AS
BEGIN
    IF @fareBasisOriginal IS NULL OR LTRIM(RTRIM(@fareBasisOriginal)) = ''
        RETURN @fareBasisOriginal;

    IF @startPos IS NULL OR @startPos < 1 OR @length IS NULL OR @length <= 0
        RETURN @fareBasisOriginal;

    IF @separator IS NULL OR @separator = ''
        SET @separator = '/';

    DECLARE @resultado VARCHAR(500) = '';
    DECLARE @pos INT;
    DECLARE @segmento VARCHAR(200);
    DECLARE @transformado VARCHAR(200);
    DECLARE @restante VARCHAR(500) = @fareBasisOriginal;

    WHILE CHARINDEX(@separator, @restante) > 0
    BEGIN
        SET @pos = CHARINDEX(@separator, @restante);
        SET @segmento = SUBSTRING(@restante, 1, @pos - 1);
        SET @restante = SUBSTRING(@restante, @pos + LEN(@separator), LEN(@restante));

        SET @transformado = SUBSTRING(@segmento, @startPos, @length);
        SET @resultado = @resultado + @transformado + @separator;
    END;

    -- Último segmento (o único si no contenía separador)
    SET @segmento = @restante;
    SET @transformado = SUBSTRING(@segmento, @startPos, @length);
    SET @resultado = @resultado + @transformado;

    RETURN @resultado;
END;
GO

-- 13. SP: spKAX_FareBasisRuleListar
CREATE OR ALTER PROCEDURE dbo.spKAX_FareBasisRuleListar
    @isActive BIT = NULL,
    @search NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        [id],
        [airlineCode],
        [airlineName],
        [startPos],
        [length],
        [separator],
        [isActive],
        [createdAt],
        [updatedAt]
    FROM dbo.[KAX_FareBasisRule]
    WHERE (@isActive IS NULL OR [isActive] = @isActive)
      AND (@search IS NULL OR [airlineCode] LIKE '%' + @search + '%' OR [airlineName] LIKE '%' + @search + '%')
    ORDER BY [airlineCode] ASC;
END;
GO

-- 14. SP: spKAX_FareBasisRuleGuardar
CREATE OR ALTER PROCEDURE dbo.spKAX_FareBasisRuleGuardar
    @id INT = NULL,
    @airlineCode NVARCHAR(20),
    @airlineName NVARCHAR(150),
    @startPos INT = 1,
    @length INT = 2,
    @separator NVARCHAR(10) = '/',
    @isActive BIT = 1,
    @savedId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @separator = COALESCE(NULLIF(TRIM(@separator), ''), '/');
    SET @startPos = CASE WHEN @startPos < 1 THEN 1 ELSE @startPos END;
    SET @length = CASE WHEN @length < 1 THEN 1 ELSE @length END;

    IF @id IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.[KAX_FareBasisRule] WHERE [id] = @id)
    BEGIN
        UPDATE dbo.[KAX_FareBasisRule]
        SET [airlineCode] = TRIM(@airlineCode),
            [airlineName] = TRIM(@airlineName),
            [startPos] = @startPos,
            [length] = @length,
            [separator] = @separator,
            [isActive] = @isActive,
            [updatedAt] = SYSUTCDATETIME()
        WHERE [id] = @id;

        SET @savedId = @id;
    END
    ELSE
    BEGIN
        -- Upsert por airlineCode si ya existiera
        IF EXISTS (SELECT 1 FROM dbo.[KAX_FareBasisRule] WHERE [airlineCode] = TRIM(@airlineCode))
        BEGIN
            UPDATE dbo.[KAX_FareBasisRule]
            SET [airlineName] = TRIM(@airlineName),
                [startPos] = @startPos,
                [length] = @length,
                [separator] = @separator,
                [isActive] = @isActive,
                [updatedAt] = SYSUTCDATETIME()
            WHERE [airlineCode] = TRIM(@airlineCode);

            SELECT @savedId = [id] FROM dbo.[KAX_FareBasisRule] WHERE [airlineCode] = TRIM(@airlineCode);
        END
        ELSE
        BEGIN
            INSERT INTO dbo.[KAX_FareBasisRule] (
                [airlineCode], [airlineName], [startPos], [length], [separator], [isActive], [createdAt], [updatedAt]
            )
            VALUES (
                TRIM(@airlineCode), TRIM(@airlineName), @startPos, @length, @separator, @isActive, SYSUTCDATETIME(), SYSUTCDATETIME()
            );

            SET @savedId = SCOPE_IDENTITY();
        END;
    END;
END;
GO

-- 15. SP: spKAX_FareBasisRuleEliminar
CREATE OR ALTER PROCEDURE dbo.spKAX_FareBasisRuleEliminar
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.[KAX_FareBasisRule] WHERE [id] = @id;
END;
GO



GO
