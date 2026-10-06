@echo off
title Generador de Licencias - Korex Analytics

echo ================================================================
echo           GENERADOR DE CLAVES DE LICENCIA - KOREX             
echo ================================================================
echo.

node "%~dp0scripts\generar-licencia.js" %*

echo.
pause
