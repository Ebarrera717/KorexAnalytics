# Reglas de Codificación y Desarrollo - Proyecto AgenciasNew

Este documento contiene las directrices, estándares y reglas del proyecto para guiar la asistencia en programación y despliegue del sistema AgenciasNew.

---

## 1. Reglas de Base de Datos y SQL

- **REGLA METODOLÓGICA DE CREACIÓN Y DISEÑO DE SKILLS**: Toda nueva Skill o actualización de Skill **DEBE redactarse como un principio de arquitectura universal, patrón abstracto de solución o regla de diseño reutilizable**, evitando limitar las instrucciones a casos de prueba puntuales o valores del momento. Debe abstraer la causa raíz técnica y ofrecer una directriz general que resuelva automáticamente esa categoría de problema en cualquier desarrollo futuro de la plataforma.
- **SKILL OBLIGATORIA DE CONTROL INTEGRAL DE GENERACIÓN, LIBERACIÓN Y VALIDACIÓN DE OBJETOS DE BASE DE DATOS (`control-integral-liberacion-db`)**: *"Ningún objeto de BD (SP, función, tabla, columna, vista o índice) desarrollado o corregido en Korex puede quedar fuera de la generación, instalación, actualización o distribución hacia producción. Todos los mecanismos de liberación (Instalador, Actualizador, Generador Directo de SPs, scripts individuales) operan bajo el **Release Guardian unificado** (`scripts/korex_database_release_guardian.js`), el cual realiza escaneo multi-fuente, comparación estricta de inventarios (BD vs Archivos vs Manifest), control de conteo exacto ($\text{Detectados} = \text{Esperados} = \text{Generados} = \text{Manifest}$), generación de hashes y validación bloqueante (Fail Fast con Exit Code 1). Ningún SP o release se considera liberado sin validación del Guardian."* Se deben seguir estrictamente las directivas del Skill [`control-integral-liberacion-db`](file:///f:/Proyectos/AgenciasNew/.agents/skills/control-integral-liberacion-db/SKILL.md).
- **SKILL OBLIGATORIA DE GENERACIÓN CENTRALIZADA DE SPS Y FUNCIONES PARA CAMBIOS DIRECTOS (`generacion-centralizada-sps-funciones-cambios-directos`)**: *"Establece una ubicación única, predecible y obligatoria para Stored Procedures y Functions para distribución y cambios rápidos manuales en bases de datos de clientes (`SQL/SqlServer/`, `SQL/PostgreSQL/`, `SQL/ZeusERP/`), generando simultáneamente archivos individuales y consolidados (`TODOS_LOS_SPS_Y_FUNCIONES_SQLSERVER.sql`, `TODOS_LOS_SPS_Y_FUNCIONES_POSTGRESQL.sql`, `TODOS_LOS_SPS_Y_FUNCIONES_ZEUSERP.sql`) bajo estricta validación $\text{Detectados} = \text{Individuales} = \text{Consolidado}$ sin alterar el mecanismo de compilación existente."* Se deben seguir estrictamente las 22 directivas del Skill [`generacion-centralizada-sps-funciones-cambios-directos`](file:///f:/Proyectos/AgenciasNew/.agents/skills/generacion-centralizada-sps-funciones-cambios-directos/SKILL.md).
- **SKILL OBLIGATORIA DE INSTRUCCIONES DE APLICACIÓN EN PRODUCCIÓN (`instrucciones-aplicacion-produccion`)**: *"Todo desarrollo, modificación, corrección o ajuste en Korex debe incluir obligatoriamente una descripción clara, exacta y no ambigua de las **ACCIONES REQUERIDAS EN PRODUCCIÓN** (Base de Datos, Sitio, Servicios, Configuración, `.env`, orden de ejecución y validación posterior) para que el operador pueda aplicarlo sin tener que interpretar, deducir o investigar archivos o pasos por su cuenta."* Se deben seguir estrictamente las 10 directivas y la plantilla del Skill [`instrucciones-aplicacion-produccion`](file:///f:/Proyectos/AgenciasNew/.agents/skills/instrucciones-aplicacion-produccion/SKILL.md).
- **SKILL MAESTRO DE ACTUALIZACIÓN PRODUCTIVA VERIFICABLE, AUTODIAGNÓSTICO Y REPARACIÓN (`korex-update-guardian`)**: *"Ningún actualizador de Korex puede finalizar mostrando 'Actualización exitosa' si un solo objeto (SP, función, tabla, columna o índice) falló, fue omitido o no coincide con el Manifest del Release. Todo servidor Korex incluye las 4 tablas de control (`Korex_UpdateHistory`, `Korex_UpdateObjects`, `Korex_UpdateErrors`, `Korex_Installation`), el ejecutable de verificación (`node scripts/korex_updater_guardian.js`) y la herramienta de diagnóstico y autoreparación (`node scripts/korex_diagnostico.js`)."* Se deben seguir estrictamente las directivas del Skill [`korex-update-guardian`](file:///f:/Proyectos/AgenciasNew/.agents/skills/korex-update-guardian/SKILL.md).
- **SKILL MAESTRO DE CONTROL ABSOLUTO DE RELEASE, MANIFEST, CONEXIÓN Y ACTUALIZACIÓN SQL SERVER (`control-absoluto-release-manifest-sqlserver`)**: *"Garantiza que ninguna actualización de Korex SQL Server pueda omitir objetos existentes, generar manifests parciales, ejecutar contra bases no configuradas, utilizar fallbacks de desarrollo o finalizar sin validación del Guardian."* Se deben seguir estrictamente las 29 reglas del Skill [`control-absoluto-release-manifest-sqlserver`](file:///f:/Proyectos/AgenciasNew/.agents/skills/control-absoluto-release-manifest-sqlserver/SKILL.md).
- **SKILL MAESTRA KOREX Y VALIDADOR AUTOMÁTICO OBLIGATORIO (`korex-master-rules`)**: *"Ningún cambio de Korex puede llegar a producción basándose únicamente en que funcionó en desarrollo. El componente `KorexValidator` (`scripts/korex_validator.js` / `ValidarKorex.bat`) opera bajo un **Sistema de Tres Barreras Infranqueables** (1. Validación Previa, 2. Ejecución Controlada Fail Fast, 3. Auditoría Posterior) y es una pieza versionada y obligatoria en el pipeline de desarrollo, empaquetado (`GenerarSetup.bat`, `GenerarActualizador.bat`, `GenerarSetupSqlServer.bat`, `GenerarActualizadorSqlServer.bat`) y actualización. Ante cualquier error no validado en ejecución de bloques GO o inconsistencia en SPs (`spExportInvoices`, etc.), el proceso DEBE detenerse inmediatamente, mostrar el error técnico y bloquear el proceso."* Se deben seguir estrictamente las 34 reglas del Skill [`korex-master-rules`](file:///f:/Proyectos/AgenciasNew/.agents/skills/korex-master-rules/SKILL.md).
- **REGLA MAESTRA DE CONTROL DE REGRESIONES Y PROTECCIÓN DE CORRECCIONES (`correcciones-permanencia-proteccion`)**: *"Ninguna corrección, funcionalidad, configuración, SP, tabla, parámetro, proceso, interfaz o comportamiento que ya haya sido validado en Korex puede perderse, sobrescribirse, eliminarse, alterarse o degradarse en desarrollos posteriores. Principio obligatorio: TODO LO QUE SE CORRIGE, SE PROTEGE ACUMULATIVAMENTE."* Se deben seguir estrictamente las 22 directivas y el checklist del Skill [`correcciones-permanencia-proteccion`](file:///f:/Proyectos/AgenciasNew/.agents/skills/correcciones-permanencia-proteccion/SKILL.md).
- **REGLA DE ORO DE DESARROLLO MULTIBASE (PostgreSQL + SQL Server)**: *"PostgreSQL y SQL Server son plataformas oficialmente soportadas. Todo cambio futuro debe diseñarse, implementarse y validarse para ambas desde el inicio. Ningún desarrollo se considera terminado si solo funciona en uno de los dos motores."* Se deben seguir estrictamente todas las directivas y el checklist obligatorio del Skill [`desarrollo-multibase`](file:///f:/Proyectos/AgenciasNew/.agents/skills/desarrollo-multibase/SKILL.md).
- **REGLA OBLIGATORIA DE TESTING AUTOMATIZADO MULTIBASE**: *"Todo cambio o requerimiento debe contar con su prueba automatizada ejecutable y ser validado en PostgreSQL y SQL Server con 100% de coincidencia funcional."* Se deben ejecutar y cumplir las 11 capas de verificación del Skill [`automated-multidb-testing`](file:///f:/Proyectos/AgenciasNew/.agents/skills/automated-multidb-testing/SKILL.md) (`node scripts/validate_full_suite.js`).
- **REGLA ABSOLUTA DE AISLAMIENTO DE MOTORES (UN MOTOR ACTIVO = UNA ÚNICA INFRAESTRUCTURA)**: *"PostgreSQL y SQL Server son infraestructuras independientes. Cuando el sistema opera en un motor seleccionado (`isSQLServerMode()`), el 100% de las operaciones, transacciones, SPs, importaciones, CRUDs, consultas y reportes DEBEN ejecutarse exclusivamente en ese motor. Queda estrictamente PROHIBIDO conectarse, insertar, actualizar, eliminar, consultar o ejecutar SPs en el motor que no se encuentra activo."* Se deben seguir estrictamente todas las directivas y la matriz de aislamiento del Skill [`motor-engine-isolation`](file:///f:/Proyectos/AgenciasNew/.agents/skills/motor-engine-isolation/SKILL.md).
- **REGLA DE SINCRONIZACIÓN AUTÓNOMA Y TIEMPO REAL ZEUS ERP (`zeus-sync`)**: *"Toda actualización o edición de procedimientos almacenados (`.sql`), funciones o tablas DDL en el proyecto DEBE sincronizarse e inyectarse automáticamente en la base de datos activa de Zeus ERP (SQL Server) en tiempo real durante el desarrollo."* Se debe usar la herramienta autónoma `node deploy/sync_zeus_erp.js` (o en modo observador `--watch`) y seguir el Skill [`zeus-sync`](file:///f:/Proyectos/AgenciasNew/.agents/skills/zeus-sync/SKILL.md).
- **REGLA ABSOLUTA DE IDENTIFICACIÓN DE BASE ZEUS ERP Y VALIDACIÓN DE SPS (`zeus-sp-execution-validator`)**: *"Siempre que se ejecute, sincronice o valide un Stored Procedure de integración con Zeus ERP (`spFacturacionesCrear`, `spCotizacionesCrear`), la base de datos destino es ESTRICTA Y EXCLUSIVAMENTE la configurada en los Parámetros del Sistema (`BaseSQLServer`), en este entorno `ZeusAgencias_23`, NUNCA `Korex_pruebas`. Queda estrictamente PROHIBIDO confundir `Korex_pruebas` (base interna de Korex) con `ZeusAgencias_23` (base protegida de Zeus ERP). Al terminar cualquier desarrollo que toque SPs de Zeus ERP, es OBLIGATORIO ejecutar `node scripts/validate_zeus_sps.js` para verificar la presencia activa de los SPs en Zeus ERP antes de dar por finalizada la tarea."* Seguir el Skill [`zeus-sp-execution-validator`](file:///f:/Proyectos/AgenciasNew/.agents/skills/zeus-sp-execution-validator/SKILL.md).
- **REGLA OBLIGATORIA DE SEPARACIÓN DE BASES DE DATOS (`.env` vs Parámetros → SQL Server)**: La base principal de Korex es únicamente la configurada en el `.env` (PostgreSQL o SQL Server local como `Korex_pruebas`), la cual almacena toda la operación interna, maestros, cotizaciones, facturas, movimientos, trazabilidad, diagnósticos y errores. La importación de Excel y la creación/edición local son **procesos 100% internos de Korex** y NUNCA deben invocar ni depender de los SPs de exportación a Zeus ERP (`spFacturacionesCrear`, `spCotizacionesCrear` en la base externa protegida `ZeusAgencias_23`) de forma automática. La exportación externa se ejecuta EXCLUSIVAMENTE al hacer clic en *"Enviar a Zeus ERP"* o cuando el parámetro automático (`EnviarFacturasAutoSQLserver` / `EnviarCotizacionesAutoSQLserver`) esté configurado explícitamente en `'1'`. Se deben seguir estrictamente todas las directivas del Skill [`db-separation-architecture`](file:///f:/Proyectos/AgenciasNew/.agents/skills/db-separation-architecture/SKILL.md).
- **REGLA CRÍTICA DE INMUTABILIDAD Y PROTECCIÓN DE BASE DE DATOS EXTERNA ZEUS ERP (`zeus-external-db-protection`)**: *"La base de datos de interfase de Zeus ERP (`ZeusAgencias_23`) es una BASE DE DATOS EXTERNA e INMUTABLE. Korex NUNCA debe modificar, alterar, eliminar, reemplazar, recrear ni ejecutar `ALTER PROCEDURE`, `ALTER TABLE`, `ALTER FUNCTION`, `DROP` ni `DELETE` sobre objetos nativos existentes de Zeus ERP. La integración se realiza EXCLUSIVAMENTE mediante Procedimientos Almacenados propios de Korex (`spFacturacionesCrear`, `spCotizacionesCrear`) creados en `SQL/ZeusERP/`. Korex se adapta a Zeus ERP; Zeus ERP NO se adapta a Korex."* Se deben seguir estrictamente todas las directivas del Skill [`zeus-external-db-protection`](file:///f:/Proyectos/AgenciasNew/.agents/skills/zeus-external-db-protection/SKILL.md).
- **REGLA CRÍTICA DE PROTECCIÓN DE BASES DE DATOS Y PREVENCIÓN DE PÉRDIDA DE INFORMACIÓN**: *"Ningún desarrollo, script, migración, instalador, proceso automático, prueba o actualización puede eliminar, recrear o reemplazar la base de datos principal de Korex (`.env`) ni la base externa protegida (`ZeusAgencias_23`). Toda migración debe ser strictly incremental y no destructiva (`ALTER TABLE`, `ADD COLUMN`, `CREATE INDEX`, `CREATE PROCEDURE`), preservando el 100% de la información operacional existente."* Se deben seguir strictly todas las directivas del Skill [`db-protection-security`](file:///f:/Proyectos/AgenciasNew/.agents/skills/db-protection-security/SKILL.md).
- **REGLA UNIVERSAL DE ASIGNACIÓN DE CUENTAS CONTABLES (`CARGOS` vs `IMPUESTOS`)**:
  - **Para CARGOS / SERVICIOS**: La determinación de la cuenta contable DEBE seguir estrictamente un orden de prioridad de 3 niveles:
    1. **1ª Prioridad - Tipo de Servicio (`TiposServicios.cd_cuenta`)**: Si el Tipo de Servicio posee una cuenta no nula y no vacía, se asigna esa cuenta.
    2. **2ª Prioridad - Concepto de Facturación (`ConceptoFacturacion.cd_cuenta`)**: Si el Tipo de Servicio no posee cuenta, se busca en el Concepto de Facturación.
    3. **3ª Prioridad - Cargo (`CargosDesc.cd_cuenta`)**: Como **último recurso**, si ni el Tipo de Servicio ni el Concepto de Facturación poseen cuenta, se toma la cuenta del Cargo.
    4. **Prohibición de Fallbacks Arbitrarios y Error Controlado**: Si NINGUNO de los 3 niveles posee cuenta contable parametrizada, QUEDA STRICTAMENTE PROHIBIDO asignar cuentas por defecto de forma arbitraria (ej. `ORDER BY id ASC`, `'28151080'`). En su lugar, se debe detener la transacción y emitir un error controlado (`RAISERROR` / excepción): `❌ Error de Parametrización Contable: No fue posible determinar la cuenta contable para el Cargo/Servicio "<NombreCargo>". Verifique la parametrización en Tipo de Servicio, Concepto de Facturación o Cargo.`
  - **Para IMPUESTOS**:
    1. La cuenta contable se obtiene **DIRECTAMENTE** de la configuración del Impuesto (`ImpRet.cd_cuenta`).
    2. **NO SE APLICA** la búsqueda de 3 niveles.
    3. Si el Impuesto no posee cuenta contable configurada, se debe detener la transacción y emitir un error controlado: `❌ Error de Parametrización Contable: El Impuesto "<NombreImpuesto>" no tiene cuenta contable configurada en la tabla de Impuestos (ImpRet).`
- **REGLA PRIMORDIAL DE ARQUITECTURA (Lógica en Base de Datos)**: Todo desarrollo, cálculo, proceso de negocio, liquidación, consulta de listado, validación o mutación de datos en AgenciasNew **DEBE realizarse obligatoria y prioritariamente a través de Procedimientos Almacenados (SPs), Funciones SQL y Tablas de Base de Datos** (PostgreSQL local `Korex_colaereo` y SQL Server producción).
  - **Excepción Única**: Únicamente cuando sea técnicamente imposible realizar el procesamiento dentro de la base de datos (por ejemplo: renderizado estético de interfaz React, manipulación directa del DOM o manejo de cookies HTTP de sesión en Edge Runtime), se permitirá implementar dicha lógica en el sitio web / frontend (Next.js).

### PostgreSQL (Base Local - Korex_colaereo)
- **Mayúsculas en Nombres de Tablas/Relaciones**: Las tablas del sistema local usan PascalCase y deben ser referenciadas exactamente igual con comillas dobles si es necesario (`public."Quotation"`, `public."Client"`, `public."QuotationProduct"`, `public."Role"`).
- **Tratamiento de Nulos y Joins**: 
  - Utilizar siempre `COALESCE` al realizar consultas para evitar valores inesperados de tipo `NULL`.
  - **Uso obligatorio de `LEFT JOIN`**: En funciones de listado/historial (`fnCotizacionListar`, `fnCotizacionHistorial`, `fnRoleListar`, `fnCotizacion`), usar **SIEMPRE `LEFT JOIN`** para las tablas relacionables (`Client`, `User`, `Branch`, etc.). NUNCA usar `INNER JOIN` (`JOIN`) al relacionar `Client` o `User` para evitar ocultar cotizaciones con clientes no asignados o descalzados en servidores externos.
  - En las cláusulas `WHERE`, asegurar que las búsquedas por texto soporten clientes o usuarios nulos: `(p_cliente IS NULL OR TRIM(p_cliente) = '' OR (c.name IS NOT NULL AND c.name ILIKE '%' || TRIM(p_cliente) || '%'))`.
- **Tratamiento de XML**: 
  - Al generar el XML de exportación en `spExportQuotation`, los nombres de las etiquetas deben ser coherentes (minúsculas).
  - Al agregar tablas secundarias como detalles, verificar la FK correcta usando el ID de referencia del producto/servicio (`orig_id_ref`) y no el ID de la cotización.
- **Garantía de Despliegues en Masa (0 Errores en Bases de Datos Actualizadas)**:
  - **Limpieza Dinámica Universal de Sobrecargas de SPs/Funciones**: Todo procedimiento almacenado o función en `Actualizador.sql` y en scripts `.sql` DEBE incluir un bloque `DO $$` que consulte `pg_proc` y elimine previamente cualquier firma/sobrecarga anterior del procedimiento o función (`DROP PROCEDURE/FUNCTION IF EXISTS ... CASCADE`). Esto evita de forma estricta que bases de datos de clientes actualizadas fallen con el error 42883 (`procedure does not exist`) al haber tenido firmas con distinto número o tipo de parámetros.
  - **Siembra Autodetectada de Secuencias (`CREATE SEQUENCE IF NOT EXISTS`)**: Ningún procedimiento almacenado, función o API puede depender de secuencias no declaradas (`error 42P01`). `deploy/gen_schema_json.js` auto-escaneará previamente (en PASO 0.5 antes de compilar SPs) todas las llamadas a `nextval(...)` en las carpetas `SQL/` y `src/app/api/`, creándolas inmediatamente en PostgreSQL local e inyectando `CREATE SEQUENCE IF NOT EXISTS public.nombre_secuencia START WITH 1;` en el nivel superior de `Alter_New_Columns.sql` y `Actualizador.sql`.
- **Regla General de Integridad Relacional, Columnas DDL y Prisma**:
  - **Prevención de Error 42703 (no existe la columna)**: Antes de escribir cualquier SP o consulta SQL que referencie una columna de tabla (ejemplo: `ip."ticketCode"`), **SE DEBE VERIFICAR Y DECLARAR LA COLUMNA PRIMERO**:
    1. En `SQL/Table/Alter_New_Columns.sql`: Tanto en `CREATE TABLE` como en el bloque de alteración `ALTER TABLE public."Tabla" ADD COLUMN IF NOT EXISTS "columna" tipo;`.
    2. En `prisma/schema.prisma`: Declarar el campo en el modelo correspondiente.
    3. Executar `node deploy/gen_schema_json.js`: Aplicar la alteración a PostgreSQL local y regenerar Prisma ORM (`npx prisma generate`) **ANTES** de compilar o invocar SPs o endpoints que consuman esa columna.
- **Garantía de Filtros y Datos Base (`base-data-integrity`)**: Toda actualización de base de datos o API base debe validar obligatoriamente las 4 capas del Skill [`base-data-integrity`](file:///f:/Proyectos/AgenciasNew/.agents/skills/base-data-integrity/SKILL.md), ejecutando `node deploy/gen_schema_json.js` y probando que `/api/quotations/base-data` devuelva HTTP 200 con todos sus arreglos poblados.
- **Flujo Obligatorio al modificar Funciones SQL / SPs (PostgreSQL + SQL Server)**:
  1. **Compilación e Inyección Inmediata Local**: Ejecutar obligatoria e INMEDIATAMENTE en el mismo turno el desplegador e inyector de base de datos en los entornos locales de PostgreSQL (`node deploy/gen_schema_json.js`) y SQL Server activos. NUNCA responder al usuario ni terminar el turno tras tocar o corregir un `.sql` sin haber inyectado y verificado la compilación limpia en la base de datos local.
  2. Consultar al usuario en español si desea generar el instalador y actualizador automáticamente o si prefiere realizarlo manualmente (Skill [`installer-decision`](file:///f:/Proyectos/AgenciasNew/.agents/skills/installer-decision/SKILL.md)).
  3. Si aprueba automático: Generar el empaquetado standalone (`powershell.exe -ExecutionPolicy Bypass -File deploy/Generar_Empaquetado.ps1`) y compilar con `GenerarSetup.bat` / `GenerarActualizador.bat`.
  4. Si prefiere manual: Entregar instrucciones y scripts para compilación manual por parte del usuario.

### SQL Server (Base de Producción/Agencias)
- **Estructura Zeus ERP**: Las tablas del ERP Zeus tienen nombres de columna heredados específicos. Evitar el uso de nombres genéricos:
  - En `dbo.CLIENTES`, usar `IDCLIENTE`, `RAZONCIAL`, `DIRECCION`, `TELEFONO`, `CIUDAD`, `EMAIL`.
  - En `dbo.MAEVENDE`, usar `IDVENDE`, `NOMBVENDE`.
  - En `dbo.PROVEEDORES`, usar `IDPROVE`, `RAZONCIAL`, `CODICTA`.
- **Sensibilidad a Mayúsculas en XML XPath**: Al procesar el XML importado en `spCotizacionesCrear`, utilizar exactamente las etiquetas generadas en Postgres (minúsculas como `cd_cotizacion`, `ds_fpnm`, `am_valor_me`, etc.) ya que la función `.value()` de SQL Server es strictly Case-Sensitive.
- **Sincronización del Actualizador**: Cualquier cambio realizado en los Procedimientos Almacenados (ej. `spCotizacionesCrear.sql` o `spFacturacionesCrear.sql`) **debe ser replicado obligatoriamente** en el archivo del script actualizador `SQL/Actualizador/ActualizadorSERVER.sql` y `SQL/Actualizador/Actualizador.sql`.
- **Casteo y Binding Dinámico de Parámetros T-SQL (`src/lib/sqlserver.ts`)**: Todo parámetro pasado a `executeSQLServerProcedure` DEBE evaluar dinámicamente su tipo JavaScript: enteros a `mssql.Int`, flotantes a `mssql.Float`, booleanos a `mssql.Bit` y nulos a `null`. NUNCA enviar números enteros a ciegas como `mssql.VarChar(MAX)`.
- **Resiliencia de Llaves Foráneas (FK) en SPs T-SQL**: Todo procedimiento de creación o edición (`spCotizacionCrear`, `spCotizacionActualizar`, etc.) DEBE validar la existencia de llaves foráneas optativas (`clientId`, `branchId`, `sellerId`, `implantId`, `ticketPrinterId`, `userId`) antes de insertar (`IF @clientId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.[Client] WHERE id = @clientId) SET @clientId = NULL;`), evitando que inserciones fallen si las tablas maestras locales están vacías.
- **Reseteo Universal de Consecutivos (IDs) al Vaciar Tablas**: Todo procedimiento de eliminación (`spCotizacionEliminar`, etc.) DEBE verificar si la tabla principal quedó totalmente vacía tras el borrado (`IF NOT EXISTS (SELECT 1 FROM dbo.[Quotation])`) y ejecutar `DBCC CHECKIDENT ('dbo.[Quotation]', RESEED, 0);` en SQL Server y reiniciar la secuencia correspondiente en PostgreSQL, garantizando que el siguiente registro inicie obligatoriamente en ID **#1**.
- **Defectos Numéricos y Nulabilidad Resiliente en DDL**: Todos los campos numéricos o financieros en `SQL/SqlServer/01_Tables.sql` DEBEN definirse como `FLOAT NULL CONSTRAINT DF_... DEFAULT 0` o `INT NULL`, evitando errores de inserción nula cuando faltan parámetros opcionales.

---

## 2. Reglas de Next.js y TypeScript (Frontend)

- **Puerto del Servidor**: El servidor local de desarrollo y producción de Next.js se arranca por defecto en el puerto **`3001`** (configurado en `iniciar-next.bat`).
- **Prisma ORM**: 
  - Al realizar modificaciones de base de datos en Postgres, ejecutar siempre `npx prisma db pull` seguido de `npx prisma generate` para sincronizar los modelos locales.
  - Asegurar la detención y el reinicio correcto del servidor Next.js cuando se modifique el esquema de la base de datos o variables de entorno.
- **Acceso a Datos**: Usar las relaciones de Prisma de forma segura y tipada en TypeScript, manejando correctamente los posibles nulos.
- **Validación Obligatoria de Listado en Maestros**: Antes de dar por finalizado cualquier desarrollo o modificación en cualquier pantalla o maestro (Cargos e Impuestos, Proveedores, Clientes, Usuarios, Productos, Sucursales, etc.), se debe ejecutar obligatoriamente la prueba de la API o función de consulta/listado correspondiente (`public.fn...Listar()` o API Route) y validar que liste los datos de manera limpia, sin desalinear columnas y sin devolver `0 registros` por fallas no capturadas.

---

## 3. Reglas de Control de Cambios y Git

- **Pruebas y Despliegue Local**: Todo desarrollo, modificación de base de datos o cambio en la interfaz debe ser generado y probado de manera strictly local.
- **Subida Completa del Proyecto Local**: Cuando el usuario indique **"subir a git"** (o equivalentes), se debe subir **todo el estado del proyecto local** (`git add .`), incluyendo nuevos scripts, modales, endpoints, componentes, funciones SQL y actualizadores creados, respetando únicamente el `.gitignore`.
- **Autorización para Git**: Bajo ninguna circunstancia se deben subir cambios a Git o realizar commits en ramas remotas sin la previa verificación de pruebas locales y la autorización explícita del usuario.
- **Descargas y Actualizaciones de Git**: No se deben realizar descargas automáticas, actualizaciones, clonaciones o `git pull` de ramas remotas de forma automática. Cualquier descarga o actualización de código desde Git debe realizarse única y exclusivamente cuando el usuario lo solicite de manera explícita.

---

## 4. Regla de Actualización Continua del Manual Operativo Interactivo

- **Actualización Obligatoria**: Cada vez que se agregue o modifique un desarrollo en la plataforma (nuevo SP, API route, modal o pantalla), se DEBE actualizar obligatoriamente el archivo [`src/data/manual/modules.ts`](file:///f:/Proyectos/AgenciasNew/src/data/manual/modules.ts) siguiendo la guía del Skill [`manual-updater`](file:///f:/Proyectos/AgenciasNew/.agents/skills/manual-updater/SKILL.md).
- **Mantenimiento**: La documentación interactiva disponible en la ruta `/dashboard/manual` debe acumular y reflejar de manera continua e incremental todas las funcionalidades activas del sistema.

---

## 5. Regla de Registro Estricto en Creación de Maestros (`TAB_CONFIG`)

- **Prohibición Absoluta de Fallbacks a "Implant"**: Todo nuevo maestro agregado a `/dashboard/settings` debe declararse obligatoriamente en el diccionario fuertemente tipado `TAB_CONFIG: Record<Tab, TabConfigItem>` en [`src/app/dashboard/settings/page.tsx`](file:///f:/Proyectos/AgenciasNew/src/app/dashboard/settings/page.tsx). Queda estrictamente prohibido usar cadenas de ternarios o fallbacks por defecto hacia `'Implant'` o `'/api/config/implants'`.
- **Skill Obligatorio**: Al crear o modificar cualquier maestro, se deben seguir sin excepción las instrucciones del Skill [`master-creation`](file:///f:/Proyectos/AgenciasNew/.agents/skills/master-creation/SKILL.md).

---

## 6. Reglas de Preservación y Sembrado en Empaquetado y Actualizadores

- **Siembra Obligatoria de Módulos de Menú (`public."Menu"`)**: Todo nuevo módulo de navegación (`Pre-Cotizaciones`, `Ejecuciones`, `Manual Operativo`, etc.) **DEBE ser sembrado e inyectado explícitamente en [`SQL/Table/Alter_New_Columns.sql`](file:///f:/Proyectos/AgenciasNew/SQL/Table/Alter_New_Columns.sql)** con `CREATE UNIQUE INDEX IF NOT EXISTS "Menu_code_key"` e `INSERT ... ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, action = EXCLUDED.action;`. De lo contrario, las bases de datos de clientes actualizados no recibirán los nuevos módulos en el menú lateral.
- **Siembra Obligatoria de Tablas Maestras (`public."Master"`)**: Todo nuevo maestro parametrizable agregado al sistema (`Tipos de Proveedor`, `Extracción Interfaces`, `Resoluciones`, `Consecutivos`, etc.) **DEBE ser sembrado explícitamente en [`SQL/Table/Alter_New_Columns.sql`](file:///f:/Proyectos/AgenciasNew/SQL/Table/Alter_New_Columns.sql)** con `CREATE UNIQUE INDEX IF NOT EXISTS "Master_code_key"` e `INSERT ... ON CONFLICT (code) DO NOTHING;`. Esto garantiza que la tarjeta con el interruptor para habilitar o deshabilitar la pestaña aparezca inmediatamente en `Módulos del Sitio`.
- **Preservación Estricta de Parámetros (`SystemParameter ON CONFLICT DO NOTHING`)**: Queda estrictamente prohibido utilizar `ON CONFLICT (code) DO UPDATE SET value = EXCLUDED.value;` en scripts de siembra de parámetros (`SystemParameter` en `SQL/Inicial.sql` o `Alter_New_Columns.sql`). Se debe usar **SIEMPRE `ON CONFLICT (code) DO NOTHING;`** para evitar sobreescribir o borrar la configuración de servidores y credenciales de la agencia en el cliente.
- **Visibilidad Permanente de Licencia (`<LicenseStatusCard />`)**: La pantalla de Configuración del Sistema (`src/app/dashboard/settings/page.tsx`) debe incluir de manera fija e inamovible el componente `<LicenseStatusCard />` para desplegar el estado de vigencia, NIT, razón social y panel de renovación/activación de claves cifradas (`KOR1`).
- **Verificación Automatizada Obligatoria**: Antes de generar ejecutables instaladores/actualizadores (`Korex_Setup.exe` y `Korex_Update_Setup.exe`), es obligatorio ejecutar `node deploy/gen_schema_json.js`, el cual valida automáticamente estas reglas en 6 capas de seguridad (Skill [`updater-verification`](file:///f:/Proyectos/AgenciasNew/.agents/skills/updater-verification/SKILL.md)).

---

## 7. Regla de Impresión y Comisiones (`quotation-print-commissions`)

- **Procesamiento de Comisiones y Empaquetado**: Toda modificación en el cálculo de comisiones, plantillas HTML de impresión o empaquetado standalone debe seguir estrictamente las directrices del Skill [`quotation-print-commissions`](file:///f:/Proyectos/AgenciasNew/.agents/skills/quotation-print-commissions/SKILL.md).

---

## 8. Reglas de Armonía y Estándar de Diseño de UI (`ui-design-harmony`)

- **Estandarización Obligatoria de Botones y Componentes**: Todo nuevo botón de creación (`+ Nuevo ...`), botón secundario, modal, icono de menú lateral o tarjeta de maestro **DEBE cumplir estrictamente los patrones de estilo y tokens Tailwind definidos en el Skill [`ui-design-harmony`](file:///f:/Proyectos/AgenciasNew/.agents/skills/ui-design-harmony/SKILL.md)**.
- **Prohibición de Estilos Inconsistentes**: Queda estrictamente prohibido usar colores arbitrarios o dispares (ej. botones de creación negros, naranjas o verdes sin justificación de token) o tamaños desiguales (`h-14`, `h-11`, `text-xs`) entre módulos. Los botones de creación principal siempre serán de azul primario (`bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12 px-5 text-sm font-bold shadow-md shadow-blue-500/20`).

---

## 9. Regla de Arquitectura de Instalación y Despliegue SQL Server (Base Inicial .BAK vs Migración)

- **Prohibición Absoluta de `CREATE DATABASE` en Instaladores**: El instalador de SQL Server **NO DEBE ejecutar `CREATE DATABASE`** ni depender de que el usuario ejecutor posea permisos administrativos para crear bases de datos. La infraestructura/cliente es la única responsable de crear/restaurar la base de datos y entregar las credenciales de conexión (`Servidor`, `Instancia`, `Puerto`, `Base de Datos`, `Usuario`, `Clave`). El instalador únicamente valida la conexión y los permisos en la base existente.
- **Entrega de Base SQL Server Inicial en Blanco (`.BAK`)**: Debe existir un proceso independiente mediante el cual el equipo de desarrollo genere un archivo de backup en blanco (`Korex_SQLServer_Inicial_X.X.bak`) preparado para nuevas instalaciones de clientes. Este backup debe contener:
  - Estructura completa de tablas, PKs, FKs, índices, constraints, vistas, SPs, funciones, triggers y consecutivos.
  - Catálogos maestros obligatorios y parámetros básicos requeridos por la aplicación.
  - **Sin información operativa del cliente**.
- **Generación Automatizada del Backup Inicial**: El proyecto debe contar con un procedimiento documentado/script que cree una base de datos temporal, aplique la estructura T-SQL completa, inyecte las semillas iniciales, valide la integridad y exporte el archivo `.BAK` emparejado con la versión exacta de la aplicación (`Korex_SQLServer_Inicial_1.0.bak`).
- **Separación Estricta entre Base Inicial y Migración**:
  - **Cliente Nuevo**: Restaura la base inicial `.BAK` en blanco y configura la conexión de la aplicación.
  - **Cliente Existente (PostgreSQL)**: Ejecuta el proceso de migración independiente `PostgreSQL -> SQL Server` para trasladar sus datos operativos y luego configura la aplicación.
- **Auditoría Automatizada Obligatoria de Entregables (`scripts/validate_full_suite.js`)**: Todo cambio en T-SQL, actualizadores o instaladores de SQL Server DEBE ser verificado ejecutando `node scripts/validate_full_suite.js` en 11 capas de seguridad (Skill [`updater-verification`](file:///f:/Proyectos/AgenciasNew/.agents/skills/updater-verification/SKILL.md)), garantizando 22 SPs T-SQL, 3 Funciones Escalares, 20 Tablas DDL y exportación limpia en `deploy/BaseLimpia/Korex_SQLServer_Inicial_1.0.bak`.
- **6 Componentes de Entregables del Proyecto**:
  1. `01 - Instalador PostgreSQL`: Se mantiene sin modificaciones funcionales.
  2. `02 - Instalador SQL Server`: Instala/configura la aplicación y valida la conexión; NO crea la base de datos.
  3. `03 - Base SQL Server inicial`: Archivo `.BAK` estructurado en blanco sin datos operativos.
  4. `04 - Scripts SQL Server`: Scripts T-SQL que permiten reconstruir la estructura y generar nuevas versiones del `.BAK`.
  5. `05 - Proceso de migración`: Herramienta independiente para trasladar datos desde PostgreSQL hacia SQL Server.
  6. `06 - Proceso de validación`: Validador de integridad para comparar y verificar la información migrada.

---

## 10. Regla de Trazabilidad y Diagnóstico del Sistema (`traceability-diagnostics`)

- **Trazabilidad Transversal Obligatoria**: Toda nueva funcionalidad desarrollada en el proyecto debe diseñarse considerando el mecanismo centralizado de trazabilidad (`TRC-YYYYMMDD-XXXXXX`).
- **Control de Niveles**: Se debe respetar el parámetro de configuración `TRACEABILITY_MODE` (`OFF`, `BASIC`, `DETAILED`, `DIAGNOSTIC`).
- **Garantía Multibase**: Toda infraestructura de trazabilidad debe funcionar con 100% de equivalencia en PostgreSQL y SQL Server siguiendo el Skill [`traceability-diagnostics`](file:///f:/Proyectos/AgenciasNew/.agents/skills/traceability-diagnostics/SKILL.md).
- **Protección de Datos Sensibles**: Queda estrictamente prohibido registrar contraseñas, tokens o números de tarjetas de crédito sin enmascarar (`***MASKED***`).

---

## 11. Regla Permanente de Protección, Permanencia de Correcciones y Regresión (`correcciones-permanencia-proteccion`)

- **NINGUNA CORRECCIÓN VALIDADA PUEDE PERDERSE**: Se prohíbe estrictamente eliminar, reemplazar, degradar o ignorar cualquier corrección o funcionalidad previa al implementar un nuevo requerimiento. Toda corrección validada se convierte en una prueba de regresión protegida.
- **Investigación Obligatoria Pre-Desarrollo**: Antes de modificar código o SQL, el agente debe investigar todo el contexto existente (`Buscar -> Analizar -> Preservar -> Modificar -> Probar`).
- **Regla de No Sobrescritura**: Queda estrictamente prohibido reemplazar archivos, SPs, funciones o componentes completos sin integrar aditivamente la versión actual con los cambios previos y el nuevo requerimiento.
- **Checklist Obligatorio de Aceptación**: Ningún desarrollo se considera terminado sin haber validado la suite automatizada de regresión (`node scripts/validate_full_suite.js`) en PostgreSQL y SQL Server y completado el checklist del Skill [`correcciones-permanencia-proteccion`](file:///f:/Proyectos/AgenciasNew/.agents/skills/correcciones-permanencia-proteccion/SKILL.md).

---

## 12. Regla Obligatoria de Separación Total de Instaladores y Actualizadores (`separacion-instaladores-actualizadores`)

- **Separación Absoluta de Procesos y Archivos**: Cada motor debe disponer de sus propios procesos, archivos, scripts, configuraciones y ejecutables de instalación y actualización. Queda estrictamente prohibido utilizar un instalador genérico que determine dinámicamente el motor o compartir procesos de instalación entre ambos motores.
- **Matriz Obligatoria de Archivos y Motores**:
  - **PostgreSQL**: `GenerarSetup.bat` y `GenerarActualizador.bat` son **EXCLUSIVOS** de PostgreSQL. Prohibido incluir scripts o consultar SQL Server.
  - **SQL Server**: `GenerarSetupSqlServer.bat` y `GenerarActualizadorSqlServer.bat` son **EXCLUSIVOS** de SQL Server. Prohibido incluir scripts o consultar PostgreSQL.
- **Prohibición de Instaladores Híbridos y Dinámicos**: La selección del motor debe estar determinada DESDE EL PROCESO DE GENERACIÓN (`GENERACIÓN -> INSTALACIÓN -> CONFIGURACIÓN -> ACTUALIZACIÓN -> EJECUCIÓN`).
- **Instalador SQL Server NO Crea la Base de Datos**: Asume que la base de datos SQL Server debe existir previamente (creada/restaurada por el administrador/cliente). Valida servidor, base de datos y credenciales, pero **NUNCA ejecuta `CREATE DATABASE`**.
- **Independencia Cruzada**: La ejecución o generación de un instalador para un motor garantiza 0 modificaciones en los archivos del otro motor.
- **Integración con Protección de Correcciones**: Cada instalador/actualizador posee su propio historial de cambios y pruebas de regresión protegidas según el Skill [`separacion-instaladores-actualizadores`](file:///f:/Proyectos/AgenciasNew/.agents/skills/separacion-instaladores-actualizadores/SKILL.md).

---

## 13. Regla Obligatoria de Instalación, Actualización, Diagnóstico y Autoreparación Multibase (`korex-install-diagnostics-autorepair`)

- **Principio Universal de Diagnóstico y Validación End-to-End**: Ninguna instalación o actualización de Korex se considera terminada por el simple hecho de haber copiado archivos. El proceso DEBE verificar de forma obligatoria y automatizada que **Korex realmente funciona** evaluando los 11 dominios técnicos:
  1. *Entorno Windows* (Admin, espacio en disco, permisos).
  2. *Node.js y npm* (Instalación, versión >= 18/20 LTS, PATH, prueba de ejecución).
  3. *Archivos y Configuración Korex* (Integridad de archivos, `.env`, `web.config`).
  4. *Dependencias* (`node_modules` y binarios).
  5. *Servidor IIS* (Servicio `W3SVC`, creación del sitio, bindings y AppPool).
  6. *ARR y URL Rewrite* (`rewrite.dll`, `requestRouter.dll`, proxy habilitado en `appcmd`).
  7. *Puertos y Red* (3000 IIS, 3001 Node.js, identificación de PID, IPv4/IPv6, `localhost`, `127.0.0.1`).
  8. *Proceso Korex / Servicio Windows* (`Korex_NextJS` / `Korex_SQLServer_Service`, captura de traza en `daemon/korex_nextjs.err.log` en caso de crash).
  9. *Base de Datos Exclusiva* (PG: TCP + consultas / SQL: `SqlConnection` + consultas, con prohibición estricta de `CREATE DATABASE`).
  10. *Diagnóstico Profundo HTTP 502.3 Bad Gateway* (Sincronización exacta de proxy inverso IIS <-> Backend).
  11. *Prueba Funcional End-to-End* (Petición HTTP real y respuesta válida).
- **Autoreparación Segura, Controlada y Reversible**: Capacidad de arrancar servicios caídos, habilitar el proxy ARR en IIS, corregir descalce de puertos en `web.config` y liberar puertos huérfanos con respaldo previo (`.env.bak_YYYYMMDD_HHMMSS`), sin realizar jamás acciones destructivas en bases de datos ni alterar el motor contrario.
- **Generación de Reportes y Soporte Remoto**: Todo proceso genera reportes interactivos HTML (`Korex_Diagnostico_<MOTOR>_<TIMESTAMP>.html`) y paquetes de soporte remoto ZIP sanitizados (`Korex_Diagnostico_<MOTOR>_<TIMESTAMP>.zip`) con 0 contraseñas o secretos expuestos, facilitando el diagnóstico técnico a distancia.
- **Validación Automatizada Continua**: Se debe ejecutar obligatoriamente `node scripts/validate_installer_diagnostics.js` y `node scripts/validate_full_suite.js` para asegurar el 100% de cumplimiento funcional multibase (Skill [`korex-install-diagnostics-autorepair`](file:///f:/Proyectos/AgenciasNew/.agents/skills/korex-install-diagnostics-autorepair/SKILL.md)).

---

## 14. Regla Obligatoria de Monitoreo Autónomo, Optimización y Protección del Rendimiento (`performance-monitoring-protection`)

- **Rendimiento como Pilar Permanente de Calidad**: El rendimiento del sistema es parte integral de la calidad de Korex (junto con *Compatibilidad Multibase*, *Aislamiento de Motores* y *Permanencia de Correcciones*).
- **Detección Autónoma y Proactiva**: El sistema debe detectar proactivamente consultas lentas, SPs/funciones degradadas, endpoints lentos, crecimiento no controlado de tablas, índices faltantes o sin uso, dead tuples, estadísticas desactualizadas y bloqueos de transacciones.
- **Ciclo Metodológico Cerrado**: Todo análisis u optimización debe seguir el flujo:
  `MEDIR → DETECTAR → ANALIZAR → PROPONER → PROBAR → VALIDAR → APLICAR CUANDO SEA SEGURO → VOLVER A MEDIR`.
- **4 Modos de Operación**:
  - `monitor`: Solo lectura, telemetría y comparación con línea base (`.performance_baseline.json`).
  - `recommend`: Análisis y propuestas clasificadas por Impacto (ALTO/MEDIO/BAJO) y Riesgo (ALTO/MEDIO/BAJO).
  - `optimize`: Aplicación de optimizaciones seguras previamente probadas.
  - `maintenance`: Ejecución de tareas de mantenimiento autorizadas (`ANALYZE`, `sp_updatestats`).
- **Política de Autonomía Segura**:
  - *Permitido autónomamente*: Diagnóstico, lectura de DMVs/catálogos, benchmarks, generación de reportes HTML sanitizados y actualización de estadísticas en modo mantenimiento.
  - *Prohibido autónomamente (Requiere aprobación humana)*: `DROP INDEX`, `DROP TABLE`, creación desatendida de índices o modificaciones estructurales/lógicas de SPs.
- **Aislamiento Estricto y Sanitización**:
  - PostgreSQL y SQL Server se monitorean y optimizan de forma 100% aislada.
  - Todos los reportes generados en `Diagnosticos/` deben estar 100% libres de credenciales, contraseñas y secretos.
- **Verificación Automatizada**: Se debe validar obligatoriamente ejecutando `node scripts/validate_performance_suite.js` y `node scripts/validate_full_suite.js` siguiendo el Skill [`performance-monitoring-protection`](file:///f:/Proyectos/AgenciasNew/.agents/skills/performance-monitoring-protection/SKILL.md).

---

## 15. Regla Obligatoria de Estrategia de Ejecución y Fallback para Korex (`execution-strategy-fallback`)

- **Estrategia Dual de Ejecución (No Depender Exclusivamente de Servicios)**: Korex cuenta con dos mecanismos de producción: **Opción A (Principal: Windows Service)** y **Opción B (Fallback Automático: Windows Task Scheduler)**, manteniendo IIS + ARR como reverse proxy externo en ambos modos.
- **Transición Transparente en Instaladores**: Si las políticas de seguridad de Windows o permisos del cliente impiden registrar o iniciar el Servicio de Windows, el instalador **NO aborta la instalación**. Registra la causa técnica exacta en el log e inicia automáticamente la tarea programada (`Korex NextJS - Startup` / `Korex SQLServer - Startup`) con trigger `/sc onstart`, ejecución elevada y entorno de producción Standalone (`node server.js`).
- **Preservación en Actualizaciones**: Los scripts actualizadores (`Update_Korex.ps1` / `Update_Korex_SQLServer.ps1`) detectan primero el mecanismo activo (`EXECUTION_MECHANISM` en `.env`) y lo conservan. Si un cliente opera bajo `TASK_SCHEDULER`, la actualización NO intentará forzarlo a `WINDOWS_SERVICE`.
- **Prohibición de Evadir Seguridad**: Si tanto el Servicio como el Task Scheduler son bloqueados por restricciones corporativas, el instalador no intentará alterar antivirus, firewalls ni políticas de seguridad; emitirá un reporte técnico detallado para el oficial de IT del cliente.
- **Aislamiento y Validación**: La estrategia respeta el 100% de aislamiento entre PostgreSQL y SQL Server. Se valida obligatoriamente mediante `node scripts/validate_execution_strategy_suite.js` y `node scripts/validate_full_suite.js` (Skill [`execution-strategy-fallback`](file:///f:/Proyectos/AgenciasNew/.agents/skills/execution-strategy-fallback/SKILL.md)).

---

## 16. SKILL MAESTRO KOREX (ID: 74163) - Desarrollo, Instalación, Actualización, Aislamiento y Protección Inviolable del `.env`

- **Estado y Alcance**: SKILL OBLIGATORIO Y PERMANENTE aplicable a Backend, Frontend, Base de Datos, SPs, Migraciones, Instaladores, Actualizadores, Pruebas y Producción.
- **Protección Inviolable del Entorno de Producción (`.env`)**:
  - **Prohibición Absoluta de Empaquetado**: Queda terminantemente prohibido incluir archivos `.env`, `.env.local` o `.env.production` dentro de `RELEASE_KOREX` o en los paquetes de Inno Setup. Todos los scripts de empaquetado (`deploy/Generar_Empaquetado.ps1`) y scripts `.iss` deben incluir exclusiones explícitas (`Excludes: "*.env, *.env.*, .env, *.bak*"`).
  - **Instalación Inicial desde Cero**: El instalador (`Setup_Korex_Silent.ps1` / `Setup_Korex_SQLServer_Silent.ps1`) genera el `.env` desde cero solicitando credenciales al administrador o tomándolas de la base de datos de producción existente.
  - **Actualizadores Inmutables de Configuración**: Los actualizadores (`Update_Korex.ps1` / `Update_Korex_SQLServer.ps1`) NUNCA deben sobrescribir el `.env` del cliente ni contener variables de desarrollo por defecto (como `agencias_new`, `Korex_colaereo`, `sa`, `zzeusagencias`). Si falta el `.env`, el actualizador debe detenerse de inmediato con error crítico.
- **Parametrización Limpia de Integraciones Externas (Zeus ERP)**:
  - Los parámetros del sistema para servidores externos (`ServidorSQLServer`, `BaseSQLServer`, `UsuarioSQLServer`, `ClaveSQLServer`) deben sembrarse completamente vacíos (`''`) por defecto.
  - Los parámetros de auto-exportación (`EnviarFacturasAutoSQLserver`, `EnviarCotizacionesAutoSQLserver`) deben inicializarse estrictamente en `'0'` (desactivado).
  - Ningún login, arranque o proceso interno de Korex debe intentar conectar a servidores externos si no han sido configurados explícitamente por el usuario o si la exportación no ha sido solicitada.
- **Aislamiento Absoluto de Motores (1 Motor Activo = 1 Única Infraestructura)**: El sistema opera 100% aislado según `DATABASE_PROVIDER` (`postgresql` o `sqlserver`), sin consultar ni conectar jamás al motor inactivo.
- **Validación Automatizada**: Toda modificación debe superar `node scripts/validate_master_skill_suite.js` y las 10 capas de `node scripts/validate_full_suite.js` (Skill [`korex-master-rules`](file:///f:/Proyectos/AgenciasNew/.agents/skills/korex-master-rules/SKILL.md)).

---

## 17. Regla de Encriptación de Contraseñas SQL y Zeus ERP (`password-encryption-governance`)

- **Encriptación Reversible Estándar (AES-256-CBC)**: Todas las contraseñas de bases de datos pueden ser protegidas con el formato `ENC(<iv_hex>:<ciphertext_hex>)`.
- **Compatibilidad Transparente en .ENV**:
  - `src/lib/postgres.ts`, `src/lib/prisma.ts` y `src/lib/sqlserver.ts` desencriptan automáticamente tokens `ENC(...)` presentes en cadenas de conexión (`DATABASE_URL`, `DATABASE_URL_POSTGRES`, `DATABASE_URL_SQLSERVER`, `SQLSERVER_PASSWORD`).
- **Gobernanza por Parámetro General (`EncriptarClaves`)**:
  - Parámetro en `SystemParameter` (`EncriptarClaves`, por defecto `'0'`).
  - Cuando `EncriptarClaves == '1'`: Toda contraseña de Zeus ERP (`ClaveSQLServer`) guardada desde la interfaz de administración se encripta automáticamente en la base de datos.
  - Cuando se conmuta el parámetro entre `'0'` y `'1'`, el sistema sincroniza automáticamente el estado de encriptación de `ClaveSQLServer`.
- **Desencriptación Segura sin Errores**: Todo proceso que consulte `ClaveSQLServer` para conectar a Zeus ERP (`getSQLServerConnection()`) desencripta transparentemente el valor antes de abrir la conexión, evitando fallos independientemente del estado del interruptor.
- **Herramienta CLI y Pruebas Automatizadas**: Todo cambio debe superar `node scripts/encrypt_password.js --test`, `node scripts/validate_password_encryption_suite.js` y las 10 capas de `node scripts/validate_full_suite.js`.

---

## 18. Regla Obligatoria de Versionamiento, Releases, Trazabilidad, Validación y Changelog (`versioning-release-changelog`)

- **Política Oficial KOREX-VERSIONAMIENTO-001 (72 Directivas Maestras)**: Todo release, actualización y control de cambios en Korex debe cumplir estrictamente las 72 directivas del documento maestro [`docs/KOREX_VERSIONAMIENTO_RELEASES_CHANGELOG.md`](file:///f:/Proyectos/AgenciasNew/docs/KOREX_VERSIONAMIENTO_RELEASES_CHANGELOG.md) y el Skill [`versioning-release-changelog`](file:///f:/Proyectos/AgenciasNew/.agents/skills/versioning-release-changelog/SKILL.md).
- **Inmutabilidad Absoluta y SemVer 2.0.0**: Toda versión publicada (`MAJOR.MINOR.PATCH`) es inmutable. Queda estrictamente prohibido republicar bajo nombres como *"corregida"*, *"definitiva"* o *"final"*. Todo cambio incrementa la versión y genera un Build único (`YYYYMMDD.NN`).
- **Gobernanza Dual del CHANGELOG**:
  - **CHANGELOG Interno (`CHANGELOG.md`)**: Ficha técnica completa por ID de cambio (`KRX-YYYY-NNNNN`), detallando componentes afectados, motores, pruebas, estado de los 4 procesos de empaquetado y control de regresiones.
  - **Informe de Cambios y Validación para Cliente (UAT)**: Documento estructurado sin rutas internas ni commits, orientado a personas y diseñado como **Ficha de Prueba y Aceptación** con pasos concretos de verificación y casilla de aprobación (`[ ] APROBADO / [ ] OBSERVADO`).
- **Principio Infranqueable del Actualizador ("Todo debe ejecutarse o reportarse")**:
  - Ningún actualizador puede finalizar como exitoso (`EXIT CODE 0`) si algún script, SP, función, migración, tabla, columna, índice, vista o prueba quedó sin ejecutar, falló o si producción queda en un estado diferente al validado en desarrollo.
  - Se prohíbe estrictamente ocultar errores, marcar fallos como warnings o continuar silenciosamente.
  - Cada componente debe evaluarse explícitamente (`OK`, `ERROR`, `OMITIDO`, `NO EJECUTADO`, `NO APLICA`) y generar un reporte HTML/JSON automático.
  - Todo script ejecutado debe ser VALIDADO posteriormente (`EJECUTADO + VALIDADO = OK`).
- **Cadena de Validación Desarrollo → Release → Producción**:
  - Se exige inventario previo de objetos esperados, manifest de release, comprobación en base limpia, prueba desde versión anterior, validación con datos reales y Smoke Test post-actualización.
  - Queda prohibido asumir que *"funciona en desarrollo = funciona en producción"*.
- **Validación Multibase y Automatizada Continua**: Ninguna versión se libera sin verificar PostgreSQL y SQL Server de forma 100% aislada. Se debe ejecutar obligatoriamente `node scripts/release_changelog_manager.js --validate` y las 11 capas de `node scripts/validate_full_suite.js`.

---

## 19. Regla Obligatoria de Diseño Visual y Diferenciación de AgenciasNew para Korex Analytics (`korex-analytics-design`)

Korex Analytics debe tener una **identidad visual propia y claramente diferenciada de AgenciasNew**.

No se debe reutilizar exactamente la misma combinación de colores, estilos visuales, encabezados, botones, fondos o elementos gráficos de AgenciasNew. Se deben seguir estrictamente todas las directivas del Skill [`korex-analytics-design`](file:///f:/Proyectos/AgenciasNew/.agents/skills/korex-analytics-design/SKILL.md) y el **Prompt Maestro de Desarrollo** en [`docs/PROMPT_MAESTRO_KOREX_ANALYTICS.md`](file:///f:/Proyectos/AgenciasNew/docs/PROMPT_MAESTRO_KOREX_ANALYTICS.md).

### 1. IDENTIDAD VISUAL PROPIA
Definir una nueva paleta de colores exclusiva para Korex Analytics.
La selección debe transmitir: tecnología, análisis, información, confiabilidad, modernidad y profesionalismo.
Como propuesta inicial utilizar una combinación basada en:
* **Azul petróleo / azul oscuro** para navegación y elementos principales.
* **Turquesa** para acciones y elementos interactivos.
* **Gris claro** para fondos secundarios.
* **Blanco** para superficies y contenido.
* **Azul medio** para información.
* **Verde** para estados exitosos.
* **Naranja/ámbar** para advertencias.
* **Rojo** exclusivamente para errores o acciones destructivas.

La paleta definitiva debe definirse durante el diseño inicial y documentarse para que todo el proyecto mantenga consistencia.

### 2. NO COPIAR EL DISEÑO DE AGENCIASNEW
Aunque se reutilice la lógica y arquitectura de AgenciasNew, NO copiar automáticamente: colores, temas, fondos, botones, tarjetas, iconografía, encabezados, menú, estilos de tablas, estilos de formularios, tipografías ni componentes visuales.
Los componentes funcionales pueden utilizarse como referencia, pero la presentación visual debe pertenecer a **Korex Analytics**.

### 3. COMPONENTES QUE DEBEN RESPETAR LA NUEVA IDENTIDAD
Aplicar la identidad visual a: Login, Menú principal, Dashboard, Parámetros de Usuarios, Configuración SQL Server, Ejecuciones, Historial de Ejecuciones, Formularios, Tablas, Modales, Alertas, Mensajes, Botones e Indicadores de estado.

### 4. IDENTIFICACIÓN DEL MÓDULO DE EJECUCIONES
El módulo de **Ejecuciones** debe tener una identificación visual clara.
Los estados deben utilizar una representación consistente:
* Pendiente → color informativo.
* En ejecución → color de proceso/actividad.
* Finalizada → verde.
* Error → rojo.
* Cancelada → gris o color neutral.
* Advertencia → ámbar.

No utilizar únicamente colores para comunicar el estado; acompañar cuando corresponda con texto, icono, tooltip e indicador visual para accesibilidad.

### 5. DASHBOARD
El Dashboard de Korex Analytics debe tener un diseño orientado al análisis y seguimiento de ejecuciones.
Mostrar, cuando corresponda: ejecuciones recientes, ejecuciones en proceso, ejecuciones exitosas, ejecuciones con error, duración, usuario, base de datos utilizada, servidor e indicadores de actividad.
La presentación debe ser visualmente diferente de AgenciasNew.

### 6. TEMA Y COMPONENTES REUTILIZABLES
Crear una configuración centralizada del tema visual. No colocar colores directamente dispersos por los componentes.
Utilizar variables/tokens de diseño (`--primary`, `--secondary`, `--background`, `--surface`, `--text`, `--success`, `--warning`, `--error`, `--info`, `--border`).
De esta manera la identidad visual puede modificarse posteriormente desde un único lugar.

### 7. RESPONSIVE
El diseño debe funcionar correctamente en escritorio, portátil, tablet y resoluciones diferentes, priorizando el uso administrativo y operativo, manteniendo buena lectura de tablas y Ejecuciones.

### 8. ACCESIBILIDAD
Los colores seleccionados deben mantener suficiente contraste. No utilizar el color como único mecanismo para diferenciar estados o resultados. Validar contraste, legibilidad, tamaños, foco de teclado, estados hover/focus y mensajes de error.

### 9. REGLA FINAL
Korex Analytics debe poder identificarse visualmente como un producto diferente de AgenciasNew aunque ambos compartan componentes técnicos y lógica de desarrollo.
La reutilización de arquitectura y funcionalidad **NO debe significar reutilización automática de la identidad visual**.
Separar estrictamente la arquitectura de la identidad visual.





