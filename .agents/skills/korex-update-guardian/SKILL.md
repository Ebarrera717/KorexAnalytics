---
name: korex-update-guardian
description: SKILL MAESTRO para el sistema de actualización verificable, autocontrolado, autodiagnóstico y reparación de Korex (PostgreSQL + SQL Server).
---

# SKILL MAESTRO — ACTUALIZACIÓN PRODUCTIVA VERIFICABLE, AUTODIAGNÓSTICO Y REPARACIÓN DE KOREX

Este Skill establece la arquitectura obligatoria de **Guardian de Actualización y Diagnóstico Continuo** para Korex. Operar bajo este protocolo garantiza que ningún despliegue o actualización en producción genere un "falso éxito" (exit code 0 con objetos omitted o fallidos).

---

## 1. PRINCIPIO ABSOLUTO DE VERIFICABILIDAD

> **"Una actualización NO es exitosa por el mero hecho de que sus scripts se hayan ejecutado sin lanzar una excepción no capturada. Solamente es EXITOSA cuando se demuestra objeto por objeto que cada tabla, columna, SP, función e índice esperado quedó compilado, activo y coincidente con el Manifest del Release."**

---

## 2. TABLAS DE CONTROL INTERNO DE ACTUALIZACIÓN

Todo servidor Korex (PostgreSQL o SQL Server) DEBE mantener 4 tablas de control estructuradas:

1. `Korex_UpdateHistory`: Registro de cada ejecución del actualizador (Id, Versión anterior, Versión nueva, Build, Motor, Servidor, Base, Usuario, FechaInicio, FechaFin, Estado, ExitCode).
2. `Korex_UpdateObjects`: Registro detallado por objeto (`dbo.spExportInvoices`, `dbo.InvoicesProduct`, etc.) con campos (`ObjectType`, `ObjectName`, `Expected`, `Executed`, `Compiled`, `Validated`, `HashExpected`, `HashActual`, `Status`, `ErrorMessage`).
3. `Korex_UpdateErrors`: Bitácora detallada de errores técnicos ocurridos durante la actualización.
4. `Korex_Installation`: Estado actual de la instalación del servidor (`AppVersion`, `DbVersion`, `Build`, `Motor`, `LastValidationDate`, `Status`).

---

## 3. SISTEMA DE REGISTRO EN TIEMPO REAL OBJETO POR OBJETO

El actualizador debe imprimir en la consola y log cada objeto procesado en formato numerado:
`[001/187] dbo.spExportInvoices ... OK (Compilado y Validado)`

Estados posibles por objeto:
- `OK`: Ejecutado + Compilado + Validado.
- `WARNING`: Advertencia no bloqueante (ej. Tabla ya existía).
- `ERROR`: Fallo de sintaxis, objeto faltante o fallo de compilación.
- `OMITIDO`: Objeto no procesado.

---

## 4. MANIFEST DEL RELEASE (`manifest-sqlserver.json` / `manifest-postgresql.json`)

Cada empaquetado debe incluir el archivo manifest generado por `scripts/generate_release_manifest.js`.
El manifest contiene:
- `releaseVersion`: Versión SemVer (ej. `3.7.13`).
- `build`: Código de compilación (ej. `20260929.01`).
- `engine`: Engine (`SQLServer` o `PostgreSQL`).
- `objects`: Arreglo de objetos requeridos con tipo (`TABLE`, `COLUMN`, `PROCEDURE`, `FUNCTION`), nombre y hash del cuerpo.

---

## 5. EXIT CODES ESTÁNDAR DE KOREX

El script actualizador DEBE devolver un código de salida distinto de 0 ante cualquier inconsistencia:
- `0`: Éxito total (100% de objetos requeridos validados).
- `1`: Error de compilación u objeto obligatorio faltante / fallido.
- `2`: Fallo en la verificación post-instalación.
- `3`: Error de parametrización o archivo manifest ausente.
- `4`: Error de conexión a la base de datos.
- `5`: Rollback ejecutado.

---

## 6. HERRAMIENTA DE DIAGNÓSTICO Y AUTO-REPARACIÓN (`scripts/korex_diagnostico.js`)

El sistema incluye una CLI ejecutable y módulo de UI para diagnóstico y autoreparación:
1. `node scripts/korex_diagnostico.js --status`: Reporta el estado de la versión instalada vs manifest.
2. `node scripts/korex_diagnostico.js --validate`: Inspecciona objeto por objeto en `sys.objects` / `pg_proc` y compara hashes.
3. `node scripts/korex_diagnostico.js --repair`: Aplica parches y recompila SPs descalzados sin tocar datos de tablas.
4. `node scripts/korex_diagnostico.js --report-zip`: Exporta el archivo `KOREX-DIAG-YYYYMMDD-XXXXXX.zip` excluyendo contraseñas y secreciones de `.env`.

---

## 7. HEALTH CHECK EN EL ARRANQUE DE LA APLICACIÓN

El backend Next.js (`src/lib/health-check.ts`) verifica al iniciar que la versión de `package.json` sea compatible con `DbVersion` en `Korex_Installation`. Si la base de datos no está actualizada a la versión correspondiente del código, registra un warning y alerta al administrador.
