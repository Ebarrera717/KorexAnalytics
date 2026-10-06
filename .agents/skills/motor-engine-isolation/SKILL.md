---
name: motor-engine-isolation
description: Regla de arquitectura permanente de aislamiento absoluto de motores de base de datos (PostgreSQL vs SQL Server). Cuando un motor está activo, el 100% de las operaciones, transacciones, SPs, importaciones, CRUDs, consultas y reportes deben ejecutarse de forma única y aislada en ese motor, sin tocar ni consultar ni sincronizar el otro motor.
---

# SKILL OBLIGATORIO: Aislamiento de Motores de Base de Datos (PostgreSQL + SQL Server)

## 1. Objetivo y Regla de Oro
- **UN MOTOR ACTIVO = UNA ÚNICA INFRAESTRUCTURA DE DATOS.**
- PostgreSQL y SQL Server son plataformas oficialmente soportadas en AgenciasNew. Sin embargo, en cualquier momento durante la ejecución del sistema o aplicación (identificado por `isSQLServerMode()`, `DATABASE_PROVIDER`, etc.), **el 100% de la lógica de negocio, consultas, SPs, funciones, importaciones masivas, exportaciones, transacciones y reportes DEBE ejecutarse única y exclusivamente sobre el motor seleccionado**.
- **PROHIBICIÓN ABSOLUTA DE REPLICACIÓN O CRUZADO INVOLUNTARIO**: Queda estrictamente prohibido conectarse, insertar, actualizar, eliminar, consultar o ejecutar SPs en PostgreSQL cuando la aplicación esté en modo SQL Server, y viceversa. La configuración dual en el proyecto existe para soportar ambas infraestructuras de forma independiente, NUNCA para sincronizar o ejecutar operaciones en ambos motores al mismo tiempo durante el flujo de trabajo normal.

---

## 2. Diagrama de Aislamiento de Arquitectura

```text
                    APLICACIÓN NEXT.JS / API
                                │
                                ▼
                        MOTOR SELECCIONADO (`isSQLServerMode()`)
                                │
                     ┌──────────┴──────────┐
                     ▼                     ▼
              PostgreSQL                SQL Server
                     │                     │
                     ▼                     ▼
               SOLO PostgreSQL        SOLO SQL Server
             (Sin tocar SQL Server)  (Sin tocar PostgreSQL)
```

---

## 3. Directivas de Aislamiento por Motor

### A. Ejecución en Modo SQL Server (`isSQLServerMode() === true`)
- **Conexión & Consultas**: Utilizar únicamente la conexión activa T-SQL (`getSQLServerConnection()`, `executeSQLServerProcedure()`).
- **Lógica de Negocio & SPs**: Ejecutar únicamente Procedimientos Almacenados T-SQL en `dbo.*` (`dbo.spInvoicesCrear`, `dbo.spInvoicesObtener`, `dbo.spImportInvoices`, etc.).
- **Prohibido**: Ejecutar `prisma.$queryRaw`, llamadas a PostgreSQL `public.sp*`, o realizar escrituras en Postgres local cuando la aplicación está configurada en SQL Server.

### B. Ejecución en Modo PostgreSQL (`isSQLServerMode() === false`)
- **Conexión & Consultas**: Utilizar únicamente Prisma ORM / PostgreSQL Client (`prisma.$queryRaw`, `public.*`).
- **Lógica de Negocio & SPs**: Ejecutar únicamente Procedimientos Almacenados PostgreSQL en `public.*` (`public.spInvoicesCrear`, `public.spImportInvoices`, etc.).
- **Prohibido**: Abrir conexiones a SQL Server (`getSQLServerConnection`), ejecutar SPs T-SQL o realizar escrituras en SQL Server cuando la aplicación está configurada en PostgreSQL.

---

## 4. Importaciones Masivas, CRUDs y Transacciones
- Toda importación masiva (Excel `/api/invoices/import`, `/api/quotations/import`) o mutación de negocio en modo SQL Server debe ejecutar directamente el procedimiento nativo de importación T-SQL en SQL Server (`dbo.spImportInvoices` / `dbo.spImportQuotations`) sin pasar por PostgreSQL.
- Las transacciones de negocio deben iniciar y terminar en una sola infraestructura de datos.

---

## 5. Excepción Única de Testing Comparativo (`automated-multidb-testing`)
- Únicamente en los scripts de testing automatizado ejecutable (`node scripts/validate_full_suite.js`), se permite ejecutar pruebas independientes consecutivas en ambos motores para verificar la paridad funcional.
- Las pruebas se ejecutan como dos pasadas totalmente independientes: primero 100% sobre PostgreSQL y luego 100% sobre SQL Server, comparando únicamente sus salidas resultantes.

---

## 6. Separación Total de Instaladores y Actualizadores (`separacion-instaladores-actualizadores`)
- Los instaladores y actualizadores son 100% independientes por motor desde la generación hasta la ejecución:
  - **PostgreSQL**: `GenerarSetup.bat` / `GenerarActualizador.bat` (Exclusivo PostgreSQL).
  - **SQL Server**: `GenerarSetupSqlServer.bat` / `GenerarActualizadorSqlServer.bat` (Exclusivo SQL Server).
- Prohibidos los instaladores híbridos o de selección dinámica.
- Ver detalles completos en el Skill [`separacion-instaladores-actualizadores`](file:///f:/Proyectos/AgenciasNew/.agents/skills/separacion-instaladores-actualizadores/SKILL.md).

---

## 7. Checklist Obligatorio de Verificación Pre-Entrega
- [ ] ¿Identificó la variable/función de motor activo (`isSQLServerMode()`)?
- [ ] En modo SQL Server: ¿Se garantizó que NO se invoca ningún SP de PostgreSQL ni `prisma.$queryRaw` de escritura/lectura?
- [ ] En modo PostgreSQL: ¿Se garantizó que NO se abre conexión ni se ejecuta ningún SP T-SQL en SQL Server?
- [ ] ¿Se validó que las transacciones y operaciones de importación sean 100% nativas al motor seleccionado?
- [ ] ¿Se respetó la separación estricta de instaladores y actualizadores por motor según su matriz correspondiente?
- [ ] ¿Se verificó que los cambios no degraden ni sobrescriban correcciones protegidas en ninguno de los dos motores?

