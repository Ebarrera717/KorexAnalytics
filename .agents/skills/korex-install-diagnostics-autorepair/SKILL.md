---
name: korex-install-diagnostics-autorepair
description: Sistema y regla permanente de instalación, actualización, diagnóstico profundo, autoreparación segura y soporte remoto de Korex para PostgreSQL y SQL Server.
---

# SKILL OBLIGATORIO – INSTALACIÓN, ACTUALIZACIÓN, DIAGNÓSTICO Y AUTOREPARACIÓN DE KOREX (POSTGRESQL + SQL SERVER)

## 1. OBJETIVO Y PRINCIPIO ARQUITECTURAL UNIVERSAL

Garantizar que todo proceso de instalación y actualización de Korex sobre **PostgreSQL** y **SQL Server**:
1. Opere bajo una **separación absoluta de motores**: cada motor cuenta con sus propios ejecutables, scripts, migraciones y validaciones.
2. No se limite a copiar archivos: comprueba de forma integral y end-to-end que la plataforma **realmente funciona**.
3. Incorpore un **motor universal de diagnóstico y autoreparación segura**:
   - Diagnóstico previo y fotografía de estado (ANTES vs DESPUÉS).
   - 11 dominios de validación técnica de extremo a extremo.
   - Detección e investigación exhaustiva de causas raíz (árbol HTTP 502.3, descalce de puertos, ARR, IIS, Windows Services, Base de Datos).
   - Autoreparación segura, controlada y reversible (sin pérdida ni destrucción de datos).
   - Generación de reportes interactivos HTML y paquetes de soporte remoto ZIP sanitizados.

---

## 2. REGLA ABSOLUTA DE SEPARACIÓN Y MATRIZ DE AISLAMIENTO

Los cuatro procesos son estrictamente independientes y no deben unificarse en instaladores híbridos o dinámicos:

| Proceso Generador | Motor Exclusivo | Motor Prohibido | Artefacto Instalador / Actualizador | Script PowerShell Core |
| :--- | :--- | :--- | :--- | :--- |
| `GenerarSetup.bat` | **PostgreSQL** | SQL Server | `Korex_Setup.exe` | `deploy/Setup_Korex_Silent.ps1` |
| `GenerarActualizador.bat` | **PostgreSQL** | SQL Server | `Korex_Update_Setup.exe` | `deploy/Update_Korex.ps1` |
| `GenerarSetupSqlServer.bat` | **SQL Server** | PostgreSQL | `Korex_SQLServer_Setup.exe` | `deploy/Setup_Korex_SQLServer_Silent.ps1` |
| `GenerarActualizadorSqlServer.bat` | **SQL Server** | PostgreSQL | `Korex_SQLServer_Update_Setup.exe` | `deploy/Update_Korex_SQLServer.ps1` |

### Regla de Aislamiento
- Los procesos de **PostgreSQL** únicamente pueden conectarse a PostgreSQL, ejecutar scripts SQL de Postgres y utilizar configuración de Postgres. Queda estrictamente PROHIBIDO consultar, conectarse o modificar SQL Server.
- Los procesos de **SQL Server** únicamente pueden conectarse a SQL Server, ejecutar scripts T-SQL y utilizar configuración de SQL Server. Queda estrictamente PROHIBIDO consultar, conectarse o modificar PostgreSQL.

---

## 3. LOS 11 DOMINIOS DE DIAGNÓSTICO PROFUNDO

Todo instalador y actualizador evalúa obligatoriamente las 11 capas de salud técnica:

```text
               USUARIO / NAVEGADOR
                       ↓
               1. ENTORNO WINDOWS
             (Admin, Disco, Permisos)
                       ↓
               2. NODE.JS & NPM
            (v20+, PATH, Ejecución)
                       ↓
            3. ARCHIVOS & CONFIGURACIÓN
             (.next, .env, web.config)
                       ↓
               4. DEPENDENCIAS
           (node_modules, binarios)
                       ↓
               5. SERVIDOR IIS
             (W3SVC, Sitios, Pools)
                       ↓
             6. ARR & URL REWRITE
          (Proxy enabled, dlls, reglas)
                       ↓
               7. PUERTOS & RED
          (3000, 3001, PID, IPv4/IPv6)
                       ↓
            8. PROCESO KOREX / SERVICIO
          (korex_nextjs, daemon logs)
                       ↓
           9. BASE DE DATOS EXCLUSIVA
         (PG: pg_proc / SQL: dbo sys)
                       ↓
          10. PREVENCIÓN HTTP 502.3
          (Sincronía IIS <-> Backend)
                       ↓
          11. PRUEBA END-TO-END (SMOKE)
           (HTTP 200 y Carga Real)
```

1. **Entorno Windows**: Privilegios de Administrador, espacio libre en disco (mínimo 2 GB), permisos de carpetas y servicios del sistema.
2. **Node.js & npm**: Presencia en PATH, arquitectura de 64 bits, versión compatible (>= v18 / v20 LTS) y prueba de ejecución.
3. **Archivos de Korex**: Verificación de presencia de `package.json`, `web.config`, `.env`, build de Next.js (`.next` o standalone).
4. **Dependencias**: Comprobación de `node_modules` y paquetes esenciales.
5. **Servidor IIS**: Estado del servicio `W3SVC`, creación del sitio web, bindings de puerto y estado del Application Pool.
6. **ARR & URL Rewrite**: Presencia de `rewrite.dll`, `requestRouter.dll`, y proxy inverso habilitado en `appcmd` (`system.webServer/proxy /enabled:True`).
7. **Puertos y Red**: Inspección con `Get-NetTCPConnection` en puertos 3000 (IIS) y 3001 (Node.js backend), identificación de PID y liberación de procesos zombis.
8. **Proceso Korex / Servicio Windows**: Estado del servicio (`Korex_NextJS` o `Korex_SQLServer_Service`), captura de errores de arranque en `daemon/korex_nextjs.err.log` en caso de fallo.
9. **Base de Datos Exclusiva**:
   - **PostgreSQL**: Conectividad TCP al host/puerto, ejecución de consultas, conteo de tablas y procedimientos almacenados.
   - **SQL Server**: Conexión `System.Data.SqlClient`, validación de base existente (**REGLA: NUNCA crear automáticamente la base del cliente con `CREATE DATABASE`**; debe existir o ser restaurada del `.bak`), ejecución de consultas T-SQL y conteo de tablas `dbo`.
10. **Prevención y Diagnóstico de HTTP 502.3**: Sincronización exacta del puerto de reescritura en `web.config` con el puerto real de escucha de Node.js.
11. **Prueba Funcional End-to-End**: Petición HTTP real a `http://localhost:3000/` comprobando respuesta HTTP 200/30x.

---

## 4. PRINCIPIOS DE AUTOREPARACIÓN SEGURA

Las autoreparaciones ejecutadas por `Korex_Diagnostics_Engine.ps1` cumplen con:

$$\text{Segura} + \text{Controlada} + \text{Trazable} + \text{Reversible} + \text{Validada}$$

### Acciones Automáticas Permitidas:
1. **Arranque de servicios detenidos**: Iniciar `W3SVC` o el servicio de Windows de Korex si estaban apagados.
2. **Habilitación de Proxy ARR en IIS**: Ejecutar `appcmd set config -section:system.webServer/proxy /enabled:True`.
3. **Sincronización de puertos en `web.config`**: Corregir automáticamente la URL de reescritura hacia `http://127.0.0.1:<NextjsPort>/{R:1}` si estaba descalzada.
4. **Liberación de puertos huérfanos**: Detener procesos node zombis de sesiones anteriores para liberar el puerto 3000 o 3001.
5. **Descarga e instalación silenciosa de Node.js**: En caso de ausencia total de Node.js en el servidor.
6. **Respaldo preventivo de configuración**: Todo cambio en variables de entorno o archivos genera previamente `.env.bak_YYYYMMDD_HHMMSS`.

### Prohibiciones Absolutas:
- **PROHIBIDO** eliminar, recrear o truncar bases de datos (`DROP DATABASE`, `CREATE DATABASE`).
- **PROHIBIDO** borrar datos operacionales.
- **PROHIBIDO** modificar o consultar el motor contrario.
- **PROHIBIDO** sobrescribir archivos `.env` sin respaldo previo.

---

## 5. GENERACIÓN DE REPORTES Y PAQUETES DE SOPORTE REMOTO

Cada proceso de instalación, actualización o diagnóstico produce:

### 1. Reporte HTML Interactivo (`Korex_Diagnostico_<MOTOR>_<TIMESTAMP>.html`)
- Encabezado con estado global (`SISTEMA SALUDABLE` o `SE REQUIERE ATENCIÓN`).
- Ficha técnica de servidor: SO, Arquitectura, Espacio en disco, Base de datos y Puertos.
- Tabla detallada de pruebas con: ID de Prueba, Nombre, Estado (OK / WARN / ERROR / CRITICAL), Valor Encontrado, Valor Esperado, Acción Realizada, Resultado de Reparación y Acción Manual Requerida.
- Sanitización estricta: **0 contraseñas, tokens o secretos expuestos**.

### 2. Paquete de Soporte Remoto ZIP (`Korex_Diagnostico_<MOTOR>_<TIMESTAMP>.zip`)
Estructura contenida:
- `/Reporte`: Reporte HTML interactivo y log de texto.
- `/Logs`: Logs de instalación, logs de error del daemon y trazas.
- `/Configuracion_Sanitizada`: Archivo `.env.sanitized` (con passwords y secrets ofuscados) y `web.config`.
- `/Resultados_Pruebas`: Archivo `tests_summary.json` para análisis automatizado.
- `/Informacion_Sistema`: `sys_info.json`.
- `/Informacion_IIS`: `iis_info.json`.
- `/Informacion_Node`: `node_info.json`.
- `/Informacion_BaseDatos`: `db_info.json` (sanitizado).

---

## 6. SUITE DE PRUEBAS AUTOMATIZADA

Para validar el cumplimiento continuo de este Skill, se ejecuta la suite automatizada:

```bash
node scripts/validate_installer_diagnostics.js
```

Pruebas cubiertas:
- `TEST-SETUP-PG`: Integridad del instalador PostgreSQL.
- `TEST-UPDATE-PG`: Integridad del actualizador PostgreSQL.
- `TEST-SETUP-SQL`: Integridad del instalador SQL Server.
- `TEST-UPDATE-SQL`: Integridad del actualizador SQL Server.
- `TEST-ISOLATION-PG`: Aislamiento estricto de componentes PostgreSQL.
- `TEST-ISOLATION-SQL`: Aislamiento estricto de componentes SQL Server.
- `TEST-DIAGNOSTIC-ENGINE`: Verificación de los 11 dominios del motor de diagnóstico.
- `TEST-DIAGNOSTIC-PG`: Ejecución y reporte para PostgreSQL.
- `TEST-DIAGNOSTIC-SQL`: Ejecución y reporte para SQL Server.
- `TEST-SANITIZE-SECURITY`: Validación de seguridad y sanitización de secretos.
