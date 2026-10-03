@echo off
title KOREX ANALYTICS - SERVIDOR PRODUCTIVO
chcp 65001 > nul
cls

echo ============================================================================
echo                      KOREX ANALYTICS - PLATAFORMA WEB                       
echo ============================================================================
echo.
echo Puerto configurado: 3002
echo Modo: Standalone / Production
echo Iniciando servidor...
echo.

if not exist node_modules (
    echo [INFO] Instalando dependencias de Node.js...
    call npm install
)

call npm run dev

pause
