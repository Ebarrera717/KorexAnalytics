---
name: db-management
description: Workflow and mandatory rules for database-first development using stored procedures, functions and tables in PostgreSQL and SQL Server in AgenciasNew
---

# Procedimientos y Automatización de Base de Datos - AgenciasNew

Esta guía detalla las reglas obligatorias y el flujo de trabajo paso a paso para realizar desarrollos y cambios en la base de datos de AgenciasNew.

---

## 0. REGLA PRIMORDIAL: Desarrollo Basado Prioritariamente en Base de Datos (SPs, Funciones y Tablas)

> [!IMPORTANT]
> **REGLA MANDATORIA DE ARQUITECTURA**:
> Todo desarrollo, cálculo de negocio, proceso, liquidación, validación, inserción o consulta de datos en AgenciasNew **DEBE realizarse obligatoria y prioritariamente a través de Procedimientos Almacenados (SPs), Funciones SQL y Tablas de Base de Datos** (en PostgreSQL local `Korex_colaereo` y SQL Server producción).
>
> **Criterio de Excepción**:
> Únicamente cuando sea **estrictamente e insalvablemente imposible** implementar la lógica dentro de la base de datos (por ejemplo: renderizado estético de interfaz React, manipulación directa del DOM o manejo de cookies HTTP de sesión en Edge Runtime), se permitirá programar dicha lógica en Next.js / TypeScript frontend.

---

## 1. Modificación y Despliegue de Procedimientos Almacenados (SPs)

### Flujo de Desarrollo en PostgreSQL (Base Local):
1. Crear o modificar la función SQL en `SQL/Function/` o el SP en `SQL/SP/`.
2. Las consultas de listado e historial siempre deben implementarse mediante Funciones SQL (`public.fn...()`) retornando `TABLE` o `jsonb`.
3. Las operaciones de creación, edición o eliminación de datos deben implementarse mediante Procedimientos Almacenados (`public.sp...`).
4. Probar localmente conectándote a la BD local:
   ```
   postgresql://postgres:zzeusagencias@localhost:5432/Korex_colaereo
   ```

### Flujo de Desarrollo en SQL Server (ERP Zeus):
1. Crear o modificar el SP correspondiente en `SQL/SP/` asegurando `SET XACT_ABORT ON;` y control de transacciones estricto.
2. Compilar en el servidor SQL Server ejecutando el script de despliegue automatizado:
   ```bash
   node tmp/deploy_sql.mjs
   ```

---

## 2. Actualización, Compilación Local y Sincronización Automática

> [!CRITICAL]
> **REGLA MANDATORIA DE AUTO-DESPLIEGUE E INYECCIÓN LOCAL (POSTGRESQL + SQL SERVER)**:
> Cada vez que se modifique o cree cualquier archivo SQL (en `SQL/SP/`, `SQL/Function/`, `SQL/Table/`, `SQL/SqlServer/`, `SQL/Actualizador/`), **SE DEBE EJECUTAR E INYECTAR INMEDIATAMENTE EN EL MISMO TURNO EN LAS BASES DE DATOS LOCALES ACTIVAS (PostgreSQL local `Korex_colaereo` y SQL Server `ZEUSAGENCIAS10` / `Korex_Pruebas`)**:
> ```bash
> node deploy/gen_schema_json.js
> ```
> NUNCA dar por finalizada una modificación SQL ni responder al usuario sin haber compilado e inyectado previamente este cambio en las bases de datos locales y verificado la ejecución limpia de los SPs/funciones.

Este script ejecuta la validación de 7 capas y el despliegue automático:
1. Compila y despliega los `.sql` en tiempo real en la BD PostgreSQL local (auto-inyectando bloques `DO $$` de limpieza si faltan).
2. Inyecta `CREATE TABLE IF NOT EXISTS` para tablas referenciadas en [`Alter_New_Columns.sql`](file:///f:/Proyectos/AgenciasNew/SQL/Table/Alter_New_Columns.sql).
3. Verifica la regla obligatoria de `LEFT JOIN` en funciones de consulta.
4. **Audita automáticamente el número y firmas de parámetros** entre las API Routes (`src/app/api/`) y `pg_proc` de la BD local (PASO 3.5). Aborta la compilación de inmediato si detecta descalces.
5. Sincroniza automáticamente los scripts de producción [`SQL/Actualizador/Actualizador.sql`](file:///f:/Proyectos/AgenciasNew/SQL/Actualizador/Actualizador.sql) y [`ActualizadorSERVER.sql`](file:///f:/Proyectos/AgenciasNew/SQL/Actualizador/ActualizadorSERVER.sql).

> [!CRITICAL]
> **REGLA DE SINCRONIZACIÓN OBLIGATORIA DE NUEVAS COLUMNAS (PREVENCIÓN DE ERROR 42703 `column does not exist`)**:
> Toda nueva columna (por ejemplo: `targetTaxId`, `isActive`, `ticketCode`, etc.) que sea creada o referenciada en Funciones SQL, Stored Procedures (SPs) o API Routes **DEBE DECLARARSE Y SINCRONIZARSE OBLIGATORIAMENTE EN 3 PASOS ANTES DE PROBAR O COMPILAR**:
> 1. **Declaración DDL en `SQL/Table/Alter_New_Columns.sql`**: Tanto en el `CREATE TABLE IF NOT EXISTS` original como en una cláusula explícita `ALTER TABLE public."Tabla" ADD COLUMN IF NOT EXISTS "columna" TIPO;`.
> 2. **Declaración en `prisma/schema.prisma`**: Agregar el atributo correspondiente en el modelo de Prisma (ej: `targetTaxId Int?`).
> 3. **Ejecución Obligatoria del Auto-Despliegue (`node deploy/gen_schema_json.js`)**: Ejecutar este script inmediatamente en la terminal para inyectar la columna en PostgreSQL local (`Korex_colaereo`) y ejecutar `npx prisma generate` **ANTES** de compilar Next.js o invocar el endpoint/SP.

---

## 4. Reglas de Llaves Foráneas y Consultas Relacionales (Prisma / SQL)

1. **Definición Obligatoria de Llaves Foráneas (FK Constraints)**:
   Al crear o modificar tablas en [`SQL/Table/Alter_New_Columns.sql`](file:///f:/Proyectos/AgenciasNew/SQL/Table/Alter_New_Columns.sql), **es obligatorio agregar la restricción de Foreign Key (`CONSTRAINT ... FOREIGN KEY ("columnaId") REFERENCES public."Tabla" ("id")`)**.
   - *Razón*: Si la FK falta en la BD PostgreSQL, `npx prisma db pull` no genera la relación de modelos en `prisma/schema.prisma`.

2. **Patrón Seguro para Consultas con Relaciones en API Routes**:
   Para consultar datos relacionales en Next.js, se DEBE utilizar preferentemente `$queryRawUnsafe` con **`LEFT JOIN`** y `jsonb_build_object`:
   ```typescript
   const list = await prisma.$queryRawUnsafe(`
       SELECT 
           t.*,
           jsonb_build_object('id', r.id, 'code', r.code, 'name', r.name) as "Relacion"
       FROM public."TablaPrincipal" t
       LEFT JOIN public."TablaRelacionada" r ON r.id = t."relacionId"
   `);
   ```
   - *Ventajas*: Cumple la regla estricta de `LEFT JOIN` y previene errores en tiempo de ejecución del ORM (`Unknown field 'Model' for include statement`).

> [!CAUTION]
> **LISTADOS VACÍOS O RETORNO ERROR 500 (PREVENCIÓN OBLIGATORIA)**:
> Cuando una pantalla de consulta o listado muestre `Mostrando 0 a 0 de 0 registros` a pesar de existir datos en la tabla, se debe a un error de ejecución en la función SQL de PostgreSQL. Para evitarlo:

1. **Verificación de Existencia de Columnas**:
   - NUNCA referenciar columnas que no existan en la tabla destino (ejemplo: `t."inNationality"` en `ChargeAndTax`). Toda columna en `jsonb_build_object` o `SELECT` debe ser validada contra `information_schema.columns` antes de compilar.
2. **Verificación de Existencia de Tablas Relacionadas**:
   - Si la función realiza un `JOIN` o `LEFT JOIN` con una tabla secundaria (ej. `public."ProviderType"`), la sentencia `CREATE TABLE IF NOT EXISTS` de esa tabla **DEBE EJECUTARSE EN POSTGRESQL ANTES** de compilar la función.
3. **Prueba de Ejecución Directa en psql**:
   - Antes de dar por terminado cualquier cambio en una función SQL, ejecutar obligatoriamente en psql:
     ```sql
     SELECT * FROM public.fnNombreFuncionListar();
     ```
   - Si psql retorna un error (`ERROR: no existe la columna...` o `ERROR: no existe la relación...`), se debe corregir inmediatamente la función o la estructura de la tabla.
4. **Uso Obligatorio de `LEFT JOIN`**:
   - Usar siempre `LEFT JOIN` para tablas relacionables (`Client`, `User`, `Branch`, `Provider`, `Prestadora`, `ProviderType`).
   - NUNCA usar `INNER JOIN` para evitar ocultar filas con llaves foráneas nulas o descalzadas.
   - Usar `COALESCE` en todas las expresiones retornadas para evitar nulos inesperados.

