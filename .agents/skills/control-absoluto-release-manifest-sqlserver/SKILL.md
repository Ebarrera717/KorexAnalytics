---
name: control-absoluto-release-manifest-sqlserver
description: SKILL MAESTRO — CONTROL ABSOLUTO DE RELEASE, MANIFEST, CONEXIÓN Y ACTUALIZACIÓN SQL SERVER
---

# SKILL: CONTROL ABSOLUTO DE RELEASE, MANIFEST, CONEXIÓN Y ACTUALIZACIÓN SQL SERVER

## 1. OBJETIVO

Garantizar que ninguna actualización de Korex SQL Server pueda:
1. Omitir objetos existentes en el proyecto.
2. Generar un manifest incompleto.
3. Generar un instalador/actualizador incompleto.
4. Ejecutar contra una base de datos diferente a la configurada por el cliente.
5. Utilizar servidores, bases de datos o credenciales de desarrollo como fallback.
6. Finalizar sin ejecutar el Guardian.
7. Declarar éxito cuando existan objetos faltantes, no ejecutados o no validados.
8. Permitir que una diferencia entre DESARROLLO, RELEASE y PRODUCCIÓN llegue al cliente sin ser detectada.

Esta SKILL es OBLIGATORIA y aplica a TODOS los releases, instaladores, actualizadores, scripts, migraciones y procesos de reparación de SQL Server.

---

## 2. LAS 29 REGLAS DE CONTROL ABSOLUTO

### 1. REGLA ABSOLUTA DE INVENTARIO RECURSIVO
El manifest NO puede construirse mediante una lista parcial o manual de carpetas conocidas. El generador de manifest debe realizar un **INVENTARIO COMPLETO Y RECURSIVO** de todas las ubicaciones dentro de `SQL/` (Stored Procedures, Functions, Tables, Columns, Views, Triggers, Indexes, Constraints, Foreign Keys, Sequences, Types, Synonyms, Seeds, Migraciones). Queda estrictamente PROHIBIDO asumir que los SPs sólo están en subcarpetas fijas.

### 2. DETECCIÓN AUTOMÁTICA DE OBJETOS OMITIDOS
Se debe cumplir estrictamente:
$$\text{PROYECTO} = \text{INVENTARIO} = \text{MANIFEST} = \text{PAQUETE}$$
Si $\text{PROYECTO} > \text{INVENTARIO}$, $\text{INVENTARIO} > \text{MANIFEST}$ o $\text{MANIFEST} > \text{PAQUETE}$, el proceso DEBE FALLAR INMEDIATAMENTE con **Exit Code 5** y el mensaje:
`"El manifest no representa el inventario completo del proyecto. Se detectaron objetos existentes que no están incluidos en el manifest."`

### 3. COBERTA 100% OBLIGATORIA
Un manifest con 2 SPs registrados cuando en el proyecto existen 128 SPs es considerado **UN FALLO CRÍTICO BLOQUEANTE**. La generación de release, instalador o actualizador debe detenerse de inmediato.

### 4. IDENTIFICACIÓN Y HASH DE CADA OBJETO
Cada objeto registrado en el manifest incluye su `ObjectType`, `ObjectName`, `SourceFile` y `HashExpected` (SHA-256 normalizado) para detectar alteraciones, obsolescencia o scripts descalzados.

### 5. VALIDACIÓN DEL PAQUETE FINAL
Antes de publicar se verifica que: $\text{Proyecto} \rightarrow \text{Manifest} \rightarrow \text{Archivos Incluidos} \rightarrow \text{Instalador} \rightarrow \text{Actualizador}$ coincidan en 100%.

### 6. GUARDIAN OBLIGATORIO
Todo actualizador SQL Server DEBE ejecutar obligatoriamente `scripts/korex_updater_guardian.js` antes, durante y **post-actualización**. Si el Guardian no se ejecuta o falla, la actualización se declara `FALLIDA` con Exit Code no cero.

### 7. CONTRATO DEL ACTUALIZADOR
`Update_Korex_SQLServer.ps1` sólo termina exitosamente si `korex_updater_guardian.js` valida el 100% de los objetos y retorna Exit Code 0.

### 8. PROHIBICIÓN ABSOLUTA DE FALLBACKS DE CONEXIÓN
Queda **STRICTLY PROHIBIDO** usar servidores o bases de datos de desarrollo por defecto (ej. `ZEUSAGENCIAS10`, `Korex_Pruebas`) cuando falten credenciales o falle la conexión del cliente. Si falta algún parámetro o falla `.env`: **DETENER EL PROCESO INMEDIATAMENTE**.

### 9. CONEXIÓN EXCLUSIVA DESDE EL `.env` DEL CLIENTE
La fuente de verdad de conexión es estrictamente el `.env` existente en la instalación del cliente (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`). No se inventa, no se reemplaza y no se combina con valores hardcodeados.

### 10. VALIDACIÓN DE IDENTIDAD DE LA BASE DE DATOS
Antes de ejecutar cualquier modificación DDL, el actualizador consulta la instancia real a la que está conectado y compara Servidor y Base de datos contra la configuración esperada. Si el Servidor o Base real difiere de lo configurado (ej: configurado `DE0000BO72AV008/Korex` vs conectado `ZEUSAGENCIAS10/Korex_Pruebas`): **BLOQUEO CRÍTICO E INMEDIATO CON EXIT CODE 4**, 0 DDL ejecutado y el mensaje:
`"La conexión SQL Server no corresponde a la instalación configurada. La actualización fue detenida para evitar modificar una base incorrecta."`

### 11. VALIDACIÓN PREVIA OBLIGATORIA (PRE-CHECK)
Validar `.env`, conectividad, identidad real, permisos, versión y manifest antes de ejecutar la primera instrucción DDL.

### 12. PROHIBIDO MODIFICAR SI NO SE PUEDE IDENTIFICAR LA BASE
Si hay ambigüedad en Servidor, Instancia o Base de Datos, abortar inmediatamente.

### 13. REGISTRO Y ESTADO DE CADA STORED PROCEDURE
Cada SP registra individualmente su estado: `PENDIENTE`, `EJECUTANDO`, `OK`, `ERROR`, `NO EJECUTADO`, `VALIDACIÓN FALLIDA`, `NO APLICA`.

### 14. PRINCIPIO: EJECUCIÓN ≠ VALIDACIÓN
Procesar un script `.sql` no implica que el objeto esté compilado y activo. La validación exige verificar presencia física en `sys.objects` / `sys.sql_modules` y hash SHA-256.

### 15. ACTUALIZACIÓN INCOMPLETA
Si de 128 SPs requeridos se logran 127 OK y 1 ERROR: la actualización es `INCOMPLETA` o `FALLIDA` (Exit Code 1 o 2). NUNCA exitosa.

### 16. MATRIZ ESTÁNDAR DE EXIT CODES KOREX
- `0`: ÉXITO TOTAL
- `1`: ERROR DE EJECUCIÓN
- `2`: VALIDACIÓN FINAL FALLIDA
- `3`: CONFIGURACIÓN INVÁLIDA
- `4`: CONEXIÓN/IDENTIDAD DE BASE INVÁLIDA
- `5`: MANIFEST INCOMPLETO
- `6`: PAQUETE INCOMPLETO
- `7`: GUARDIAN NO EJECUTADO
- `8`: OBJETOS FALTANTES
- `9`: OBJETOS DESACTUALIZADOS
- `10`: ERROR CRÍTICO DE SEGURIDAD/ENTORNO

### 17. VALIDACIÓN DESARROLLO VS RELEASE
Detectar automáticamente objetos que sólo existen en desarrollo y no fueron empaquetados.

### 18. VALIDACIÓN RELEASE VS PRODUCCIÓN
Comparar `manifest-sqlserver.json` contra la base productiva post-instalación.

### 19. NO DEPENDER DE LA MEMORIA DEL DESARROLLADOR
Toda presencia de archivos y objetos se comprueba de forma 100% automatizada.

### 20. PRUEBAS DE REGRESIÓN OBLIGATORIAS
Cada incidencia o descalce detectado genera una prueba automatizada en `scripts/`.

### 21. PRUEBA DEL MANIFEST (`scripts/test_release_manifest.js`)
Prueba ejecutable que valida que el 100% de los archivos SQL del proyecto estén registrados en el manifest.

### 22. PRUEBA DEL ACTUALIZADOR (`scripts/test_sqlserver_updater.js`)
Prueba ejecutable que simula el flujo de actualización completo.

### 23. PRUEBA DE CONEXIÓN INCORRECTA (`scripts/test_connection_mismatch.js`)
Prueba ejecutable que simula `.env` configurado hacia `DE0000BO72AV008/Korex` con conexión hacia `ZEUSAGENCIAS10/Korex_Pruebas`, verificando **0 DDL ejecutado** y **Exit Code 4**.

### 24. PRUEBA DE MANIFEST INCOMPLETO (`scripts/test_manifest_coverage.js`)
Prueba ejecutable que simula un manifest parcial (ej. 128 SPs en proyecto vs 2 en manifest), verificando fallo con **Exit Code 5**.

### 25. PRUEBA DE GUARDIAN AUSENTE (`scripts/test_guardian_contract.js`)
Prueba ejecutable que verifica que la ausencia o fallo del Guardian retorna **Exit Code 7**.

### 26. VALIDACIÓN DEL INSTALADOR/ACTUALIZADOR PRE-PUBLICACIÓN
Inspeccionar el ejecutable `.exe` antes de entregarlo al cliente.

### 27. REPORTE AUTOMÁTICO DE ACTUALIZACIÓN (JSON & HTML)
Cada actualización genera `Korex_Update_Report_<fecha>_<id>.json` y `Korex_Update_Report_<fecha>_<id>.html` con el inventario completo, Guardian, duración y Exit Code (sin contraseñas).

### 28. REGLA DE ORO DE LIBERACIÓN
Ningún release pasa a RELEASED si no demuestra inventario 100%, manifest 100%, conexión veridica, 0 fallbacks, Guardian ejecutado y pruebas superadas.

### 29. PRINCIPIO FINAL
`INVENTARIO + MANIFEST + PAQUETE + CONEXIÓN CORRECTA + EJECUCIÓN + GUARDIAN + VALIDACIÓN = ACTUALIZACIÓN EXITOSA`
