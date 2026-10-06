-- ============================================================================
-- PROYECTO: KOREX ANALYTICS
-- OBJETO: Creación de Base de Datos y Schema
-- MOTOR: PostgreSQL (PL/pgSQL)
-- ============================================================================

-- Crear base de datos si no existe (ejecutar conectado a la base postgres o de administración)
-- CREATE DATABASE "Korex_Analytics" WITH ENCODING 'UTF8';

-- Crear Schema si no existe
CREATE SCHEMA IF NOT EXISTS public;
COMMENT ON SCHEMA public IS 'Esquema principal de Korex Analytics';
