@echo off
title KOREX ANALYTICS - INICIALIZADOR DE BASE DE DATOS
chcp 65001 > nul
cd /d "%~dp0"
cls

echo ============================================================================
echo         KOREX ANALYTICS - INICIALIZACIÓN DE BASE DE DATOS EN BLANCO         
echo ============================================================================
echo.
echo Este script creará la base de datos "Korex_Analytics", sus tablas nativas,
echo roles predeterminados y el usuario Administrador inicial.
echo.

if not exist package.json (
    echo [ERROR] No se encontro package.json en el directorio del proyecto.
    pause
    exit /b 1
)

if not exist node_modules (
    echo [INFO] Instalando dependencias de Node.js requeridas...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Error durante npm install.
        pause
        exit /b 1
    )
)

node scripts/init_database.js

echo.
echo ============================================================================
pause
