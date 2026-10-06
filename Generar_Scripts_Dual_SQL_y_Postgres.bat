@echo off
title KOREX ANALYTICS - GENERADOR DUAL (SQL SERVER Y POSTGRESQL)
chcp 65001 > nul
cd /d "%~dp0"
cls

echo ============================================================================
echo      KOREX ANALYTICS - GENERADOR Y VALIDADOR DUAL DE BASE DE DATOS
echo                 Microsoft SQL Server ^& PostgreSQL 18
echo ============================================================================
echo.

if not exist node_modules (
    echo [INFO] Instalando dependencias de Node.js...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Error durante npm install.
        pause
        exit /b 1
    )
)

echo [PASO 1] Compilando y empaquetando scripts para ambos motores...
node scripts/generate_dual_database_scripts.js
if errorlevel 1 (
    echo [ERROR] Falló la generación de scripts.
    pause
    exit /b 1
)

echo.
echo [PASO 2] Ejecutando validación de paridad en vivo contra SQL Server y PostgreSQL...
node scripts/validate_multidb_parity.js
if errorlevel 1 (
    echo [ERROR] Falló la validación de paridad multibase.
    pause
    exit /b 1
)

echo.
echo ============================================================================
echo   RELEASES GENERADOS EXITOSAMENTE CON PARIDAD 100%%:
echo   - SQL Server:  SQL\SqlServer\Korex_Analytics_SQLServer_Completo.sql
echo   - PostgreSQL:  SQL\PostgreSQL\Korex_Analytics_PostgreSQL_Completo.sql
echo   - Manifiestos: SQL\manifest-sqlserver.json ^& manifest-postgresql.json
echo ============================================================================
echo.
pause
