---
name: traceability-diagnostics
description: Regla de arquitectura universal y patrones para el registro transversal de trazabilidad, diagnóstico de errores y auditoría técnica multibase (PostgreSQL + SQL Server) en AgenciasNew.
---

# Skill: Trazabilidad y Diagnóstico del Sistema

Este documento contiene las reglas, directivas y patrones de diseño obligatorios para garantizar la **trazabilidad técnica y el diagnóstico de errores** en toda la plataforma AgenciasNew.

---

## 1. Principio Fundamental de Trazabilidad Global Obligatoria

- **REGLA DE ORO DE TRAZABILIDAD GLOBAL**: Si el módulo de trazabilidad está habilitado (`TRACEABILITY_MODE` != `'OFF'`), **TODA transacción funcional ejecutada por el sistema DEBE generar trazabilidad**. No debe existir ninguna transacción invisible, independientemente de que se origine desde la Web, Excel, APIs, Webservices, Integraciones Externas, Procesos Automáticos, SPs o Importaciones/Exportaciones.
- **Niveles de Trazabilidad Configurables** (`TRACEABILITY_MODE` en `SystemParameter`):
  - `OFF`: Desactivado por defecto. Cero sobrecarga de I/O en ejecución normal.
  - `BASIC`: Registra exclusivamente errores no capturados, excepciones y transacciones fallidas.
  - `DETAILED`: Registra acciones del usuario, endpoints invocados y llamadas a SPs principales.
  - `DIAGNOSTIC`: Registra la traza interna paso a paso, duraciones en milisegundos, entradas/salidas enmascaradas, SPs y sub-procesos.

---

## 2. Taxonomía Obligatoria del Origen (`origin`)

Toda traza debe clasificar e identificar obligatoriamente la fuente de la operación:
- `EXCEL`: Cargas masivas desde archivos Excel, complementos o Zeus Excel.
- `WEB`: Operaciones realizadas desde la interfaz web del usuario en Next.js.
- `API`: Consumo de REST APIs, webservices o integraciones de terceros.
- `PROCESO_AUTOMATICO`: Jobs de fondo, crons o sincronizaciones programadas.
- `IMPORTACION`: Procesos masivos de importación de datos.
- `EXPORTACION`: Procesos de exportación o integración ERP (Zeus/SQL Server).
- `BASE_DATOS`: Invocaciones directas de Procedimientos Almacenados y Funciones SQL.

---

## 3. Garantía Multibase Absoluta (PostgreSQL + SQL Server)

- Todo registro de trazabilidad debe funcionar de manera equivalente y 100% nativa en el motor activo (`isSQLServerMode()`):
  - En PostgreSQL: Vía `public.spTraceabilityLog(...)`, `public.spTraceabilityList(...)`, `public.spTraceabilityGetDetails(...)`.
  - En SQL Server: Vía `dbo.spTraceabilityLog(...)`, `dbo.spTraceabilityList(...)`, `dbo.spTraceabilityGetDetails(...)`.
- Queda estrictamente **PROHIBIDO** guardar trazas en un motor diferente al que se encuentra actualmente activo.

---

## 4. Enmascaramiento Obligatorio de Información Sensible

Antes de persistir metadatos o parámetros en la traza, se deben enmascarar automáticamente los siguientes atributos:
- `password`, `clave`, `secret`, `token`, `authorization`, `creditCard`, `cvv`, `pin`, `privateKey`.
- El helper `maskSensitiveData(...)` de `src/lib/traceability.ts` reemplazará estos valores por `***MASKED***`.

---

## 5. Estructura Estándar de la Traza (`TRC-...`)

Cada flujo completo debe reconstruir la cadena:
**Origen → Usuario → Pantalla → Acción → Proceso → SP/API/Servicio → Parámetros Enmascarados → Duraciones (ms) → Resultado (Éxito / Error / Rollback)**

### Tipos de Eventos Soportados:
- `INICIO_PROCESO`, `FIN_PROCESO`, `ACCION_USUARIO`, `CONSULTA`, `INSERT`, `UPDATE`, `DELETE`, `SP_INICIO`, `SP_FIN`, `VALIDACION`, `INTEGRACION`, `API_REQUEST`, `API_RESPONSE`, `TRANSACCION_INICIO`, `TRANSACCION_COMMIT`, `TRANSACCION_ROLLBACK`, `ERROR`, `EXCEPCION`, `ADVERTENCIA`.

