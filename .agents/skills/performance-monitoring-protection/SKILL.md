---
name: performance-monitoring-protection
description: SKILL permanente de arquitectura y protocolo para el monitoreo autónomo, detección de degradaciones, optimización controlada y protección del rendimiento multibase (PostgreSQL + SQL Server) en Korex.
---

# SKILL OBLIGATORIO: MONITOREO AUTÓNOMO, OPTIMIZACIÓN Y PROTECCIÓN DEL RENDIMIENTO
## KOREX – POSTGRESQL + SQL SERVER

---

## 1. OBJETIVO Y FILOSOFÍA

El rendimiento del sistema Korex es un pilar permanente de la calidad del software (junto con la *Compatibilidad Multibase*, el *Aislamiento de Motores* y la *Permanencia de Correcciones*).

Korex cuenta con mecanismos autónomos para detectar:
- Consultas y vistas lentas.
- Procedimientos almacenados (`sp...`) y funciones SQL (`fn...`) lentos.
- Endpoints de API con tiempos de respuesta degradados.
- Crecimiento progresivo del tiempo de ejecución (regresiones respecto a la línea base histórica).
- Índices faltantes con alto impacto proyectado.
- Índices redundantes o sin uso (que penalizan escrituras).
- Crecimiento desmedido de tablas o acumulaciones de registros muertos (`dead tuples`).
- Estadísticas desactualizadas en catálogos del motor.
- Bloqueos persistentes y esperas de transacciones (`locks`/`deadlocks`).

---

## 2. CICLO METODOLÓGICO DE RENDIMIENTO

Todo diagnóstico o intervención de rendimiento debe seguir estrictamente el ciclo cerrado:

```
[ MEDIR ] ──> [ DETECTAR ] ──> [ ANALIZAR ] ──> [ PROPONER ]
    ▲                                                │
    │                                                ▼
[ VOLVER A MEDIR ] <── [ APLICAR SEGURO ] <── [ VALIDAR ] <── [ PROBAR ]
```

1. **MEDIR**: Capturar tiempos reales de ejecución y estado de catálogos/DMVs.
2. **DETECTAR**: Identificar anomalías contra umbrales o contra `.performance_baseline.json`.
3. **ANALIZAR**: Determinar la causa raíz (falta de índice, scan secuencial, contención, query mal optimizado).
4. **PROPONER**: Emitir sugerencias categorizadas por **Impacto** (ALTO/MEDIO/BAJO) y **Riesgo** (ALTO/MEDIO/BAJO).
5. **PROBAR**: Validar en entorno controlado o pruebas automatizadas (`validate_performance_suite.js`).
6. **VALIDAR**: Comprobar que no se degrade ninguna regla de negocio ni resultado funcional.
7. **APLICAR CUANDO SEA SEGURO**: Ejecutar solo optimizaciones permitidas o aprobadas.
8. **VOLVER A MEDIR**: Registrar la nueva marca en la línea base para confirmar la mejora.

---

## 3. LOS 4 MODOS OPERACIONALES DEL MOTOR

El motor (`scripts/korex_performance_engine.js` y `deploy/Korex_Performance_Engine.ps1`) soporta cuatro modos de operación:

| Modo | Acciones Permitidas | Riesgo Operativo |
| :--- | :--- | :--- |
| **`monitor`** | Solo lectura. Mide tiempos, consulta DMVs/catálogos, compara con baseline y genera telemetría. | NULO (100% Seguro) |
| **`recommend`** | Modo `monitor` + Clasificación y emisión de propuestas de optimización de índices y mantenimiento. | NULO (100% Seguro) |
| **`optimize`** | Aplica optimizaciones seguras de bajo riesgo previamente validadas (no destructivas). | BAJO |
| **`maintenance`** | Ejecuta tareas controladas de refresco de estadísticas (`ANALYZE` en PG, `sp_updatestats` en SQL Server). | BAJO |

---

## 4. POLÍTICA DE AUTONOMÍA Y SEGURIDAD

### ✅ Permitido de Forma 100% Autónoma:
- Monitoreo continuo de tiempos de SPs y consultas.
- Consulta de catálogos (`pg_stat_user_tables`, `pg_stat_user_indexes`, `sys.dm_db_missing_index_*`, `sys.dm_tran_locks`).
- Comparación contra línea base `.performance_baseline.json`.
- Generación de reportes interactivos HTML en `Diagnosticos/`.
- Actualización de estadísticas en modo `maintenance` (`ANALYZE`, `sp_updatestats`).

### ⛔ Prohibido de Forma Autónoma (Requiere Aprobación Humana Explícita):
- **PROHIBIDO** ejecutar `DROP INDEX` o `DROP TABLE` automáticamente.
- **PROHIBIDO** crear índices de forma desatendida sin validación previa.
- **PROHIBIDO** modificar la lógica de Procedimientos Almacenados con fines de optimización si esto altera resultados funcionales.
- **PROHIBIDO** ejecutar desfragmentaciones pesadas (`REINDEX`, `ALTER INDEX REBUILD`) en producción sin ventana de mantenimiento.

---

## 5. REGLA ABSOLUTA DE AISLAMIENTO DE MOTORES

- Si el motor activo es **PostgreSQL**: Las consultas, mediciones y mantenimientos se ejecutan EXCLUSIVAMENTE en PostgreSQL (`Korex_colaereo`).
- Si el motor activo es **SQL Server**: Las consultas, DMVs, benchmarks y mantenimientos se ejecutan EXCLUSIVAMENTE en SQL Server (`Korex_Pruebas` / `BaseSQLServer`).
- **QUEDA ESTRICTAMENTE PROHIBIDO** mezclar telemetría o ejecutar comandos en el motor inactivo.

---

## 6. SANITIZACIÓN ESTRICTA DE REPORTES Y TELEMETRÍA

Todo reporte generado (`Diagnosticos/Korex_Rendimiento_*.html`) y cualquier paquete ZIP de soporte DEBE:
- Estar 100% libre de contraseñas, tokens, llaves de API o cadenas de conexión en texto plano.
- Mostrar únicamente métricas operacionales agregadas, nombres de tablas, duraciones en milisegundos y recomendaciones técnicas.

---

## 7. COMANDOS Y SCRIPTS DE EJECUCIÓN

- **Suite de Pruebas de Rendimiento**:
  ```bash
  node scripts/validate_performance_suite.js
  ```
- **Monitoreo Directo (PostgreSQL)**:
  ```bash
  node scripts/korex_performance_engine.js --engine=postgres --mode=recommend
  ```
- **Monitoreo Directo (SQL Server)**:
  ```bash
  node scripts/korex_performance_engine.js --engine=sqlserver --mode=recommend
  ```
- **Wrapper PowerShell**:
  ```powershell
  powershell -ExecutionPolicy Bypass -File deploy/Korex_Performance_Engine.ps1 -Engine postgres -Mode recommend
  ```
- **Mantenimiento Controlado**:
  ```bash
  node scripts/korex_performance_engine.js --engine=postgres --mode=maintenance
  ```
