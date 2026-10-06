---
name: control-integral-liberacion-db
description: SKILL OBLIGATORIA — Control integral de generación, liberación y validación de objetos de base de datos (PostgreSQL y SQL Server) para garantizar que ningún SP, función o tabla quede fuera de la generación, distribución, instalación o actualización a producción.
---

# SKILL OBLIGATORIA — CONTROL INTEGRAL DE GENERACIÓN, LIBERACIÓN Y VALIDACIÓN DE OBJETOS DE BASE DE DATOS

## 1. Objetivo

Garantizar que ningún objeto de base de datos desarrollado, modificado o corregido en Korex pueda quedar fuera de la generación, instalación, actualización o distribución hacia producción.

Esta SKILL aplica independientemente del mecanismo utilizado para llevar los cambios a producción:
* Instalador (`GenerarSetup.bat`, `GenerarSetupSqlServer.bat`).
* Actualizador (`GenerarActualizador.bat`, `GenerarActualizadorSqlServer.bat`).
* Generador de SPs (`Generar_Sps_Sqlserver.bat`, `deploy/gen_tsql_sps_and_functions.js`, `deploy/gen_postgres_sps_and_functions.js`).
* Generación de scripts individuales.
* Copia manual de scripts.
* Ejecución manual de objetos.
* Procesos automatizados de despliegue.
* Cualquier mecanismo futuro de distribución de objetos de base de datos.

El objetivo es eliminar de raíz situaciones en las que:
> *El objeto existe y funciona en desarrollo, pero no fue generado, no fue incluido en el paquete o no llegó a producción.*

---

## 2. Fuente Única de Verdad (`RELEASE GUARDIAN`)

El sistema dispone de un componente centralizado e inmutable (`scripts/korex_database_release_guardian.js`) como **Fuente Única de Verdad** para todos los mecanismos de liberación.

```text
                         ┌────────────────────┐
                         │  RELEASE GUARDIAN  │
                         │                    │
                         │ Inventario Real BD │
                         │ Inventario Fuentes │
                         │ Comparación & Diff │
                         │ Hash / Versión     │
                         │ Manifests JSON     │
                         │ Validación Bloqueo │
                         └─────────┬──────────┘
                                   │
             ┌─────────────────────┼─────────────────────┐
             │                     │                     │
             ▼                     ▼                     ▼
        INSTALADOR            ACTUALIZADOR          GENERADOR SP
             │                     │                     │
             ▼                     ▼                     ▼
         Producción            Producción           Copia directa
```

Este inventario se construye y concilia obligatoriamente a partir de 3 pilares:
1. **La estructura real de la base de datos de desarrollo activa** (SQL Server `Korex_pruebas` / PostgreSQL `Korex_colaereo`).
2. **Los archivos fuente SQL del proyecto** (escaneados en todas las carpetas configuradas).
3. **El manifiesto de release** (`SQL/manifest-sqlserver.json` y `SQL/manifest-postgresql.json`).

Los tres elementos deben ser comparados y coincidir al 100% antes de permitir cualquier liberación.

---

## 3. Inventario Obligatorio de Objetos

El proceso detecta e inventaría todos los objetos que forman parte de Korex:

### SQL Server (`dbo.*`)
* Tables (DDL).
* Columns.
* Primary Keys & Foreign Keys.
* Indexes & Unique Constraints.
* Views.
* Functions (`dbo.fn*`).
* Stored Procedures (`dbo.sp*`).
* Triggers & Sequences.
* Semillas y Tablas de Control (`Korex_UpdateHistory`, `Korex_UpdateObjects`, `Korex_Installation`, `Korex_UpdateErrors`).

### PostgreSQL (`public.*`)
* Tables (DDL).
* Columns.
* Primary Keys & Foreign Keys.
* Indexes & Unique Constraints.
* Views.
* Functions (`public.fn*`).
* Procedures (`public.sp*`).
* Triggers & Sequences (`nextval`).
* Semillas y Tablas de Control.

---

## 4. Escaneo Multi-Fuente (No Depender de una Sola Carpeta)

El generador de procedimientos y objetos de base de datos DEBE buscar los objetos en **todas las ubicaciones fuente válidas** del proyecto:
* `SQL/SqlServer/`
* `SQL/SqlServer/SP/`
* `SQL/SqlServer/Function/`
* `SQL/PostgreSQL/`
* `SQL/PostgreSQL/SP/`
* `SQL/PostgreSQL/Function/`
* `SQL/PostgreSQL/Table/`
* `SQL/SP/`
* `SQL/Function/`
* `SQL/Procedure/`
* `SQL/Table/`
* `SQL/ZeusERP/` (para procedimientos exclusivos de integración externa)

Queda estrictamente prohibido que un generador limite su búsqueda a una sola ruta fija omitiendo objetos ubicados en otras subcarpetas.

---

## 5. Comparación Obligatoria entre Base de Datos y Fuentes

Antes de generar cualquier SP o script de release, el Guardian ejecuta la conciliación:

```text
BASE DE DATOS DESARROLLO
          │
          ▼
INVENTARIO REAL
          │
          ├──────────────┐
          ▼              ▼
ARCHIVOS SQL         MANIFEST
          │              │
          └──────┬───────┘
                 ▼
             COMPARAR
```

### Casos de Control:
* **Caso 1 — Objeto en BD pero no en archivos fuente**: Error bloqueante. El objeto debe documentarse en los archivos fuente SQL.
* **Caso 2 — Archivo existe pero objeto no existe en BD**: Error bloqueante o advertencia obligatoria de despliegue.
* **Caso 3 — Objeto existe en ambos pero con diferencias de contenido/hash**: Bloqueo de liberación hasta sincronizar la versión definitiva.

---

## 6. Validación Previa y Control de Conteo Estricto

El generador debe comprobar obligatoriamente la regla de conteo exacto:

$$\text{Objetos Detectados} = \text{Objetos Esperados} = \text{Objetos Generados} = \text{Objetos en Manifest}$$

Si existe cualquier discrepancia (ej. Detectados 128 vs Generados 127), el proceso finaliza inmediatamente con:
```text
GENERATION FAILED
EXIT CODE: 1
```
indicando con precisión el nombre y tipo del objeto faltante.

---

## 7. Identificación Única y Hash de Cada Objeto

Cada objeto liberado se identifica inequívocamente mediante:
* Motor (`SQLSERVER` / `POSTGRESQL`).
* Schema (`dbo` / `public`).
* Tipo (`PROCEDURE`, `FUNCTION`, `TABLE`, `VIEW`, `INDEX`, `CONSTRAINT`).
* Nombre (`spInvoicesCrear`, `fnQuitarEspeciales`, etc.).
* Versión y Build (`3.7.13 / 20261003.01`).
* Hash SHA-256 normalizado de su definición.

---

## 8. Manifiestos Obligatorios de Release

Se generan y mantienen actualizados en cada compilación:
* [`SQL/manifest-sqlserver.json`](file:///f:/Proyectos/AgenciasNew/SQL/manifest-sqlserver.json)
* [`SQL/manifest-postgresql.json`](file:///f:/Proyectos/AgenciasNew/SQL/manifest-postgresql.json)
* [`SQL/SqlServer/manifest-sps.json`](file:///f:/Proyectos/AgenciasNew/SQL/SqlServer/manifest-sps.json)

---

## 9. Validación Posterior en Producción (`KorexValidator` / `Korex Update Guardian`)

En producción, el operador o el instalador ejecuta la validación automatizada (`ValidarKorex.bat` / `node scripts/korex_updater_guardian.js`):
* Comprueba que el 100% de los objetos del manifiesto existan en el servidor de destino.
* Detecta objetos faltantes (`MISSING`), desactualizados (`OUTDATED`) o con errores de sintaxis (`INVALID`).
* Registra el resultado en `Korex_UpdateHistory` y `Korex_UpdateObjects`.

---

## 10. Regla Fundamental de Aprobación

> **"Ningún SP, función, tabla u objeto de BD se considera liberado hasta que el sistema haya demostrado que existe en el inventario de desarrollo, está incluido en el paquete de liberación y puede ser identificado posteriormente en producción."**
