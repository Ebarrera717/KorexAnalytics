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
