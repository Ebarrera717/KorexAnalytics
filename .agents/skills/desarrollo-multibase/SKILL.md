---
name: desarrollo-multibase
description: Regla de arquitectura permanente y checklist obligatorio para garantizar que todo desarrollo, SP, función, tabla, API o consulta sea diseñado, implementado y probado simultáneamente en PostgreSQL y SQL Server, con selección de motor dual en desarrollo local y separación estricta de instaladores en clientes.
---

# SKILL OBLIGATORIO: Desarrollo Multibase PostgreSQL + SQL Server

**Frase Clave de Arquitectura**:
> *"PostgreSQL y SQL Server son plataformas oficialmente soportadas. Todo cambio futuro debe diseñarse, implementarse y validarse para ambas desde el inicio. Ningún desarrollo se considera terminado si solo funciona en uno de los dos motores."*

---

## 1. Objetivo
El proyecto debe soportar de manera permanente y simultánea dos motores de base de datos:
1. **PostgreSQL** (Desarrollo local / Base local)
2. **Microsoft SQL Server** (Producción / Directo)

Esta configuración debe existir tanto en el **ambiente local de desarrollo** como en los **instaladores destinados a clientes**, pero con comportamientos totalmente diferenciados según el escenario.

La arquitectura actual de PostgreSQL en producción **NO debe ser modificada ni afectada**.

---

## 2. Ambiente Local de Desarrollo Dual

El proyecto local está configurado para conectarse tanto a PostgreSQL como a SQL Server:

```text
PostgreSQL
+
SQL Server
```

Ambas conexiones residen en la configuración del proyecto. El desarrollador no debe modificar código fuente para cambiar de motor.

---

## 3. Selección del Motor al Ejecutar el Proyecto (`iniciar-next.bat`)

Al ejecutar el proyecto localmente a través de `iniciar-next.bat`, se presenta un menú interactivo previo a la conexión:

```text
==========================================================
       PLATAFORMA AGENCIASNEW - SELECCION DE MOTOR        
==========================================================

 [1] PostgreSQL (Base Local Korex_colaereo)
 [2] SQL Server (Base Producción ZEUSAGENCIAS10 / Directo)

Seleccione el motor de base de datos [1 o 2]:
```

- **Selección (1) PostgreSQL**: Configura `.env` con `DATABASE_PROVIDER="postgresql"`, ejecuta `npx prisma db pull` y `npx prisma generate`, e inicia Next.js.
- **Selección (2) SQL Server**: Configura `.env` con `DATABASE_PROVIDER="sqlserver"`, **omite `prisma db pull`** (evitando el Error P1013 de Prisma CLI), ejecuta `npx prisma generate` e inicia Next.js con el conector nativo T-SQL (`mssql`).

---

## 4. No Duplicar la Aplicación

Debe existir una única aplicación:

```text
UNA APLICACIÓN
      │
      ├── PostgreSQL
      │
      └── SQL Server
```

La lógica de negocio es común en Next.js/React. Únicamente varía la capa de acceso a datos según el proveedor (`if (isSQLServerMode())`).

---

## 5. Configuración Separada (`.env`)

```env
DATABASE_PROVIDER="postgresql" # o "sqlserver"
DATABASE_URL="postgresql://postgres:zzeusagencias@192.168.80.26:5432/Korex_colaereo?schema=public"
DATABASE_URL_POSTGRES="postgresql://postgres:zzeusagencias@192.168.80.26:5432/Korex_colaereo?schema=public"
DATABASE_URL_SQLSERVER="sqlserver://ZEUSAGENCIAS10:1433;database=Korex_Pruebas;user=zeusagencias;password=zzeusagencias;encrypt=false;trustServerCertificate=true"
```

---

## 6. Validación de Conexión Previas
Antes de iniciar completamente la aplicación, la capa de infraestructura valida:
- **PostgreSQL**: Servidor disponible, puerto 5432, base `Korex_colaereo`, credenciales y estructura compatible.
- **SQL Server**: Servidor disponible, puerto/instancia 1433, base `Korex_Pruebas`, credenciales y estructura compatible.

---

## 7. SQL Server – Base de Datos Inicial y Regla de Instalador

### EL INSTALADOR SQL SERVER NO DEBE CREAR AUTOMÁTICAMENTE LA BASE DE DATOS.
La infraestructura del cliente o el administrador de base de datos restaura previamente el backup inicial.

### Entregable Backup SQL Server Inicial en Blanco (`.BAK`)
Existe un proceso automatizado independiente (`scripts/validate_full_suite.js` / `deploy/gen_sqlserver_initial_bak.js`) que empaqueta la base limpia:
```text
Korex_SQLServer_Inicial_1.0.bak
```
Este archivo contiene la estructura completa (tablas DDL, SPs, funciones, vistas y semillas maestras) sin datos operativos del cliente.

---

## 8. Separación Estricta de Instaladores para Clientes

```text
                    PROYECTO
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
     INSTALADOR PG          INSTALADOR SQL
            │                     │
            ▼                     ▼
       PostgreSQL             SQL Server
```

- **Instalador PostgreSQL**: Solamente configura PostgreSQL.
- **Instalador SQL Server**: Solamente configura SQL Server. Valida la base existente pero **nunca crea la base ni instala/modifica PostgreSQL**.
- **Nunca permitir que un instalador de cliente intente cambiar o instalar el otro motor.**

---

## 9. Testing Multibase (`npm run test:full` / `validate_full_suite.js`)

El sistema automatizado de testing permite seleccionar:
1. PostgreSQL
2. SQL Server
3. Ambos (Modo Comparativo)

Al seleccionar **Ambos**, la suite ejecuta las 11 capas de seguridad comparando de manera exacta los datos, conteos y totales financieros.

---

## 10. Regla de Oro Permanente

> **EN DESARROLLO LOCAL DEBEN EXISTIR Y PODER UTILIZARSE LOS DOS MOTORES.**  
> **EN INSTALACIONES DE CLIENTE SOLAMENTE DEBE UTILIZARSE EL MOTOR CORRESPONDIENTE AL INSTALADOR EJECUTADO.**

```text
LOCAL
 ├── PostgreSQL
 └── SQL Server

CLIENTE - INSTALADOR POSTGRESQL
 └── PostgreSQL

CLIENTE - INSTALADOR SQL SERVER
 └── SQL Server
```

---

## 11. Patrones Obligatorios de Resiliencia T-SQL y Paridad Multibase

1. **Typed Parameter Binding (`src/lib/sqlserver.ts`)**:
   - `executeSQLServerProcedure` inspecciona dinámicamente el tipo de cada parámetro.
   - Parámetros numéricos enteros usan `mssql.Int`, decimales/flotantes usan `mssql.Float`, booleanos usan `mssql.Bit`, y nulos usan `null`.
2. **Validación Segura de Llaves Foráneas (FK) en SPs**:
   - Antes de realizar inserciones o actualizaciones en procedimientos almacenados (`spCotizacionCrear`, `spFacturacionesCrear`, etc.), se debe verificar si los IDs relacionados existen en la tabla maestra. Si no existen en el catálogo local, el SP asigna automáticamente `NULL` para evitar violaciones de clave foránea.
3. **Reseteo Automático de Consecutivos (IDs)**:
   - Al eliminar registros en SPs (`sp...Eliminar`), se valida si la tabla quedó vacía (`IF NOT EXISTS (SELECT 1 FROM dbo.[Quotation])`). De ser así, se ejecuta `DBCC CHECKIDENT ('dbo.[Quotation]', RESEED, 0);` en SQL Server y se reinicia la secuencia en PostgreSQL para garantizar que el siguiente registro inicie en **ID #1**.
4. **Resiliencia de DDL y Defectos Numéricos**:
   - Todos los campos numéricos en DDL T-SQL (`01_Tables.sql`) deben declarar `FLOAT NULL CONSTRAINT DF_... DEFAULT 0` e `INT NULL` en llaves foráneas optativas.

---

## 12. Regla Crítica de Aislamiento de Motores y Protección Absoluta de Bases de Datos

1. **Aislamiento Estricto de Motor Activo**:
   - Cuando el sistema opera en un motor seleccionado (`isSQLServerMode()`), el 100% de las operaciones, transacciones, SPs, mutaciones, consultas y reportes DEBEN ejecutarse exclusivamente en ese motor activo.
   - Queda **estrictamente PROHIBIDO** conectarse, consultar, modificar, inyectar o alterar el motor que no se encuentra activo (siguiendo el Skill [`motor-engine-isolation`](file:///f:/Proyectos/AgenciasNew/.agents/skills/motor-engine-isolation/SKILL.md)).

2. **Protección Absoluta Contra Operaciones Destructivas**:
   - Queda estrictamente **PROHIBIDO** ejecutar `DROP DATABASE`, `DROP SCHEMA`, `DROP TABLE` con datos existentes, `TRUNCATE` masivo o scripts de reinicialización destructivos sobre la **Base Principal de Korex (`.env`)** o sobre la **Base Externa Protegida (`ZeusAgencias_23`)**.
   - Todo cambio de esquema o migración debe ser incremental y no destructivo (`ALTER TABLE`, `ADD COLUMN`, `CREATE INDEX`, `CREATE PROCEDURE`, `CREATE FUNCTION`), preservando el 100% de la información operativa existente (siguiendo las directivas del Skill [`db-protection-security`](file:///f:/Proyectos/AgenciasNew/.agents/skills/db-protection-security/SKILL.md)).

