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
