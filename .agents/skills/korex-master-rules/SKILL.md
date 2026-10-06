---
name: korex-master-rules
description: SKILL MAESTRA DE KOREX para el control integral de desarrollo, base de datos multibase (PostgreSQL + SQL Server), instaladores, actualizadores, aislamiento de motores, proteccion del .env y validador automatico KorexValidator.
---

# SKILL MAESTRO KOREX (ID: 74163)

## CONTROL INTEGRAL DE DESARROLLO, BASE DE DATOS, INSTALADORES, ACTUALIZADORES Y VALIDADOR AUTOMÁTICO

---

# 1. PROPÓSITO

Esta SKILL establece las reglas obligatorias para el desarrollo, modificación, corrección, pruebas, promoción, instalación y actualización del sistema Korex.

Su objetivo es garantizar que **todo cambio desarrollado y probado sea trasladado íntegramente a todos los ambientes y mecanismos de instalación soportados**, evitando que una funcionalidad funcione en desarrollo pero falle posteriormente porque:

* Falta una columna.
* Falta una tabla.
* Falta un Stored Procedure.
* Falta una función.
* Falta una migración.
* Falta un script.
* Falta una configuración.
* El instalador no contiene el cambio.
* El actualizador no aplica el cambio.
* PostgreSQL y SQL Server quedaron desincronizados.
* Una corrección anterior fue revertida accidentalmente.
* Existe una diferencia entre la estructura probada y la estructura instalada.

El incidente de:

```text
dbo.Invoices.isExcelImport
```

donde el código esperaba una columna que no existía en la base SQL Server, debe considerarse un ejemplo de una falla que **el proceso debe detectar automáticamente antes de producción**.

---

# 2. PRINCIPIO FUNDAMENTAL

## DESARROLLO = CAMBIO COMPLETO Y REPRODUCIBLE

Una funcionalidad **NO se considera terminada simplemente porque funciona en desarrollo**.

Debe cumplir:

```text
Código
   +
Base de datos
   +
SP / Functions / Views
   +
Migraciones
   +
Configuración
   +
Instaladores
   +
Actualizadores
   +
Pruebas
   +
Regresión
   +
Validación automática
```

Solo entonces podrá considerarse terminada.

---

# 3. CICLO OBLIGATORIO DE CADA DESARROLLO

Todo desarrollo debe recorrer obligatoriamente:

```text
1. Análisis previo
       ↓
2. Identificación de impacto
       ↓
3. Desarrollo
       ↓
4. Validación durante desarrollo
       ↓
5. Pruebas funcionales
       ↓
6. Validación automática
       ↓
7. Generación de instalador/actualizador
       ↓
8. Instalación/actualización de prueba
       ↓
9. Validación post-instalación
       ↓
10. Pruebas de regresión
       ↓
11. Informe GO / NO GO
       ↓
12. Entrega
```

Ninguna etapa podrá omitirse.

---

# 4. ALCANCE

Esta SKILL aplica a:

* Código.
* Backend.
* Frontend.
* APIs.
* Servicios.
* Tablas.
* Columnas.
* SP.
* Functions.
* Views.
* Triggers.
* Índices.
* Constraints.
* Secuencias.
* Parámetros.
* Configuraciones.
* Migraciones.
* Scripts.
* Instaladores.
* Actualizadores.
* Integraciones.
* Importaciones.
* Exportaciones.
* Procesos automáticos.
* Procesos manuales.

Aplica a:

* PostgreSQL.
* SQL Server.

---

# 5. REGLA DE LAS DOS INFRAESTRUCTURAS

Todo desarrollo de Korex debe determinar si aplica a:

### PostgreSQL

o

### SQL Server

o

### Ambos.

Cuando el cambio aplique a ambos, debe implementarse y validarse en ambos.

Cuando sea específico de un motor, debe mantenerse aislado.

## REGLA CRÍTICA

Si el proceso está trabajando sobre SQL Server:

**NO puede crear, modificar ni ejecutar objetos de PostgreSQL.**

Si está trabajando sobre PostgreSQL:

**NO puede crear, modificar ni ejecutar objetos de SQL Server.**

---

# 6. VALIDADOR AUTOMÁTICO KOREX

Se debe desarrollar dentro del proyecto un componente denominado:

## `KorexValidator` (`scripts/korex_validator.js`)

o un nombre equivalente claramente identificado.

Este componente será responsable de validar automáticamente la integridad entre:

```text
Código
Base de datos
Migraciones
Scripts
Instaladores
Actualizadores
Ambiente resultante
Pruebas funcionales
Regresiones
```

El validador debe formar parte del código fuente de Korex y estar versionado junto con el proyecto.

**No debe existir únicamente como una herramienta externa o procedimiento manual.**

---

# 7. EL VALIDADOR ES OBLIGATORIO

El validador debe ejecutarse automáticamente:

### Antes del desarrollo

Para identificar el estado inicial.

### Durante el desarrollo

Cuando existan cambios estructurales o funcionales.

### Después del desarrollo

Para verificar que todos los cambios estén completos.

### Antes de generar instaladores

Para impedir que se genere un paquete incompleto.

### Después de generar instaladores

Para comprobar que el paquete realmente contiene los cambios.

### Después de instalar/actualizar

Para comprobar el estado real de la base resultante.

### Antes de producción

Como último control GO / NO GO.

---

# 8. INTEGRACIÓN CON LOS `.BAT`

El validador debe integrarse directamente con los procesos existentes.

## PostgreSQL

```text
GenerarSetup.bat
GenerarActualizador.bat
```

## SQL Server

```text
GenerarSetupSqlServer.bat
GenerarActualizadorSqlServer.bat
```

El flujo debe ser:

```text
Generar instalador
       ↓
KorexValidator
       ↓
¿PASS?
   ├── NO → BLOQUEAR
   │
   └── SÍ
        ↓
Generar paquete
        ↓
Validar paquete
```

No debe ser posible declarar exitoso el proceso si el validador devuelve errores críticos.

---

# 9. NO DEPENDER DE LA MEMORIA DEL DESARROLLADOR

Queda prohibido depender de:

* "Yo recuerdo que ese cambio estaba."
* "Eso ya se había agregado."
* "Ese SP se ejecutó manualmente."
* "En mi base funciona."
* "El instalador seguramente lo tiene."
* "Ese cambio solamente era una columna."
* "Eso ya estaba corregido."

El sistema debe comprobarlo automáticamente.

---

# 10. CONTROL DE CAMBIOS DE BASE DE DATOS

Cada modificación debe tener un mecanismo reproducible.

Ejemplo:

```sql
ALTER TABLE dbo.Invoices
ADD isExcelImport BIT NOT NULL DEFAULT 0;
```

No basta con ejecutar esto manualmente en:

```text
Korex_pruebas
```

Debe existir el mecanismo oficial que permita reproducirlo mediante:

* Instalación nueva.
* Actualización.
* Instalador.
* Actualizador.

---

# 11. COMPARACIÓN AUTOMÁTICA

El validador debe comparar:

```text
A. BASE DE DESARROLLO
        VS
B. CAMBIOS/MIGRACIONES
        VS
C. INSTALADOR
        VS
D. BASE RESULTANTE
        VS
E. CÓDIGO
```

Debe detectar:

* Columnas faltantes.
* Tablas faltantes.
* SP faltantes.
* Functions faltantes.
* Views faltantes.
* Índices faltantes.
* Constraints faltantes.
* Triggers faltantes.
* Diferencias de tipos.
* Diferencias de parámetros.
* Diferencias de nulabilidad.
* Diferencias de defaults.
* Diferencias en definición de SP.
* Diferencias en funciones.
* Dependencias faltantes.

---

# 12. VALIDACIÓN CÓDIGO → BASE DE DATOS

El validador debe analizar las referencias conocidas del código y comprobar que los objetos requeridos existan.

Ejemplo:

```text
Código:
Invoices.isExcelImport
```

Debe comprobar:

```text
Tabla:
dbo.Invoices              ✓

Columna:
isExcelImport             ✓ / ERROR

Tipo:
BIT                       ✓ / ERROR

Disponibilidad:
Instalador                ✓ / ERROR

Migración:
Incluida                  ✓ / ERROR

Base existente:
Actualizable              ✓ / ERROR

Base nueva:
Disponible                ✓ / ERROR
```

---

# 13. CASO `isExcelImport`

Para evitar nuevamente el incidente:

```text
Invalid column name 'isExcelimport'
```

el validador debe detectar antes de la entrega:

```text
Código utiliza:
dbo.Invoices.isExcelImport

Desarrollo:
EXISTE

Migración:
EXISTE

Setup SQL Server:
EXISTE

Actualizador SQL Server:
EXISTE

Base nueva:
EXISTE

Base anterior actualizada:
EXISTE

Prueba funcional:
PASS
```

Si cualquiera de estos elementos falla:

```text
NO GO
```

---

# 14. PRUEBA DE INSTALACIÓN LIMPIA

Debe existir obligatoriamente una prueba sobre una base nueva.

Objetivo:

Comprobar que un cliente nuevo pueda instalar la versión actual sin depender de cambios manuales realizados anteriormente.

Flujo:

```text
Base limpia
    ↓
Setup
    ↓
Aplicación
    ↓
Validación estructura
    ↓
Pruebas funcionales
```

---

# 15. PRUEBA DE ACTUALIZACIÓN

Debe existir también una base representativa de una versión anterior.

Flujo:

```text
Base versión anterior
       ↓
Actualizador
       ↓
Migraciones
       ↓
Nueva estructura
       ↓
KorexValidator
       ↓
Pruebas funcionales
```

Esto es obligatorio porque una instalación nueva y una actualización son escenarios diferentes.

---

# 16. PRUEBA FUNCIONAL POSTERIOR

No basta con verificar que la columna exista.

Debe probarse la funcionalidad real.

Para Excel:

```text
Instalar/actualizar
       ↓
Abrir Korex
       ↓
Importar Excel
       ↓
Crear Invoice
       ↓
Validar registro
       ↓
Validar isExcelImport
       ↓
Validar trazabilidad
```

Debe comprobarse el resultado real del proceso.

---

# 17. PRUEBAS DE REGRESIÓN

Cada nueva versión debe comprobar:

```text
Funcionalidad nueva
+
Corrección nueva
+
Correcciones anteriores
+
Procesos críticos
```

Una corrección aprobada anteriormente no puede desaparecer en una nueva versión.

El validador debe identificar cambios inesperados entre versiones.

---

# 18. CONTROL DE REGRESIONES A NIVEL GENERAL

Esta regla no aplica únicamente a:

```text
EnviarFacturacionAutoSQLserver
```

Debe aplicar a:

* Parámetros.
* SP.
* Functions.
* Tablas.
* Columnas.
* Procesos.
* Validaciones.
* Configuraciones.
* Integraciones.
* Reglas de negocio.
* Instaladores.

Toda corrección importante debe poder comprobarse nuevamente en versiones posteriores.

---

# 19. PROTECCIÓN DEL `.ENV`

El validador y los procesos de instalación/actualización deben respetar las reglas existentes de Korex.

El `.env` productivo:

* No debe sobrescribirse.
* No debe reemplazarse.
* No debe eliminarse.
* No debe regenerarse durante una actualización.
* No debe copiarse desde la base de pruebas.
* No debe utilizarse como fuente de configuración para otra instalación.

El actualizador debe preservar el `.env` existente.

---

# 20. PROTECCIÓN DE BASES EXTERNAS

El validador debe distinguir:

### Base principal Korex

Configurada en:

```text
.env → sql
```

### Base de exportación

Configurada mediante los parámetros correspondientes.

### Base externa/interfaz

Por ejemplo:

```text
Zeus_erp
```

El proceso de validación no debe modificar estructuras existentes de bases externas que no sean propiedad de Korex.

Cuando Korex necesite objetos propios en una base externa, estos deben manejarse mediante el mecanismo autorizado y documentado.

---

# 21. REPORTE AUTOMÁTICO

Cada ejecución del validador debe producir un informe.

Debe incluir:

```text
Versión
Fecha
Hora
Motor
Ambiente
Base de datos
Versión anterior
Versión nueva
Archivos revisados
Tablas
Columnas
SP
Functions
Views
Índices
Constraints
Migraciones
Dependencias
Pruebas
Errores
Advertencias
Regresiones
Resultado
```

Resultado final:

```text
GO
```

o

```text
NO GO
```

---

# 22. BLOQUEO AUTOMÁTICO

Esta es una de las reglas más importantes.

Si el validador encuentra un error crítico:

```text
NO GO
```

el proceso debe:

1. Informar el problema.
2. Identificar el componente afectado.
3. Mostrar el origen de la diferencia.
4. Mostrar el destino donde falta.
5. Evitar aprobar la versión.
6. Evitar continuar con la entrega.
7. Generar el reporte.
8. Permitir corregir.
9. Ejecutar nuevamente la validación.

---

# 23. NIVELES DE VALIDACIÓN

El validador debe clasificar resultados.

### CRÍTICO

Bloquea inmediatamente:

* Columna faltante.
* Tabla faltante.
* SP requerido faltante.
* Migración faltante.
* Error de instalación.
* Error funcional crítico.
* Diferencia de estructura incompatible.
* Dependencia inexistente.

### ADVERTENCIA

No necesariamente bloquea, pero debe quedar registrada y revisada.

### INFORMACIÓN

Resultado esperado o cambio detectado correctamente.

---

# 24. VALIDACIÓN DEL PROPIO INSTALADOR

No basta con validar los archivos fuente.

Después de generar el instalador debe analizarse el contenido real del paquete.

Objetivo:

Evitar:

```text
Código fuente:
✓ Cambio existe

Instalador generado:
✗ Cambio no incluido
```

Debe comprobarse el paquete final.

---

# 25. VALIDACIÓN POST-INSTALACIÓN

Después de ejecutar el instalador:

```text
KorexValidator
```

debe volver a ejecutarse contra la base resultante.

Esto permite comprobar:

```text
Lo que debía instalarse
       VS
Lo que realmente quedó instalado
```

---

# 26. VALIDACIÓN POST-ACTUALIZACIÓN

El mismo mecanismo debe ejecutarse después de un actualizador.

Debe verificar:

```text
Base anterior
      ↓
Actualizador
      ↓
Base nueva
      ↓
Comparación
      ↓
Pruebas
```

---

# 27. CONTROL DE VERSIONES

Cada release debe tener una identificación clara.

El validador debe conocer:

```text
Versión actual
Versión anterior
Cambios esperados
Migraciones esperadas
Objetos esperados
```

Esto permite detectar cambios que aparezcan o desaparezcan inesperadamente.

---

# 28. EJECUCIÓN MANUAL DISPONIBLE

Aunque el validador se ejecute automáticamente, debe poder ejecutarse manualmente desde el proyecto.

Ejemplo oficial:

```text
ValidarKorex.bat
```

o mediante el mecanismo equivalente definido en el proyecto (`node scripts/korex_validator.js`).

Debe permitir seleccionar:

```text
PostgreSQL
SQL Server
Ambos
```

y realizar la validación correspondiente.

---

# 29. MODO DE SOLO LECTURA

La validación de estructura debe ejecutarse preferiblemente en modo de solo lectura.

El validador no debe modificar la base simplemente para comprobarla.

Las pruebas de migración deben ejecutarse sobre ambientes controlados y aislados.

---

# 30. TRAZABILIDAD

Cada resultado debe poder relacionarse con:

```text
Versión
Cambio
Desarrollador/proceso
Fecha
Instalador
Actualizador
Ambiente
Base de datos
Resultado
```

Esto permitirá determinar posteriormente exactamente qué versión fue validada.

---

# 31. PROCESO FINAL OBLIGATORIO

El proceso completo deberá funcionar conceptualmente así:

```text
┌──────────────────────────────┐
│       DESARROLLO KOREX       │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│   IDENTIFICAR IMPACTO        │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│       DESARROLLAR            │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│    PRUEBAS FUNCIONALES       │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│      KorexValidator          │
└──────────────┬───────────────┘
               ↓
           ¿PASS?
          /      \
        NO        SÍ
        ↓          ↓
    BLOQUEAR    GENERAR
                INSTALADOR
                   ↓
          VALIDAR PAQUETE
                   ↓
             INSTALACIÓN
              DE PRUEBA
                   ↓
          VALIDAR ESTRUCTURA
                   ↓
          PRUEBAS FUNCIONALES
                   ↓
          PRUEBAS REGRESIÓN
                   ↓
             ¿PASS?
            /      \
          NO        SÍ
          ↓          ↓
      BLOQUEAR      GO
                     ↓
                 PRODUCCIÓN
                     ↓
             VALIDACIÓN FINAL
```

---

# 32. CRITERIO DE ACEPTACIÓN

La implementación no se considerará completa hasta que:

* `KorexValidator` (`scripts/korex_validator.js`) exista dentro del proyecto.
* Esté versionado.
* Pueda ejecutarse independientemente (`ValidarKorex.bat`).
* Esté integrado a los procesos de generación (`GenerarSetup.bat`, `GenerarActualizador.bat`, `GenerarSetupSqlServer.bat`, `GenerarActualizadorSqlServer.bat`).
* Valide PostgreSQL.
* Valide SQL Server.
* Mantenga aislamiento entre motores.
* Compare código y base de datos.
* Compare desarrollo e instalador.
* Compare instalador y ambiente resultante.
* Valide instalación nueva.
* Valide actualización.
* Ejecute pruebas funcionales.
* Ejecute pruebas de regresión.
* Detecte objetos faltantes.
* Detecte dependencias faltantes.
* Detecte migraciones faltantes.
* Genere reportes.
* Implemente GO / NO GO.
* Bloquee entregas con errores críticos.
* Proteja `.env`.
* Proteja bases externas.
* No dependa de verificaciones manuales.
* Detecte específicamente casos como `Invoices.isExcelImport`.

---

# 33. REGLA MAESTRA FINAL

## NINGÚN CAMBIO DE KOREX PUEDE LLEGAR A PRODUCCIÓN BASÁNDOSE ÚNICAMENTE EN QUE FUNCIONÓ EN DESARROLLO.

Debe demostrarse que:

> **El cambio que fue desarrollado y probado puede reproducirse exactamente mediante el mecanismo oficial de instalación o actualización y que el ambiente resultante contiene todos los componentes necesarios para que la funcionalidad opere correctamente.**

Y:

> **Si el validador encuentra una diferencia crítica entre el desarrollo, la promoción, el instalador, el actualizador o el ambiente resultante, la entrega debe bloquearse automáticamente hasta corregirla.**

Esta regla aplica a **todos los desarrollos presentes y futuros de Korex**, independientemente de que el cambio corresponda a una tabla, columna, SP, función, configuración, proceso, API, frontend, backend, instalador, actualizador o cualquier otro componente.

---

# 34. MANEJO ESTRICTO DE ERRORES — INSTALADORES Y ACTUALIZADORES KOREX

## 34.1. Objetivo

Todo instalador y actualizador de Korex debe funcionar bajo un principio de **"Fail Fast / Fail Safe"**:

> **Ante cualquier error no validado, no controlado o no esperado, el proceso debe detenerse inmediatamente, mostrar el error completo en pantalla, registrar la información técnica y NO continuar con los siguientes pasos.**

El objetivo es impedir que una instalación o actualización continúe parcialmente y termine dejando una base de datos o una aplicación en un estado inconsistente.

---

## 34.2. REGLA ABSOLUTA

### NINGÚN ERROR PUEDE SER IGNORADO

No se permite que el instalador o actualizador:

* Ignore un error SQL.
* Muestre solamente una advertencia y continúe.
* Capture una excepción y continúe silenciosamente.
* Registre el error únicamente en un archivo y continúe.
* Considere exitoso un paso que falló.
* Continúe ejecutando los siguientes scripts después de un error crítico.
* Finalice indicando "actualización exitosa" cuando algún componente falló.
* Oculte errores producidos durante la ejecución de bloques `GO`.
* Confunda una advertencia con un error.
* Omita procedimientos porque un paso anterior falló.

---

## 34.3. COMPORTAMIENTO OBLIGATORIO

El flujo debe ser:

```text
Ejecutar paso
     ↓
¿Error?
 ┌───┴────┐
 NO       SÍ
 ↓         ↓
Continuar  DETENER
           ↓
       Mostrar error
           ↓
       Registrar error
           ↓
       Identificar archivo
           ↓
       Identificar objeto
           ↓
       Identificar línea
           ↓
       Identificar SQL
           ↓
       Estado = ERROR
           ↓
       NO CONTINUAR
```

---

## 34.4. EJEMPLO `spExportInvoices`

Si durante la actualización se ejecuta:

```sql
EXEC dbo.spExportInvoices;
```

y SQL Server responde:

```text
SQL Error #2812

Could not find stored procedure
'dbo.spExportInvoices'
```

el actualizador debe detenerse inmediatamente.

Debe mostrar en pantalla algo equivalente a:

```text
========================================================
KOREX - ERROR CRÍTICO DE ACTUALIZACIÓN
========================================================

Motor: SQL Server

Error SQL: 2812

Objeto:
dbo.spExportInvoices

Mensaje:
Could not find stored procedure
'dbo.spExportInvoices'.

Archivo:
03_Functions_And_SPs.sql

Proceso:
Actualización SQL Server

Estado:
ERROR - ACTUALIZACIÓN DETENIDA

NO SE EJECUTARÁN MÁS SCRIPTS.

Corrija el problema y vuelva a ejecutar el actualizador.
========================================================
```

El proceso debe terminar con un código de salida diferente de `0`.

---

## 34.5. NO CONTINUAR DESPUÉS DEL ERROR

Esta regla es crítica.

Si falla:

```text
SP #10
```

NO se debe ejecutar:

```text
SP #11
SP #12
SP #13
...
```

Debe detenerse exactamente en el punto del error.

Esto evita que una actualización parcialmente ejecutada produzca errores secundarios que oculten la causa original.

---

## 34.6. ERRORES EN `GO`

La separación por bloques `GO` debe tratar cada bloque como una unidad controlada.

Para cada bloque:

```text
GO Block 1
GO Block 2
GO Block 3
...
```

el ejecutor debe conocer:

* Número de bloque.
* Archivo origen.
* Línea aproximada.
* SQL ejecutado.
* Objeto afectado.
* Resultado.

Si un bloque falla:

```text
GO Block 27
```

el proceso debe detenerse y reportar:

```text
ERROR EN BLOQUE GO 27
```

No debe continuar con el bloque 28.

---

## 34.7. ADVERTENCIAS VS ERRORES

El ejecutor debe diferenciar correctamente:

### Advertencia válida

Una situación conocida, esperada y previamente clasificada que no afecta la integridad de la actualización.

### Error

Cualquier respuesta que indique que una operación requerida no se ejecutó correctamente.

### Error desconocido

Cualquier mensaje que no haya sido previamente clasificado.

Los errores desconocidos deben tratarse siempre como:

**ERROR CRÍTICO → DETENER**

No se permite asumir que un error desconocido es seguro.

---

## 34.8. PROHIBIDO USAR "CONTINUAR ANTE ERROR"

No debe existir una lógica equivalente a:

```javascript
try {
   ejecutarScript();
} catch (error) {
   console.log(error);
   // continuar
}
```

cuando el error corresponde a una operación necesaria para la actualización.

Tampoco debe existir una lógica que transforme automáticamente cualquier excepción en una advertencia.

La lógica debe ser:

```javascript
try {
   ejecutarScript();
} catch (error) {
   mostrarError(error);
   registrarError(error);
   detenerProceso();
   throw error;
}
```

El comportamiento exacto debe adaptarse a la arquitectura actual, pero el principio es obligatorio:

> **ERROR → STOP**

---

## 34.9. VALIDACIÓN DEL RESULTADO DE CADA SCRIPT

No basta con comprobar que el archivo se abrió o que el comando fue enviado a SQL Server.

Debe comprobarse que SQL Server realmente ejecutó correctamente la operación.

Por ejemplo:

```text
Enviar SQL
     ↓
SQL Server responde
     ↓
Analizar resultado
     ↓
¿Éxito?
   ├── SÍ → siguiente bloque
   └── NO → DETENER
```

---

## 34.10. CONTROL DE STORED PROCEDURES

Cuando el instalador o actualizador cree o modifique un Stored Procedure:

```text
CREATE PROCEDURE
ALTER PROCEDURE
CREATE OR ALTER PROCEDURE
```

debe comprobarse:

1. Que la ejecución haya sido exitosa.
2. Que el procedimiento exista después de ejecutarlo.
3. Que pueda localizarse mediante metadata de SQL Server.
4. Que su definición corresponda con la versión esperada.
5. Que sus dependencias principales existan.

Ejemplo:

```text
spExportInvoices

Script:
✓ Encontrado

Ejecución:
✓ Correcta

Existencia posterior:
✓ Existe

Compilación:
✓ Correcta

Dependencias:
✓ Correctas
```

Si alguno falla:

**NO GO.**

---

## 34.11. COMPILACIÓN OBLIGATORIA

Los SP y Functions modificados deben validarse después de su instalación.

No debe considerarse exitoso:

```text
"El script fue enviado a SQL Server"
```

Debe comprobarse:

```text
"El objeto fue creado/modificado y SQL Server lo acepta correctamente."
```

Cuando el motor permita comprobar dependencias o errores de compilación, debe utilizarse dicha información.

---

## 34.12. VALIDACIÓN PREVIA AL ACTUALIZADOR

Antes de ejecutar una actualización, el `KorexValidator` debe comprobar que todos los objetos esperados estén disponibles en el paquete.

Ejemplo:

```text
03_Functions_And_SPs.sql

Debe contener:
✓ spExportInvoices
✓ SP_A
✓ SP_B
✓ SP_C
```

Si el validador detecta:

```text
spExportInvoices
NO ENCONTRADO
```

debe bloquear el proceso **antes de modificar la base de datos**.

---

## 34.13. VALIDACIÓN DEL ORDEN DE EJECUCIÓN

Los scripts deben ejecutarse respetando dependencias.

Por ejemplo:

```text
1. Tablas
2. Columnas
3. Functions
4. Stored Procedures
5. Views
6. Triggers
7. Configuraciones
8. Datos requeridos
```

Cuando un objeto dependa de otro, la dependencia debe existir antes de compilarlo.

El validador debe identificar dependencias cuando sea posible.

---

## 34.14. COMPILADOR BASE

Los objetos fundamentales deben estar incluidos en los compiladores principales de cada motor.

Por ejemplo:

```text
SQL/SqlServer/03_Functions_And_SPs.sql
```

debe constituir la fuente oficial de los Stored Procedures y Functions correspondientes.

No se debe depender de archivos externos que eventualmente no sean incluidos.

Si existe un objeto obligatorio:

```text
SQL/SqlServer/spExportInvoices.sql
```

debe existir un mecanismo determinístico que garantice que llegue al compilador/paquete correspondiente.

No puede depender de una inclusión manual o condicional no validada.

---

## 34.15. VALIDACIÓN DE INCLUSIÓN

Antes de generar el instalador/actualizador:

```text
KorexValidator
```

debe comprobar:

```text
Archivo fuente
      ↓
¿Está registrado?
      ↓
¿Está incluido?
      ↓
¿Se ejecutará?
      ↓
¿Se validará?
```

Si alguna respuesta es:

```text
NO
```

el proceso debe quedar:

```text
NO GO
```

---

## 34.16. DETECCIÓN DE EJECUCIÓN PARCIAL

El actualizador debe poder determinar:

```text
Paso 1 ✓
Paso 2 ✓
Paso 3 ✓
Paso 4 ✗
Paso 5 NO EJECUTADO
Paso 6 NO EJECUTADO
```

Esto debe quedar registrado.

No debe mostrar:

```text
Actualización completada
```

si solamente se ejecutó parcialmente.

Debe mostrar:

```text
ACTUALIZACIÓN FALLIDA

Ejecutados correctamente: 3
Falló: 1
No ejecutados: 2

Estado final: ERROR
```

---

## 34.17. CÓDIGO DE SALIDA

Los procesos de instalación y actualización deben devolver códigos de salida diferenciados.

Conceptualmente:

```text
0 = ÉXITO
1 = ERROR DE VALIDACIÓN
2 = ERROR SQL
3 = ERROR DE INSTALACIÓN
4 = ERROR DE ACTUALIZACIÓN
5 = ERROR DE CONFIGURACIÓN
```

La implementación puede utilizar otros códigos, pero:

> **un proceso que haya fallado nunca puede devolver código de éxito.**

---

## 34.18. INFORMACIÓN OBLIGATORIA DEL ERROR

Cada error debe mostrar como mínimo:

* Motor.
* Base de datos.
* Servidor, cuando corresponda.
* Archivo.
* Bloque `GO`.
* Línea.
* Objeto.
* Código SQL.
* Mensaje SQL completo.
* Operación ejecutada.
* Versión de Korex.
* Estado de la actualización.
* Paso donde ocurrió.
* Cantidad de pasos ejecutados.
* Cantidad de pasos pendientes.

Cuando sea posible, también:

* SQL involucrado.
* Dependencia faltante.
* Solución sugerida.

---

## 34.19. ERROR VISIBLE EN PANTALLA

El error debe permanecer visible para el usuario.

No se permite:

```text
Actualización terminada.
```

cuando existe un error.

Debe aparecer claramente:

```text
ACTUALIZACIÓN DETENIDA POR ERROR
```

y mostrar la causa.

El usuario debe poder copiar el mensaje para enviarlo al equipo de desarrollo.

---

## 34.20. LOG DETALLADO

Además de mostrarlo en pantalla, debe generarse un log.

Ejemplo:

```text
Logs/
   KorexUpdate_20260925_111530.log
```

El log debe contener el detalle completo de la ejecución.

Esto permitirá diagnosticar errores en instalaciones remotas donde el equipo de desarrollo no tenga acceso directo al servidor.

---

## 34.21. NO OCULTAR EL ERROR ORIGINAL

Cuando un error provoque errores secundarios, debe conservarse como referencia principal el primer error real.

Ejemplo:

```text
ERROR ORIGINAL:
spExportInvoices no existe.

ERRORES POSTERIORES:
No ejecutar.
```

Esto evita terminar con una lista de errores secundarios que oculten la verdadera causa.

---

## 34.22. VALIDACIÓN DESPUÉS DE CORREGIR

Cuando un error sea corregido:

```text
Corregir
   ↓
Ejecutar KorexValidator
   ↓
Generar instalador/actualizador
   ↓
Probar nuevamente
```

No debe darse por solucionado porque:

> "Ya agregamos el SP."

Debe demostrarse que el proceso completo ahora funciona.

---

## 34.23. PREVENCIÓN DE REPETICIÓN

Cada error crítico encontrado durante instalación o actualización debe incorporarse al sistema de pruebas cuando corresponda.

Ejemplo:

```text
Error:
spExportInvoices no incluido
```

Después de corregirlo, debe existir una validación que garantice que una nueva versión no vuelva a excluirlo.

El objetivo es transformar:

```text
Error encontrado
```

en:

```text
Error prevenido automáticamente en versiones futuras
```

---

## 34.24. REGLA PARA TODOS LOS COMPONENTES

Esta regla no aplica únicamente a Stored Procedures.

Debe detenerse el proceso ante errores relacionados con:

* Tablas.
* Columnas.
* Índices.
* Constraints.
* Functions.
* Views.
* Triggers.
* SP.
* Migraciones.
* Datos obligatorios.
* Configuraciones.
* Archivos.
* Dependencias.
* Servicios.
* APIs.
* Instaladores.
* Actualizadores.

---

## 34.25. REGLA FINAL

### SI EXISTE UN ERROR QUE NO HA SIDO VALIDADO COMO SEGURO, EL PROCESO DEBE DETENERSE.

No debe:

```text
Ignorar
Ocultar
Continuar
Disfrazar como warning
Finalizar como exitoso
```

Debe:

```text
DETECTAR
↓
MOSTRAR
↓
REGISTRAR
↓
DETENER
↓
CORREGIR
↓
VOLVER A VALIDAR
↓
CONTINUAR ÚNICAMENTE SI PASS
```

---

## 34.26. PRINCIPIO MAESTRO

> **Es preferible que un instalador se detenga y muestre un error antes de modificar completamente el ambiente, a que continúe silenciosamente y deje una instalación incompleta o inconsistente.**

Esta regla es obligatoria para todos los instaladores y actualizadores de Korex, tanto PostgreSQL como SQL Server.

Ningún proceso podrá reportar éxito si existe un paso requerido que haya fallado.

---

## 34.27. SISTEMA DE TRES BARRERAS DE KOREXVALIDATOR

El validador y los scripts de instalación / actualización operan bajo una arquitectura de **Tres Barreras de Protección Infranqueables**:

```text
┌────────────────────────────────────────────────────────┐
│ BARRERA 1: VALIDACIÓN PREVIA (Pre-Build / Pre-Install)  │
├────────────────────────────────────────────────────────┤
│ ¿El paquete está 100% completo, con todos los SPs,     │
│ tablas, columnas, DDLs y hashes intactos?              │
│   ├── NO → [BLOQUEAR COMPILACIÓN Y DESPLIEGUE]          │
│   └── SÍ → Proceder a Ejecución                        │
└────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────┐
│ BARRERA 2: EJECUCIÓN CONTROLADA (Fail Fast / Fail Safe) │
├────────────────────────────────────────────────────────┤
│ ¿Cada bloque GO / Statement ejecutó limpiamente sin    │
│ errores no catalogados?                                │
│   ├── NO → [DETENER INMEDIATAMENTE - STOP & ALERT]     │
│   └── SÍ → Siguiente bloque                            │
└────────────────────────────────────────────────────────┘
                           ↓
┌────────────────────────────────────────────────────────┐
│ BARRERA 3: VALIDACIÓN POSTERIOR (Post-Install Audit)   │
├────────────────────────────────────────────────────────┤
│ ¿La base de datos resultante contiene el 100% de los   │
│ objetos, columnas y SPs activos en sys.procedures /    │
│ information_schema?                                    │
│   ├── NO → [NO GO - DECLARAR ACTUALIZACIÓN FALLIDA]    │
│   └── SÍ → [DICTAMEN GO - ACTUALIZACIÓN EXITOSA]       │
└────────────────────────────────────────────────────────┘
```

