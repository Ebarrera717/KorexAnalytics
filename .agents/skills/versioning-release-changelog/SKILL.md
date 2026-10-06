---
name: versioning-release-changelog
description: "Política oficial y protocolo obligatorio para versionamiento SemVer 2.0.0, Builds, inmutabilidad de releases, control de regresiones, validación multibase dual (PostgreSQL + SQL Server), y generación del CHANGELOG interno y el Informe de Cambios y Validación para Cliente (UAT) en Korex."
---

# Skill de Versionamiento, Releases, Trazabilidad, Validación y CHANGELOG (Korex)

Este Skill define las directrices obligatorias, estándares técnicos y procedimientos de gobernanza para la gestión de versiones, artefactos de release, trazabilidad de código y documentación orientada a personas y clientes para el sistema **Korex** (PostgreSQL y SQL Server), conforme al documento normativo `KOREX-VERSIONAMIENTO-001`.

---

## 1. Principio Fundamental y Regla de Inmutabilidad

1. **Inmutabilidad Absoluta de Versiones Publicadas**: Una versión liberada (ej. `3.7.12`) es inmutable. Si se detecta un error o ajuste posterior, se debe generar una versión siguiente (`3.7.13`). Queda estrictamente prohibido sufijar con *"corregida"*, *"definitiva"*, *"nueva"* o *"final"*.
2. **Esquema SemVer 2.0.0**: `MAJOR.MINOR.PATCH`
   - **MAJOR**: Cambios arquitectónicos incompatibles o que rompen contratos existentes.
   - **MINOR**: Nuevas funcionalidades, módulos, reportes e integraciones compatibles.
   - **PATCH**: Correcciones de errores, SPs, funciones, instaladores, actualizadores, rendimiento y regresiones.
3. **Build Identificador Único**: Cada compilación física debe asociarse a un Build con formato `YYYYMMDD.NN` (ej. `20260923.01`).
4. **Trazabilidad 360°**: Toda versión liberada vincula:
   $$\text{Requerimiento} \longleftrightarrow \text{ID KRX} \longleftrightarrow \text{Commit/Rama} \longleftrightarrow \text{Build} \longleftrightarrow \text{Versión} \longleftrightarrow \text{Pruebas Multibase} \longleftrightarrow \text{Instalador} \longleftrightarrow \text{CHANGELOG}$$

---

## 2. Gobernanza Dual del CHANGELOG

Korex opera bajo una separación estricta entre el registro técnico interno y la entrega al cliente:

### A. CHANGELOG Interno (`CHANGELOG.md`)
- Ubicado en la raíz del repositorio.
- Contiene fichas técnicas completas por cada ID de cambio (`KRX-YYYY-NNNNN`).
- Incluye componentes afectados (backend, frontend, SPs, funciones, tablas), motores, pruebas ejecutadas, hash y estado de instaladores.

### B. Informe de Cambios y Validación para el Cliente (UAT)
- Documento limpio, libre de tecnicismos internos, rutas de archivos o commits.
- Enfocado en el usuario final y el responsable de IT/Operaciones de la agencia.
- Estructurado como una **Ficha de Prueba y Aceptación** con pasos concretos de reproducción, resultado esperado y casilla formal de aprobación (`[ ] APROBADO / [ ] OBSERVADO`).

---

## 3. Formato Estándar de Ficha de Cambio (`KRX-YYYY-NNNNN`)

Cada cambio relevante debe estructurarse con los siguientes campos:

```text
ID DEL CAMBIO: KRX-2026-00125
TIPO: Fixed | Added | Changed | Security | Performance
TÍTULO: [Título conciso del cambio]
PROBLEMA REPORTADO: [Qué ocurría de forma exacta]
COMPORTAMIENTO ANTERIOR: [Comportamiento previo al cambio]
CAUSA: [Causa técnica identificada]
SOLUCIÓN IMPLEMENTADA: [Qué se modificó]
COMPONENTES AFECTADOS:
  - Backend / API: [Rutas / Métodos]
  - Frontend / UI: [Componentes / Pantallas]
  - Base de Datos (PG / SQL): [SPs, Funciones, Tablas alteradas]
  - Instaladores / Actualizadores: [Scripts impactados]
MOTOR: PostgreSQL | SQL Server | Ambos (Validado en ambos)
COMPORTAMIENTO NUEVO: [Qué ocurre ahora tras la corrección]
IMPACTO FUNCIONAL: [Beneficio / Cambio para el usuario]
RIESGO: Bajo | Medio | Alto
PRUEBAS REALIZADAS: [Listado de pruebas ejecutadas]
RESULTADO: OK | NO OK
REGRESIÓN: [Prueba automatizada creada/actualizada]
VALIDACIÓN DEL CLIENTE:
  1. [Paso 1]
  2. [Paso 2]
  3. [Paso 3]
RESULTADO ESPERADO: [Qué debe observar el cliente]
```

---

## 4. Checklist de Release Gate (17 Criterios de Liberación)

Antes de declarar una versión como liberada (`RELEASED`), el agente o desarrollador debe verificar:

- [ ] 1. Código congelado en la rama de release.
- [ ] 2. Versión SemVer asignada e incrementada según tipo de cambio.
- [ ] 3. Build asignado con fecha y correlativo (`YYYYMMDD.NN`).
- [ ] 4. Commit hash registrado.
- [ ] 5. `CHANGELOG.md` interno actualizado y curado para lectura humana.
- [ ] 6. `node scripts/validate_full_suite.js` ejecutado con 100% de éxito en todas sus capas.
- [ ] 7. PostgreSQL probado y verificado de forma 100% aislada.
- [ ] 8. SQL Server probado y verificado de forma 100% aislada.
- [ ] 9. Batería de regresiones completada sin degradaciones.
- [ ] 10. `GenerarSetup.bat` y `GenerarActualizador.bat` (PostgreSQL) validados.
- [ ] 11. `GenerarSetupSqlServer.bat` y `GenerarActualizadorSqlServer.bat` (SQL Server) validados.
- [ ] 12. Regla de `.env` verificada (Setup crea desde cero, Actualizador conserva 100% idéntico).
- [ ] 13. Regla de inmutabilidad de Zeus ERP verificada (0 alteraciones a objetos nativos).
- [ ] 14. Seguridad y contraseñas cifradas validadas.
- [ ] 15. Rendimiento y telemetría validados sin regresiones (`.performance_baseline.json`).
- [ ] 16. Checksums SHA-256 generados para los artefactos ejecutables.
- [ ] 17. Informe de Entrega y Validación para el Cliente (UAT) preparado.

---

## 5. Control de Ejecución Infranqueable del Actualizador (Reglas 45-56)

1. **Principio Infranqueable**: *"Todo lo que deba ejecutarse debe ejecutarse y todo lo que no se ejecute debe ser reportado."*
2. **Prohibición de Éxito Parcial o Falso**: El actualizador NUNCA puede finalizar como `EXIT CODE 0` o mostrar *"Actualización exitosa"* si algún script, SP, función, migración, tabla, columna, índice, vista o prueba quedó sin ejecutar, falló o si producción queda en un estado diferente al de desarrollo.
3. **Estado Obligatorio por Componente**: Cada componente (Conexión, Versión, Backup, Tablas, Columnas, Índices, Funciones, SPs, Vistas, Backend, Frontend, Servicio, Pruebas) debe quedar en un estado explícito: `OK`, `ERROR`, `OMITIDO`, `NO EJECUTADO`, `NO APLICA`.
4. **Verificación Post-Ejecución (`EJECUTADO + VALIDADO = OK`)**: No basta con ejecutar un `.sql`. El actualizador debe verificar inmediatamente la existencia, compilación, permisos y dependencias del objeto creado/actualizado.
5. **Separación de Niveles de Error**: Manejo explícito entre `ERROR BLOQUEANTE`, `ERROR NO BLOQUEANTE`, `WARNING` e `INFORMACIÓN`. Un warning por objeto existente (ej. tabla A ya existe) no debe detener la actualización de SPs posteriores, pero todo error queda registrado.
6. **Códigos de Salida Reales (`EXIT CODE`)**:
   - `EXIT CODE 0`: Actualización 100% exitosa y validada.
   - `EXIT CODE 1`: Actualización incompleta o con errores.
   - `EXIT CODE 2`: Validación final / post-check fallido.
   - `EXIT CODE 3`: Problema de configuración.
   - `EXIT CODE 4`: Problema de conexión.
   - `EXIT CODE 5`: Rollback ejecutado.
7. **Reporte Automático HTML/JSON**: Toda ejecución de actualizador debe emitir automáticamente un reporte detallado con marca temporal (`Korex_Update_Report_<VERSION>_<TIMESTAMP>.html`).

---

## 6. Cadena de Validación Desarrollo → Release → Producción (Reglas 57-72)

1. **Cadena Obligatoria**:
   $$\text{DESARROLLO} \rightarrow \text{PRUEBAS AUTOMÁTICAS} \rightarrow \text{RELEASE CANDIDATE} \rightarrow \text{VALIDACIÓN PG/SQL} \rightarrow \text{INSTALADOR} \rightarrow \text{ACTUALIZADOR} \rightarrow \text{RELEASE} \rightarrow \text{PRODUCCIÓN} \rightarrow \text{POST-UPDATE VALIDATION}$$
2. **Manifest de Release**: Cada release genera un manifest certificado de componentes esperados vs presentes en Backend, Frontend, PostgreSQL, SQL Server y Artefactos.
3. **Smoke Test Post-Actualización**: Validación automatizada posterior al despliegue (App inicia, Login OK, Conexión BD OK, SPs críticos existen, Endpoints principales responden, Trazabilidad activa).
4. **Regla de No Silencio**: Korex prefiere **FALLAR CLARAMENTE** con diagnóstico estructurado antes que continuar silenciosamente con errores latentes.
5. **Criterio Absoluto**: Si existe cualquier diferencia entre lo esperado y lo instalado en producción, la actualización se marca como **FALLIDA O INCOMPLETA** (NUNCA EXITOSA).

---

## 7. Reglas Operativas para Agentes de IA

Todo agente de IA que realice modificaciones en Korex **DEBE**:
1. Leer y consultar la versión actual en `package.json` y `CHANGELOG.md`.
2. Asignar un ID de cambio (`KRX-YYYY-NNNNN`) a cualquier intervención relevante.
3. Garantizar que todo cambio funcione y sea validado **simultáneamente en PostgreSQL y SQL Server**.
4. Crear o extender pruebas automatizadas de regresión para el problema corregido.
5. Inyectar y compilar localmente los SPs/DDL (`node deploy/gen_schema_json.js` / `node deploy/sync_zeus_erp.js`).
6. Redactar las secciones de validación del cliente con pasos claros, reproducibles y orientados al usuario.
7. Verificar que el actualizador valide presencia y compilación (`EJECUTADO + VALIDADO = OK`).
8. Nunca emitir una conclusión de prueba como `"OK"` sin haber ejecutado la verificación técnica real.

