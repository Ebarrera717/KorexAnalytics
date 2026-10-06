---
name: db-protection-security
description: Regla de seguridad crítica para la protección absoluta contra la eliminación, destrucción o reemplazo accidental de la Base de Datos Principal de Korex (.env) y la Base de Datos Externa Protegida (ZeusAgencias_23) en PostgreSQL y SQL Server.
---

# SKILL CRÍTICO: PROTECCIÓN DE BASES DE DATOS Y PREVENCIÓN DE OPERACIONES DESTRUCTIVAS

## OBJETIVO

El sistema debe implementar mecanismos de protección para impedir que cualquier proceso de desarrollo, migración, instalación, actualización, prueba, automatización o ejecución accidental pueda **eliminar, destruir o reemplazar la base de datos principal de Korex** (`.env`) o la **base de datos externa de exportación** (`ZeusAgencias_23`).

La eliminación de la base de datos completa es una operación **NO PERMITIDA** desde la aplicación, instaladores, scripts automáticos o procesos internos del proyecto.

Esta regla es de cumplimiento obligatorio para:
* PostgreSQL.
* SQL Server.
* Ambientes de Desarrollo (`DEVELOPMENT`).
* Ambientes de Pruebas (`TEST`).
* Ambientes de Staging (`STAGING`).
* Ambientes de Producción (`PRODUCTION`).

---

## 1. PROHIBICIÓN ABSOLUTA

Ningún proceso perteneciente a Korex podrá ejecutar automáticamente operaciones como:
* `DROP DATABASE`
* `DROP SCHEMA`
* `DROP TABLE` de tablas existentes con información.
* `TRUNCATE` de tablas existentes, salvo procesos expresamente autorizados.
* `DELETE` masivo sin una operación explícitamente controlada y filtrada.
* Recreación completa de la base de datos.
* Eliminación de la base para volver a crearla.
* Restauración destructiva sobre una base existente.
* Reemplazo de la base configurada en producción.
* Scripts de inicialización que destruyan información existente.

Estas operaciones **no deben formar parte de ningún flujo normal del sistema**.

---

## 2. REGLA ESPECIAL PARA INSTALADORES Y DESPLIEGUES

Los instaladores y scripts de despliegue de Korex **NO deben eliminar ni recrear automáticamente una base de datos existente**.

El instalador debe:
1. Identificar la configuración existente.
2. Validar la conexión.
3. Validar que la base de datos exista.
4. Validar que corresponda al ambiente esperado.
5. Aplicar únicamente las estructuras o actualizaciones necesarias (`ALTER TABLE`, `ADD COLUMN`, `CREATE INDEX`, `CREATE PROCEDURE`, `CREATE FUNCTION`).
6. Conservar toda la información existente.

Si la base no existe, el instalador debe detenerse y solicitar la acción correspondiente, en lugar de crear o destruir bases automáticamente cuando esto no esté expresamente autorizado.

---

## 3. PROTECCIÓN DEL `.env` Y SEPARACIÓN ESTRICTA DE CONEXIONES

La base configurada en el `.env` representa la **base principal de Korex**.

Antes de ejecutar cualquier operación de infraestructura, migración o actualización, el sistema debe identificar:
```text
Base de datos configurada
Motor (PostgreSQL vs SQL Server)
Servidor / Host / Puerto
Nombre de Base de Datos
Ambiente (DEV / TEST / STAGING / PROD)
```

### Reglas Clave:
1. **La base configurada en `.env` nunca debe ser eliminada, reemplazada ni recreada automáticamente.**
2. **Aislamiento de Conexiones**:
   - **CONEXIÓN 1**: Base principal de Korex (configurada en `.env`) -> Operación interna de Korex.
   - **CONEXIÓN 2**: SQL Server externo (configurado en *Parámetros → SQL Server*) -> Integración / Exportación (`ZeusAgencias_23`).
3. Un proceso destinado a preparar, actualizar o integrar información con SQL Server externo **no puede ejecutar accidentalmente una operación destructiva sobre la base principal de Korex ni sobre la base externa**.

---

## 4. VALIDACIÓN PREVIA Y MIGRACIONES INCREMENTALES

Todo proceso que modifique la estructura de una base de datos debe realizar previamente una validación:

```text
¿Base configurada?
        ↓
¿Conexión válida?
        ↓
¿Base corresponde a Korex?
        ↓
¿Ambiente? (PROD / TEST / DEV)
        ↓
¿Operación destructiva? (DROP DB, DROP TABLE)
        ↓
    ┌───┴───┐
    NO      SÍ
    ↓        ↓
 CONTINUAR  BLOQUEAR CON ERROR CONTROLADO Y REGISTRO DE TRAZA DE SEGURIDAD
```

### Migraciones Non-Destructive:
Las migraciones deben ser **incrementales y no destructivas**:
```sql
ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
CREATE INDEX IF NOT EXISTS ...
CREATE OR REPLACE FUNCTION ...
CREATE OR REPLACE PROCEDURE ...
```

Queda expresamente prohibido el flujo:
```text
Eliminar base -> Crear base nuevamente -> Crear tablas
```

---

## 5. IDENTIFICACIÓN DE AMBIENTE Y PRINCIPIO DE MÍNIMO PRIVILEGIO

### Identificación del Ambiente:
- `DEVELOPMENT`
- `TEST`
- `STAGING`
- `PRODUCTION`

En **`PRODUCTION`**, se bloquean automáticamente todas las operaciones destructivas de DDL o DML masivo.

### Principio de Mínimo Privilegio:
El usuario de base de datos utilizado por la aplicación de Korex debe contar únicamente con permisos para:
- Consultar información (`SELECT`).
- Crear información (`INSERT`).
- Actualizar información (`UPDATE`).
- Eliminar información filtrada cuando la funcionalidad lo requiera (`DELETE`).
- Ejecutar SPs y Funciones (`EXECUTE`).

**No debe tener permisos administrativos innecesarios** como:
- `DROP DATABASE`
- `CREATE DATABASE` (en producción/instaladores)
- `ALTER SERVER`
- `CONTROL SERVER` (SQL Server)
- Privilegios de superusuario que no sean estrictamente requeridos.

---

## 6. BLOQUEO A NIVEL DE CÓDIGO Y REGISTRO DE SEGURIDAD

Si algún proceso, script o API intenta ejecutar una instrucción destructiva contra la base principal de Korex o contra `ZeusAgencias_23`:
1. El proceso **debe detenerse inmediatamente**.
2. Se genera un error controlado: `"Operación bloqueada por protección de base de datos y prevención de pérdida de información."`
3. Se registra una **Traza de Seguridad** (`SECURITY_ALERT`):
   - Fecha / Hora
   - Usuario
   - Origen / Proceso
   - Base de Datos Objetivo
   - Operación Solicitada (`DROP DATABASE`, `DROP TABLE`, etc.)
   - Resultado: `BLOQUEADA`
   - Motivo del bloqueo y ambiente.

---

## 7. PROTECCIÓN DE LA BASE EXTERNA (`ZeusAgencias_23`)

La base externa configurada en *Parámetros → SQL Server* (`ZeusAgencias_23`) es una **base externa protegida**:
- Korex no puede eliminar, recrear o reemplazar esta base.
- No se permite utilizarla como base de pruebas destructivas ni como base para instalar Korex.
- La modificación de esta base debe limitarse a los objetos estrictamente necesarios para recibir información (SPs de integración: `spFacturacionesCrear`, `spCotizacionesCrear`, `spFacturaCrear`, etc.) bajo el principio de **Mínima Intervención**.

---

## 8. PRUEBAS Y CRITERIO DE ACEPTACIÓN CRÍTICO

### Pruebas Obligatorias pre-entrega:
1. **Prueba 1 – Base Existente**: Ejecutar actualización sobre base existente y verificar que la información y estructura se conserven intactas.
2. **Prueba 2 – Protección contra DROP DATABASE**: Intentar ejecutar una operación destructiva; el resultado esperado debe ser **BLOQUEADA**.
3. **Prueba 3 – Protección en Producción**: Configurar ambiente `PRODUCTION` e intentar procesos de riesgo; resultado esperado: **BLOQUEADA**.
4. **Prueba 4 y 5 – Verificación Dual (PostgreSQL + SQL Server)**: Validar las reglas de protección en ambos motores.
5. **Prueba 6 – Base Externa ZeusAgencias_23**: Verificar que ningún proceso pueda eliminar o recrear la base externa.

### CRITERIO DE ACEPTACIÓN CRÍTICO:
> **La información existente tiene prioridad sobre cualquier proceso de instalación, migración, actualización o prueba.**
> **Ningún desarrollo, script, migración, instalador, prueba o proceso automático puede eliminar o recrear la base de datos principal de Korex ni la base externa protegida.**
