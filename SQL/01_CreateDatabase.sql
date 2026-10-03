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
