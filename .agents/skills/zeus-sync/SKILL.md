---
name: zeus-sync
description: Protocolo, script autónomo y watcher para la sincronización automática de Stored Procedures, funciones y DDL T-SQL en la base de datos de Zeus ERP en SQL Server durante el desarrollo.
---

# Skill: Sincronización Autónoma y en Tiempo Real con Zeus ERP (`zeus-sync`)

Este Skill establece el estándar y la directiva obligatoria para la sincronización automática y autónoma de la base de datos de Zeus ERP (Microsoft SQL Server) durante el ciclo de desarrollo en AgenciasNew.

---

## 1. Principio de Arquitectura Sincronizada

Toda modificación a procedimientos almacenados (`.sql`), funciones, tablas DDL o semillas en las carpetas `SQL/` **DEBE reflejarse e inyectarse automáticamente en la base de datos activa de Zeus ERP** sin requerir intervención manual ni despliegues por separado.

---

## 2. Herramientas y Comandos de Sincronización

### A. Sincronización Directa / On-Demand
Ejecuta la recompilación e inyección inmediata de la estructura T-SQL (`01_Tables.sql`, `02_Seeds.sql`, `03_Functions_And_SPs.sql`, `ActualizadorSERVER.sql`) contra la base de Zeus ERP configurada en `.env`:

```bash
node deploy/sync_zeus_erp.js
```

### B. Modo Observador / Vigía en Tiempo Real (Watcher)
Activa un observador continuo sobre la carpeta `SQL/`. Cada vez que guardes o modifiques un archivo `.sql` o un Stored Procedure localmente (por ejemplo `SQL/SP/spFacturacionesCrear.sql` o `spCotizacionesCrear.sql`), el script recompila e inyecta los cambios en tiempo real a Zeus ERP:

```bash
node deploy/sync_zeus_erp.js --watch
```

---

## 3. Integración en el Pipeline de Desarrollo (`gen_schema_json.js`)

Cualquier invocación al compilador principal de la plataforma (`node deploy/gen_schema_json.js` o `node scripts/validate_full_suite.js`) incluye automáticamente el paso `[PASO 4.5/5] Sincronización autónoma con la base de datos de Zeus ERP`, garantizando que PostgreSQL local y SQL Server (Zeus ERP) se mantengan con 100% de paridad funcional.

---

## 4. Configuración de Conexión a Zeus ERP (`.env`)

El sincronizador extrae la conexión desde `.env` evaluando las siguientes variables:

```env
DATABASE_URL_SQLSERVER="sqlserver://zeusagencias:zzeusagencias@ZEUSAGENCIAS10:1433;database=Korex_Pruebas;encrypt=false;trustServerCertificate=true"
SQLSERVER_HOST="ZEUSAGENCIAS10"
SQLSERVER_USER="zeusagencias"
SQLSERVER_PASSWORD="zzeusagencias"
SQLSERVER_DB="Korex_Pruebas"
SQLSERVER_PORT=1433
```

---

## 5. Regla de Verificación Post-Desarrollo

Tras finalizar cualquier cambio en procedimientos de facturación, cotizaciones o maestros Zeus:
1. Ejecutar `node deploy/sync_zeus_erp.js` o verificar el log del modo `--watch`.
2. Validar que la compilación e inyección devuelva `Sincronización completada exitosamente en Zeus ERP`.
