---
name: automated-multidb-testing
description: Sistema y protocolo automatizado de pruebas multibase (PostgreSQL + SQL Server) para validar la equivalencia funcional de datos, SPs, funciones, APIs, maestros, transacciones y generar informes ejecutables comparativos.
---

# SKILL OBLIGATORIO: Sistema Automatizado de Testing Multibase PostgreSQL + SQL Server

**Frase Clave de Arquitectura**:
> *"Todo cambio o requerimiento debe contar con su prueba automatizada ejecutable y ser validado en PostgreSQL y SQL Server. El desarrollo solo se considerará completado cuando ambas infraestructuras pasen las pruebas con 100% de coincidencia en resultados."*

---

## 1. Objetivo
Implementar y ejecutar un sistema automatizado de pruebas que permita validar autónomamente que la aplicación funciona correctamente sobre:
- **PostgreSQL** (Base local / Desarrollo)
- **SQL Server** (Producción / Directo)

El objetivo es detectar de forma automatizada:
- Errores en procedimientos almacenados (SPs) y funciones SQL.
- Diferencias de comportamiento o totales financieros entre motores.
- Fallas en creación, actualización o eliminación de Maestros (`TAB_CONFIG`).
- Errores en generación de movimientos, consecutivas, cotizaciones y facturas.
- Errores de transacciones (`BEGIN`, `COMMIT`, `ROLLBACK`).
- Regresiones funcionales en endpoints y APIs Backend.
- Generación de informe comparativo de resultados (`summary.json`, matriz comparativa).

---

## 2. Flujo de Prueba Multibase Obligatorio

```
                    REQUERIMIENTO / CAMBIO
                              │
                              ▼
                      SISTEMA DE TESTING
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
        PostgreSQL                         SQL Server
        (Test DB)                          (Test DB)
             │                                 │
             ▼                                 ▼
       Pruebas DB & API                  Pruebas DB & API
             │                                 │
             └────────────────┬────────────────┘
                              ▼
                         COMPARACIÓN
                              │
                              ▼
                    MATRIZ DE RESULTADOS
                              │
                              ▼
                     INFORME (PASS / FAIL)
```

---

## 3. Infraestructura y Aislamiento de Pruebas
- Las pruebas automatizadas deben ejecutarse sobre bases de datos de prueba o ambientes de pruebas aislados.
- **Queda estrictamente prohibido ejecutar pruebas destructivas o de limpieza sobre bases de datos reales de clientes en producción.**
- Credenciales manejadas mediante variables de entorno (`.env`).

---

## 4. Estructura de Catálogo de Pruebas (`/tests`)

```
/scripts
    validate_full_suite.js      # Validador principal multibase (11 capas)
    test_multidb_runner.js      # Runner ejecutor de pruebas comparativas

/tests
    /database
        /maestros               # Pruebas CRUD sobre Maestros (Clientes, Vendedores, Sucursales, etc.)
        /movimientos            # Pruebas de Cotizaciones, Pre-Cotizaciones y Facturación
        /sp_functions           # Pruebas de firmas, parámetros y retorno de SPs/Funciones
        /transactions           # Pruebas de Rollback y manejo de excepciones
    /comparison
        compare_results.js      # Comparador numérico y de conjuntos de datos PG vs SQL Server
    /reports
        generate_report.js      # Generador de informes de ejecución
```

---

## 5. Pruebas de Maestros (CRUD Multibase)

Cada maestro agregado o modificado en `/dashboard/settings` debe probarse en ambos motores:

1. **Crear**:
   - Insertar registro de prueba (`TEST_MAESTRO_001`).
   - Validar respuesta HTTP 200/201.
   - Validar inserción en PG (`public."Master"`) y SQL Server (`dbo.[Master]`).
2. **Actualizar**:
   - Modificar atributos (`name`, `inactivo`, etc.).
   - Consultar API o función de listado.
   - Validar que el valor sea idéntico en ambos motores.
3. **Eliminar / Inhabilitar**:
   - Cambiar estado o eliminar.
   - Validar integridad relacional y ausencia de registros huérfanos.

---

## 6. Pruebas de Movimientos y Financieras
- **Generación de Movimiento**: Cotizaciones / Facturas.
- **Totales**: Validar que la suma de tarifas netas, impuestos, adicionales, comisiones y total a facturar sea exacto.
- **Tolerancia Numérica**: Tolerancia máxima de centavos (`0.01`) para evitar falsos negativos por redondeo en punto flotante. Si la diferencia excede la tolerancia, se marca como **ERROR CRÍTICO**.
- **Consecutivos**: Validar que el incremento de consecutivos no genere colisiones.

---

## 7. Pruebas Transaccionales y Manejo de Errores (`ROLLBACK`)
- Validar caso exitoso: `BEGIN TRANSACTION` -> Inserción cabecera -> Inserción detalles -> `COMMIT` -> Registro creado.
- Validar caso fallido (Prueba Negativa): `BEGIN TRANSACTION` -> Inserción cabecera -> Error provocado en detalles -> `ROLLBACK` -> Validar 0 registros huérfanos.

---

## 8. Matriz Comparativa y Formato de Informe

Al finalizar la suite de pruebas, el runner genera una matriz comparativa:

```
========================================================================
             MATRIZ DE RESULTADOS DE PRUEBA MULTIBASE                   
========================================================================
┌─────────┬──────────────────────────┬────────────┬────────────┬──────────┐
│ ID      │ Prueba                   │ PostgreSQL │ SQL Server │ Resultado│
├─────────┼──────────────────────────┼────────────┼────────────┼──────────┤
│ TEST-01 │ Conexión & Estructura     │ ✅ PASS    │ ✅ PASS    │ PASS     │
│ TEST-02 │ Crear Maestro de Prueba  │ ✅ PASS    │ ✅ PASS    │ PASS     │
│ TEST-03 │ spMenuListar             │ ✅ PASS    │ ✅ PASS    │ PASS     │
│ TEST-04 │ Totalización Movimiento  │ ✅ PASS    │ ✅ PASS    │ PASS     │
│ TEST-05 │ Prueba Transaccional     │ ✅ PASS    │ ✅ PASS    │ PASS     │
└─────────┴──────────────────────────┴────────────┴────────────┴──────────┘
========================================================================
           ESTADO GENERAL: 100% PASS - APROBADO PARA ENTREGA            
========================================================================
```

---

## 9. Clasificación de Severidad de Errores

| Nivel | Descripción | Acción |
| :--- | :--- | :--- |
| **CRÍTICO** | Fallo en conexión, excepción fatal, detención del sistema o corrupción de datos. | Bloquea la entrega de inmediato. |
| **ALTO** | Incoherencia en cálculos de totales, falta de un SP/Función o fallo en creación de Maestro. | Bloquea la entrega. |
| **MEDIO** | Diferencia estética en formateo de texto o respuesta lenta que excede el umbral. | Requiere corrección antes del Release. |
| **BAJO / WARN** | Advertencia de deprecación o diferencia de rendimiento dentro del límite. | Registrado en el informe. |

---

## 10. Regla de Aprobación Automática (Criterio de Aceptación)

Una tarea **NO SE CONSIDERA TERMINADA** si:
- `PostgreSQL = PASS` y `SQL Server = FAIL`
- `PostgreSQL = FAIL` y `SQL Server = PASS`
- `PostgreSQL = PASS`, `SQL Server = PASS`, pero los valores comparados son diferentes.

**Estado Válido de Aprobación**:
- `PostgreSQL = PASS`
- `SQL Server = PASS`
- `Comparación = PASS`
- `Resultado General = PASS`

---

## 11. Regla para el Agente de Desarrollo (IA)

Cada vez que el agente reciba una solicitud de desarrollo, deberá ejecutar el siguiente ciclo:

1. **Analizar el Requerimiento**: Identificar las tablas, SPs, funciones y APIs afectadas.
2. **Implementar en PostgreSQL**: `SQL/`, `SQL/SP/`, `SQL/Table/`, `prisma/schema.prisma`.
3. **Implementar en SQL Server**: `SQL/SqlServer/01_Tables.sql`, `02_Seeds.sql`, `03_Functions_And_SPs.sql`.
4. **Ejecutar Pruebas Automatizadas**:
   - `node deploy/gen_schema_json.js`
   - `node scripts/validate_full_suite.js`
5. **Comparar Resultados**: Verificar que la respuesta en ambos motores coincida en estructura y valores.
6. **Corregir & Re-ejecutar**: Si cualquiera de los dos motores arroja error o discrepancia, corregir y volver a probar.
7. **Informar Resultado**: Entregar al usuario la confirmación con la matriz de validación en **PASS**.
