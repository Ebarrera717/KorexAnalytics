---
name: updater-verification
description: Protocolo y script de validación automatizada pre-compilación para garantizar actualizadores e instaladores 100% limpios y sin fallas al pasar de desarrollo a producción.
---

# Protocolo y Validación Automatizada Pre-Empaquetado - AgenciasNew

Este Skill define el protocolo de control de calidad y validación automatizada que debe ejecutarse **antes de generar cualquier ejecutable instalador (`Korex_Setup.exe`) o actualizador (`Korex_Update_Setup.exe`)** para entornos de prueba o producción.

---

## 1. Reglas de Validación de Base de Datos (PostgreSQL + SQL Server)

### REGLA OBLIGATORIA PRE-EMPAQUETADO MULTIBASE:
Todos los archivos batch de empaquetado e instalación ([GenerarActualizador.bat](file:///f:/Proyectos/AgenciasNew/GenerarActualizador.bat), [GenerarSetup.bat](file:///f:/Proyectos/AgenciasNew/GenerarSetup.bat), [GenerarActualizadorSqlServer.bat](file:///f:/Proyectos/AgenciasNew/GenerarActualizadorSqlServer.bat) y [GenerarSetupSqlServer.bat](file:///f:/Proyectos/AgenciasNew/GenerarSetupSqlServer.bat)) **DEBEN invocar obligatoriamente en su PASO 0 la auditoría completa de maestros y funcionalidades**:
```cmd
node "%~dp0scripts\validate_full_system.js"
```
Si el resultado no es 100% PASS en PostgreSQL y SQL Server, la generación del ejecutable **debe cancelarse de inmediato**.

### A. Integridad de Tablas Nuevas y Extensiones
Cualquier tabla creada o referenciada en SPs (ejemplo: `QuotationManualService`, `QuotationFormat`, `QuotationPrintCustomization`, `QuotationCombo`) **debe contar con un bloque `CREATE TABLE IF NOT EXISTS`** dentro de [`SQL/Table/Alter_New_Columns.sql`](file:///f:/Proyectos/AgenciasNew/SQL/Table/Alter_New_Columns.sql).
- *Razón*: Si la tabla no existe en el servidor remoto del cliente, una sentencia `ALTER TABLE` fallará rompiendo la ejecución del script actualizador.

### A.1. Verificación de Columnas Referenciadas en SPs (Prevención de Error 42703)
Toda columna de tabla referenciada en un SP o vista (ejemplo: `InvoicesProduct.ticketCode`) **debe contar obligatoriamente con su bloque `ALTER TABLE public."Tabla" ADD COLUMN IF NOT EXISTS "columna" tipo;`** en [`SQL/Table/Alter_New_Columns.sql`](file:///f:/Proyectos/AgenciasNew/SQL/Table/Alter_New_Columns.sql) y estar declarada en `prisma/schema.prisma`.

### B. Obligatoriedad de `LEFT JOIN` en Consultas
Todas las funciones de listado e historial (`fnCotizacionListar`, `fnCotizacionHistorial`, `fnCotizacion`, `spExportQuotation`) deben relacionar las tablas maestras (`Client`, `User`, `Branch`, `Provider`, `Prestadora`) mediante **`LEFT JOIN`**.
- *Razón*: El uso de `INNER JOIN` o `JOIN` oculta registros cuando las cotizaciones tienen clientes o usuarios nulos o no coincidentes en bases externas.

### C. Duplicación Completa en `spCotizacionDuplicar`
El procedimiento almacenado de duplicación debe copiar tanto la cabecera como **todas** sus tablas hijas:
1. `QuotationCombo`
2. `QuotationManualService`
3. `QuotationProduct`
4. `QuotationProductPassenger`
5. `QuotationProductTax`
6. `QuotationProductVariable`
7. `QuotationProductPayment`

### D. Integridad de Secuencias Autoincrementales (`SERIAL / nextval`)
Toda columna `id` de tipo entero en cualquier tabla debe contar con una secuencia asignada como valor por defecto (`DEFAULT nextval('public."<Tabla>_id_seq"'::regclass)`).
- *Razón*: Si la columna `id` se crea o migra como `integer NOT NULL` sin secuencia por defecto, cualquier operación de `INSERT` que omita el parámetro `id` fallará con el error `null value in column "id" violates not-null constraint`.

### F. Siembra Obligatoria de Módulos de Navegación (`public."Menu"`)
Todo nuevo módulo de navegación agregado a la barra lateral o al menú del sitio (`PRECOTIZACIONES`, `EJECUCIONES`, `MANUAL`, etc.) **DEBE ser sembrado e inyectado con `CREATE UNIQUE INDEX IF NOT EXISTS "Menu_code_key"` y `INSERT ... ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, action = EXCLUDED.action;`** directamente dentro de [`SQL/Table/Alter_New_Columns.sql`](file:///f:/Proyectos/AgenciasNew/SQL/Table/Alter_New_Columns.sql) y [`SQL/Data/Menu.sql`](file:///f:/Proyectos/AgenciasNew/SQL/Data/Menu.sql).
- *Razón*: Si la inyección no se incluye en `Alter_New_Columns.sql`, las bases de datos de clientes existentes no recibirán los nuevos módulos en su menú de navegación tras ejecutar el actualizador.

### G. Siembra Obligatoria de las 28 Tablas Maestras (`public."Master"`)
Toda tabla maestra parametrizable (`SystemParameter`, `User`, `Branch`, `Implant`, `ChargeAndTax`, `Seller`, `TicketPrinter`, `Prestadora`, `Client`, `Provider`, `ProviderType`, `Product`, `MasterVariable`, `Combo`, `SystemLog`, `Currency`, `Equivalences`, `InterfaceExtractParam`, `DocumentResolution`, `TransactionConsecutive`, `CreditCard`, `Payment`, `Countries`, `Cities`, `Airports`, `TicketType`, `QuotationState`, `QuotationFormat`) **DEBE ser sembrada con `CREATE UNIQUE INDEX IF NOT EXISTS "Master_code_key"` y `INSERT ... ON CONFLICT (code) DO NOTHING;`** directamente dentro de [`SQL/Table/Alter_New_Columns.sql`](file:///f:/Proyectos/AgenciasNew/SQL/Table/Alter_New_Columns.sql).
- *Razón*: Si alguna de las 28 tablas maestras falta en `public."Master"`, la tarjeta "Módulos del Sitio" en `/dashboard/settings` no mostrará los interruptores de activación para esa funcionalidad en las bases de datos de clientes actualizados.

### H. Preservación y Siembra de Parámetros del Sistema (`SystemParameter`)
En sentencias de siembra de datos de parámetros del sistema (`SystemParameter`), se debe usar **SIEMPRE `ON CONFLICT (code) DO NOTHING;`** dentro de [`SQL/Table/Alter_New_Columns.sql`](file:///f:/Proyectos/AgenciasNew/SQL/Table/Alter_New_Columns.sql). Queda strictly prohibido usar `ON CONFLICT (code) DO UPDATE SET value = EXCLUDED.value;`.
- *Razón*: Garantiza que se creen los parámetros iniciales del sistema (como `LICENSE_KEY`, `AGENCY_NAME`, `AGENCY_NIT`, `LICENSE_EXPIRATION_DATE`) sin sobreescribir ni borrar las credenciales y claves de licencia que el cliente ya haya configurado en su servidor.

### I. Detección Dinámica del Directorio de Instalación en Servidores Remotos
El script de instalación actualizador ([`deploy/Korex_Update.iss`](file:///f:/Proyectos/AgenciasNew/deploy/Korex_Update.iss)) **DEBE ejecutar una consulta PowerShell automatizada en la inicialización (`DetectInstalledDirectory`)** para ubicar dinámicamente:
1. El atributo `physicalPath` del sitio web activo en IIS (búsqueda por nombre `*Korex*`).
2. La ruta del ejecutable del Servicio de Windows registrado (`Korex_NextJS`).

La ruta detectada automáticamente pre-llena el campo de directorio en el asistente del instalador (`WizardForm.DirEdit.Text`).
- *Razón*: Evita que el actualizador instale los archivos en una carpeta por defecto o secundaria si el cliente ubicó el sitio en otra letra de unidad o subdirectorio (ej. `F:\Korex\Cotizaciones` vs `F:\Korex_Sistema`), salvaguardando que siempre se actualice el código ejecutable en la ruta física real.

### J. Garantía de Despliegue en Masa Limpio (Limpieza Dinámica de Sobrecargas y Secuencias)
1. **Limpieza Dinámica de Sobrecargas (`DO $$ ... DROP PROCEDURE/FUNCTION ... $$;`)**: Todo procedimiento o función inyectado en `Actualizador.sql` y en scripts `.sql` incluye un bloque dinámico `DO $$` (auto-inyectado por `deploy/validate_schema_before_package.js` si falta) que consulta `pg_proc` y elimina previamente cualquier firma o versión sobrecargada anterior. De esta manera, al actualizar clientes remotos con bases de datos antiguas que poseían firmas con diferente número o tipo de parámetros, no ocurrirá el error 42883 (`procedure does not exist`).
2. **Siembra Automatizada de Secuencias**: `deploy/validate_schema_before_package.js` escanea cualquier llamada a `nextval(...)` en los SPs e inyecta de forma transparente `CREATE SEQUENCE IF NOT EXISTS public.<secuencia> START WITH 1;` en [`SQL/Table/Alter_New_Columns.sql`](file:///f:/Proyectos/AgenciasNew/SQL/Table/Alter_New_Columns.sql).
3. **Auditoría Pre-Compilación de Firmas de Parámetros (API Routes vs DB)**: El validador auto-escanea todas las invocaciones `CALL public.sp...(...)` y `SELECT ... FROM public.fn...(...)` en `src/app/api/` y las compara con la firma real en `pg_proc` de PostgreSQL local. Si detecta discrepancias en el número de parámetros (previniendo errores 42883 por omitir columnas como `p_is_active`), **la compilación se aborta de inmediato con un error fatal**.

---

## 2. Reglas de API y Frontend (Next.js)

### A. Inclusión de Relaciones Maestras en Endpoints por ID
En endpoints de consulta única por ID (`/api/quotations/[id]`), la consulta Prisma `findUnique` debe incluir explícitamente todas las entidades maestras asociadas:
```typescript
include: {
    client: true,
    seller: true,
    branch: true,
    implant: true,
    ticketPrinter: true,
    manualServices: true,
    products: { ... }
}
```

### B. Fusión de Objetos Maestros en Formularios
En el componente de formulario (`quotation-form.tsx`), la carga de datos por ID debe fusionar los objetos devueltos (`qData.client`, `qData.seller`, `qData.branch`, `qData.implant`, `qData.ticketPrinter`) en el estado global para que los controles `SearchSelect` desplieguen inmediatamente el nombre y código de las entidades.

### C. Verificación de Relaciones en Prisma Schema (`prisma/schema.prisma`)
Cualquier modelo o tabla agregada o modificada en `prisma/schema.prisma` que contenga una relación `@relation(fields: [foreignKey], references: [id])` **DEBE contar con su campo relacional correspondiente en el modelo destino** (ej. `Interfaces` debe incluir `InterfaceExtractParam InterfaceExtractParam[]`).
- *Razón*: Si la relación inversa falta en la entidad principal, las consultas con `include: { TargetModel: true }` en las API Routes fallan en tiempo de compilación TypeScript con el error: `Type '{ TargetModel: ... }' is not assignable to type 'never'`.
### D. Visibilidad del Componente de Licenciamiento (`<LicenseStatusCard />`)
La vista principal de Configuración del Sistema (`src/app/dashboard/settings/page.tsx`) debe incluir de forma fija e inamovible el componente `<LicenseStatusCard />` para garantizar que los administradores tengan visibilidad inmediata del estado de vigencia de la licencia, NIT de la empresa, días restantes y el panel para renovar/activar claves cifradas (`KOR1`).

---

## 3. Validador Automatizado Integrado (`deploy/validate_schema_before_package.js`)

El script de validación automatizada [`deploy/validate_schema_before_package.js`](file:///f:/Proyectos/AgenciasNew/deploy/validate_schema_before_package.js) está integrado directamente en [`deploy/gen_schema_json.js`](file:///f:/Proyectos/AgenciasNew/deploy/gen_schema_json.js) y ejecuta de forma transparente 7 capas de seguridad:

1. **Despliegue Local**: Compila todos los scripts de `SQL/Function/`, `SQL/SP/` y `SQL/Procedure/` en PostgreSQL local auto-inyectando bloques `DO $$` de limpieza dinámica si faltan.
2. **Auto-Inyección de Tablas**: Detecta tablas referenciadas en SPs e inyecta bloques `CREATE TABLE IF NOT EXISTS` en `Alter_New_Columns.sql` si faltan.
3. **Inyección de Secuencias**: Verifica que toda columna `id` tenga secuencia por defecto (`DEFAULT nextval(...)`) y auto-corrige si falta.
4. **Verificación de Restricciones UNIQUE**: Garantiza las llaves de unicidad requeridas para operaciones `UPSERT` / `ON CONFLICT`.
5. **Verificación de `LEFT JOIN`**: Revisa sintácticamente que no existan `INNER JOIN` en tablas maestras.
6. **Auditoría de Firmas y Parámetros (PASO 3.5)**: Contrasta todos los llamados a Stored Procedures y Funciones en las rutas Next.js (`/api/`) contra `pg_proc` de la BD local. Cancela la compilación si existe algún descalce en el número de parámetros.
7. **Sincronización Dinámica de Actualizadores**: Sincroniza e inyecta los 125+ scripts SQL en [`Actualizador.sql`](file:///f:/Proyectos/AgenciasNew/SQL/Actualizador/Actualizador.sql) y [`Actualizador.SQL`](file:///f:/Proyectos/AgenciasNew/SQL/Actualizador.SQL).

---

## 5. Protocolo de Integridad de Backup y Entregables SQL Server (`Korex_SQLServer_Inicial_1.0.bak`)

Para garantizar que el archivo de backup inicial en blanco (`Korex_SQLServer_Inicial_1.0.bak`) generado en `deploy/BaseLimpia/` quede **100% operativo y listo para uso inmediato al restaurarse en cualquier servidor SQL Server**, se deben cumplir sin excepción las siguientes 4 reglas de validación:

### A. Procesamiento por Separación de Lotes `GO` (`mssql` Driver Compatibility)
Cualquier ejecutor Node.js que procese archivos T-SQL (`gen_sqlserver_initial_bak.js`, `sync_sqlserver_updater.js`) **DEBE utilizar la función divisora por bloques `GO` (`/^\s*GO\s*$/im`)**:
```javascript
async function executeBatchWithGo(pool, sqlScript) {
    const batches = sqlScript
        .split(/^\s*GO\s*$/im)
        .map(b => b.trim())
        .filter(b => b.length > 0);

    for (const batch of batches) {
        await pool.request().batch(batch);
    }
}
```
- *Razón*: Evita fallos de sintaxis T-SQL (`Incorrect syntax near 'GO'`) al enviar múltiples Stored Procedures o Funciones en un solo llamado al driver `mssql`.

### B. Auditoría de Unicidad Case-Insensitive en Columnas DDL (`01_Tables.sql`)
Cada tabla declarada en `SQL/SqlServer/01_Tables.sql` debe ser auditada para evitar columnas duplicadas con distinta capitalización (ejemplo: `[logo]` y `[Logo]` en `Implant`).
- *Razón*: SQL Server es case-insensitive por defecto en identificadores y aborta la creación de tablas con el error 2705 si se declara una columna más de una vez.

### C. Inclusión Completa de la Programación T-SQL (3 Funciones + 22 Stored Procedures)
El archivo compilador `SQL/SqlServer/03_Functions_And_SPs.sql` **DEBE incluir obligatoriamente**:
1. **3 Funciones Escalares**: `fnQuitarEspeciales`, `fnObtenerSiguienteConsecutivo`, `fnInterfaceExtractParamValue`.
2. **22 Procedimientos Almacenados T-SQL**: Todos los SPs de consulta de maestros (`spMonedaListar`, `spClienteListar`, `spBranchListar`, `spUserListar`, etc.) y los procesadores centrales de integración ERP Zeus (`spCotizacionesCrear` y `spFacturacionesCrear`).
- *Razón*: Garantiza que al restaurar el backup `.bak` en SSMS (SQL Server Management Studio), la carpeta `Programación` (Procedimientos almacenados y Funciones de valor escalar) quede 100% poblada y funcional sin requerir compilaciones manuales posteriores.

### D. Verificación Automatizada de la Suite Completa (`scripts/validate_full_suite.js`)
Antes de finalizar cualquier desarrollo o entregar paquetes, se DEBE ejecutar:
```bash
node scripts/validate_full_suite.js
```
Validando que las 11 capas (PostgreSQL local, Json Schema, T-SQL Scripts y Suites de Despliegue SQL Server) respondan con **`✅ OK`**.

---

## 6. Regla Crítica – Ejecución Completa, Manifest y Verificación Post-Actualización (Reglas 45-72)

1. **Principio Absoluto del Actualizador**:
   > *"Todo lo que deba ejecutarse debe ejecutarse y todo lo que no se ejecute debe ser reportado."*
   El actualizador NUNCA puede terminar mostrando *"Actualización exitosa"* o devolver `EXIT CODE 0` si un script, SP, función, migración, tabla, columna, índice, vista o prueba no fue ejecutado o falló.

2. **Manejo de Errores y No Silencio**:
   Queda estrictamente prohibido ocultar errores, ignorar excepciones, continuar silenciosamente o clasificar como warning errores que impidan completar la actualización.

3. **Verificación Post-Ejecución (`EJECUTADO + VALIDADO = OK`)**:
   No se acepta considerar un script como completado únicamente por haber sido invocado (`EJECUTADO = OK`). Debe verificarse explícitamente en la base de datos la presencia, compilación y validez del objeto (`EJECUTADO + VALIDADO = OK`).

4. **Clasificación de Estados por Componente**:
   Cada objeto del plan de actualización debe terminar con un estado explícito: `OK`, `ERROR`, `OMITIDO`, `NO EJECUTADO`, `NO APLICA`.

5. **Códigos de Salida Reales (`EXIT CODE`)**:
   - `EXIT CODE 0`: Actualización 100% exitosa y validada.
   - `EXIT CODE 1`: Actualización incompleta o con errores.
   - `EXIT CODE 2`: Validación final / post-check fallido.
   - `EXIT CODE 3`: Problema de configuración.
   - `EXIT CODE 4`: Problema de conexión.
   - `EXIT CODE 5`: Rollback ejecutado.

6. **Cadena de Validación Desarrollo → Release → Producción**:
   Exige manifest de release, comprobación en base limpia, prueba desde versión previa, validación con datos reales y Smoke Test post-actualización. Se prohíbe asumir que *"funciona en desarrollo = funciona en producción"*.


