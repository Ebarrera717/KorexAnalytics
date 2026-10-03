# MÓDULO DE EJECUCIONES Y TRAZABILIDAD - KOREX ANALYTICS

---

## 1. DESCRIPCIÓN Y RESPONSABILIDADES

El módulo de **Ejecuciones** es el núcleo operativo de Korex Analytics. Permite parametrizar, lanzar, monitorear y auditar la ejecución de Stored Procedures y consultas analíticas sobre bases de datos SQL Server configurables.

---

## 2. ESTADOS DE UNA EJECUCIÓN

| Estado | Token / Color | Icono | Descripción |
|---|---|---|---|
| **PENDIENTE** | `status-pending` / Azul medio | `<Clock />` | La ejecución está registrada en cola y pendiente de iniciar conexión. |
| **EN EJECUCIÓN** | `status-running` / Turquesa | `<RefreshCw className="animate-spin" />` | Proceso activo ejecutándose contra SQL Server. |
| **FINALIZADA** | `status-success` / Verde esmeralda | `<CheckCircle2 />` | Ejecución completada con éxito. Datos y métricas consolidadas. |
| **ERROR** | `status-error` / Rojo carmesí | `<AlertCircle />` | Falla técnica capturada (timeout, error sintáctico, permisos). |
| **CANCELADA** | `status-cancelled` / Gris neutro | `<XCircle />` | Ejecución abortada manualmente por el usuario o administrador. |

---

## 3. TRAZABILIDAD COMPLETA (`TRC-XXXX`)

Cada ejecución genera un registro inmutable en `ExecutionRun` con los siguientes campos:

1. `traceId`: Identificador único (`TRC-YYYYMMDD-XXXXXX`).
2. `userId` / `userName`: Usuario responsable.
3. `profileId` / `serverHost`: Servidor SQL Server utilizado.
4. `databaseName`: Base de datos destino exacta.
5. `spName`: Stored procedure ejecutado.
6. `parametersPayload`: JSON con los parámetros enviados (sin contraseñas).
7. `status`: Estado final de la ejecución.
8. `startTime`, `endTime`, `durationMs`: Métricas temporales de rendimiento.
9. `recordsCount`: Cantidad de filas devueltas o afectadas.
10. `errorMessage` / `errorDetails`: Detalle técnico seguro en caso de falla.

---

## 4. PRESETS Y CONFIGURACIÓN DE COLUMNAS

Los usuarios pueden guardar configuraciones reutilizables:
- **Filtros Favoritos**: Valores precargados de fechas, clientes, códigos.
- **Configuración de Columnas**: Reordenamiento de columnas, renombrado de encabezados (`customLabel`) y visibilidad (`visible: true/false`).
- **Totales y Agregaciones**: Selección de columnas numéricas para cálculo de suma/promedio automático en el pie de tabla.
