@echo off
title KOREX ANALYTICS - INICIALIZADOR DE BASE DE DATOS
chcp 65001 > nul
cls

echo ============================================================================
echo         KOREX ANALYTICS - INICIALIZACIÓN DE BASE DE DATOS EN BLANCO         
echo ============================================================================
echo.
echo Este script creará la base de datos "Korex_Analytics", sus tablas nativas,
echo roles predeterminados y el usuario Administrador inicial.
echo.

node scripts/init_database.js

echo.
echo ============================================================================
pause
