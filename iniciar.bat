@echo off
title KOREX ANALYTICS - SERVIDOR PRODUCTIVO
chcp 65001 > nul
cd /d "%~dp0"
cls

echo ============================================================================
echo                      KOREX ANALYTICS - PLATAFORMA WEB                       
echo ============================================================================
echo.
echo Directorio: %~dp0
echo Puerto configurado: 3002
echo Modo: Standalone / Production
echo Iniciando servidor...
echo.

if not exist package.json (
    echo [ERROR] No se encontro package.json en el directorio del proyecto.
    pause
    exit /b 1
)

if not exist node_modules (
    echo [INFO] Instalando dependencias de Node.js...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Error durante npm install.
        pause
        exit /b 1
    )
)

call npm run dev

if errorlevel 1 (
    echo.
    echo [ERROR] El servidor ha finalizado con un error.
)

pause
