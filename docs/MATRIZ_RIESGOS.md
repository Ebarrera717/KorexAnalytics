# MATRIZ DE RIESGOS Y MITIGACIÓN - KOREX ANALYTICS

---

## 1. IDENTIFICACIÓN Y EVALUACIÓN DE RIESGOS

| ID | Riesgo Identificado | Probabilidad | Impacto | Estrategia de Mitigación |
|---|---|---|---|---|
| **RSK-01** | **Acoplamiento accidental con AgenciasNew** (consumir BD o `.env` de Agencias). | Baja | Crítico | Validación automatizada en CI/CD que detecte cadenas de conexión o variables compartidas. |
| **RSK-02** | **Ejecución contra base de datos incorrecta** (descalce Servidor A vs Base B). | Media | Alto | Validación obligatoria en dos pasos: backend coteja `allowedDatabases` y verifica `SELECT DB_NAME()` en sesión antes de ejecutar el SP. |
| **RSK-03** | **Exposición de contraseñas de SQL Server en logs o UI**. | Baja | Crítico | Cifrado AES-256 en almacenamiento y sanitización transversal (`***MASKED***`) en todos los endpoints y loggers. |
| **RSK-04** | **Bloqueo o timeout en SPs de larga duración**. | Media | Medio | Timeout controlado por configuración (`requestTimeout`), soporte para streaming/paginación y cancelación limpia de peticiones. |
| **RSK-05** | **Inyección SQL por parámetros no controlados**. | Baja | Crítico | Uso estricto de parámetros tipados en `mssql.Request.input()` y validación previa contra `sys.parameters`. |
| **RSK-06** | **Degradación de rendimiento por volumen de datos**. | Media | Medio | Índices optimizados en `ExecutionRun`, límites configurables de registros devueltos (`MaxRecordsLimit`) y exportación asíncrona. |
