---
name: instrucciones-aplicacion-produccion
description: SKILL OBLIGATORIA universal para la documentación exacta, no ambigua y paso a paso de las acciones requeridas en producción (Base de Datos, Sitio, Servicios, Configuración y .env) para cualquier desarrollo o corrección en Korex (PostgreSQL y SQL Server).
---

# SKILL OBLIGATORIA — INSTRUCCIONES DE APLICACIÓN EN PRODUCCIÓN

## Objetivo

Todo desarrollo, modificación, corrección, ajuste o solución realizada en Korex debe incluir obligatoriamente una **descripción clara y precisa de las acciones que deben ejecutarse en producción** para que el cambio quede correctamente aplicado.

La persona encargada de realizar el paso a producción debe poder ejecutar las instrucciones **sin tener que interpretar, investigar nuevamente la causa o determinar por su cuenta qué archivos, procedimientos, servicios o componentes debe modificar**.

---

## 1. Obligación de documentar la solución productiva

Cada cambio debe indicar explícitamente:

* Qué se corrigió o desarrolló.
* Cuál fue la causa del problema, cuando aplique.
* Qué componentes fueron modificados.
* Qué debe hacerse en producción.
* En qué orden deben ejecutarse las acciones.
* Qué archivos deben copiarse o actualizarse.
* Qué SPs, funciones, tablas, vistas, triggers u otros objetos de BD deben ejecutarse o actualizarse.
* Si es necesario detener o reiniciar el sitio.
* Si es necesario reiniciar servicios.
* Si es necesario ejecutar scripts adicionales.
* Si es necesario realizar alguna configuración manual.
* Qué validaciones deben realizarse después de aplicar el cambio.
* Qué NO debe modificarse.

---

## 2. Clasificación obligatoria del cambio

Antes de entregar una solución se debe determinar y documentar claramente cuál de los siguientes escenarios aplica:

### A. Cambio únicamente en Base de Datos

Ejemplo:
> La solución requiere únicamente actualizar los SPs `spInvoicesObtener` y `spExportInvoices` en producción.

Debe indicarse:
* Base de datos donde se debe ejecutar.
* Scripts exactos.
* Orden de ejecución.
* Dependencias.
* Validación posterior.

### B. Cambio únicamente en el sitio

Ejemplo:
> La solución requiere únicamente actualizar los archivos del sitio.

Debe indicarse:
* Archivos/componentes que deben actualizarse.
* Ubicación donde deben copiarse.
* Si es necesario bajar el sitio.
* Si es necesario reiniciar IIS, servicio o proceso.
* Si es necesario limpiar caché/build.
* Validación posterior.

### C. Cambio en Base de Datos + Sitio

Debe especificarse claramente **qué se debe actualizar en cada componente y en qué orden**.

Ejemplo:
1. Respaldar/verificar `.env`.
2. Detener el sitio.
3. Actualizar SPs.
4. Actualizar archivos del sitio.
5. Ejecutar migraciones adicionales.
6. Levantar/reiniciar el sitio.
7. Ejecutar pruebas funcionales.
8. Verificar logs.

### D. Cambio que requiere acciones adicionales

Si la solución requiere cualquier otra actividad, debe documentarse explícitamente.

Por ejemplo:
* Reiniciar Windows Service.
* Reiniciar IIS.
* Reiniciar Node/PM2.
* Ejecutar un `.bat`.
* Ejecutar PowerShell.
* Configurar permisos.
* Crear una carpeta.
* Registrar un componente.
* Actualizar una DLL.
* Ejecutar una migración.
* Limpiar archivos temporales.
* Ejecutar un proceso de sincronización.
* Realizar una configuración manual.

---

## 3. Sección obligatoria: "ACCIONES REQUERIDAS EN PRODUCCIÓN"

Toda solución debe incluir una sección denominada exactamente:

## ACCIONES REQUERIDAS EN PRODUCCIÓN

Esta sección debe ser suficientemente detallada para que un operador pueda aplicar el cambio directamente.

Debe utilizar una estructura similar a:

### 1. Base de datos
Indicar:
* Motor: PostgreSQL / SQL Server / Ambos.
* Base de datos afectada.
* Scripts que deben ejecutarse.
* SPs/funciones/tablas afectadas.
* Orden de ejecución.

### 2. Sitio / Aplicación
Indicar:
* Componentes que deben actualizarse.
* Archivos o carpetas.
* Si se debe bajar el sitio.
* Si se debe reiniciar la aplicación.
* Si se debe reiniciar algún servicio.

### 3. Configuración
Indicar cualquier modificación requerida.

**IMPORTANTE:** Si el cambio no requiere modificar configuración, debe indicarse expresamente:
> *No se requiere modificar configuración ni archivos `.env`.*

### 4. Orden de ejecución
Debe especificarse el orden exacto de las actividades.

### 5. Validación
Debe indicarse cómo comprobar que la solución quedó correctamente aplicada.

---

## 4. Nunca dejar instrucciones ambiguas

No se permiten instrucciones como:
* ❌ "Actualizar producción."
* ❌ "Subir los cambios."
* ❌ "Aplicar la corrección."
* ❌ "Actualizar la base."
* ❌ "Copiar los archivos necesarios."
* ❌ "Reiniciar si es necesario."
* ❌ "Ejecutar los SPs correspondientes."

Estas instrucciones son insuficientes. Debe indicarse exactamente **qué**, **dónde**, **cómo** y **cuándo**.

### Ejemplo incorrecto:
> ❌ Actualizar los SPs en producción y subir los cambios del sitio.

### Ejemplo correcto:
> **Producción — SQL Server**
> 1. Ejecutar `SQL/SqlServer/spInvoicesObtener.sql` sobre la base `Korex_Produccion`.
> 2. Ejecutar `SQL/SqlServer/spExportInvoices.sql`.
> 3. Verificar que ambos procedimientos existan y tengan la versión esperada.
> 4. Detener el sitio Korex.
> 5. Reemplazar los archivos de la carpeta `dist` por la versión liberada.
> 6. Verificar que el archivo `.env` existente permanezca intacto.
> 7. Iniciar nuevamente el sitio.
> 8. Ejecutar la prueba de generación de factura.
> 9. Verificar que no existan errores relacionados con `spInvoicesObtener` o `spExportInvoices`.

---

## 5. Protección obligatoria del `.env`

En cualquier actualización debe indicarse explícitamente el tratamiento del `.env`.

El proceso de actualización **NO puede modificar, reemplazar, regenerar, eliminar, mover ni sobrescribir el `.env` existente en producción**.

Antes de realizar una actualización se debe:
1. Detectar el `.env` existente.
2. Verificar que corresponde a la instalación de producción.
3. Respaldarlo o verificar su integridad.
4. Excluirlo de cualquier copia o reemplazo.
5. Después de la actualización, comprobar que continúa intacto.

Cuando no se requiera ninguna modificación de configuración, la documentación debe indicarlo:
> **`.env`: NO MODIFICAR. Debe conservarse exactamente el archivo existente en producción.**

---

## 6. Compatibilidad con PostgreSQL y SQL Server

Cuando el desarrollo corresponda a Korex, la documentación debe especificar claramente el motor afectado:
* PostgreSQL
* SQL Server
* Ambos

No se debe asumir que una instrucción aplica automáticamente para ambos motores. Si la solución requiere cambios diferentes por motor, deben documentarse por separado.

Ejemplo:
### PostgreSQL
* Ejecutar `X.sql`.
* Reiniciar aplicación.

### SQL Server
* Ejecutar `Y.sql`.
* Actualizar SP `Z`.
* Reiniciar aplicación.

Si un motor no requiere cambios, también debe indicarse:
> **PostgreSQL: No requiere cambios.**

---

## 7. Dependencias y orden obligatorio

Cuando un cambio tenga dependencias, estas deben quedar explícitas.

Por ejemplo:
> El SP `spExportInvoices` depende de la nueva columna `isExcelImport`.

Por lo tanto:
1. Actualizar tabla.
2. Verificar columna.
3. Actualizar SP.
4. Validar compilación.
5. Actualizar sitio.
6. Ejecutar prueba funcional.

Nunca se debe entregar una solución donde el operador tenga que deducir el orden correcto.

---

## 8. Validación posterior obligatoria

Toda solución debe definir cómo comprobar que el cambio quedó correctamente aplicado.

La validación debe incluir, cuando corresponda:
* Existencia del objeto de BD.
* Versión correcta del SP/función.
* Existencia de columnas/tablas.
* Ejecución correcta del proceso.
* Prueba funcional.
* Verificación de logs.
* Verificación de errores.
* Verificación del sitio.
* Verificación de servicios.
* Verificación de integración con sistemas externos.

Debe quedar claro **qué resultado se espera obtener**.

---

## 9. Resultado final obligatorio

Antes de considerar terminado un desarrollo, modificación o corrección, el responsable debe poder responder claramente:

> **¿Qué debe hacer la persona de producción para aplicar esta solución?**

La respuesta debe estar incluida dentro de la documentación del cambio.

Ningún desarrollo o corrección debe considerarse completamente documentado si la persona encargada de producción necesita contactar al desarrollador para preguntarle qué debe ejecutar, copiar, reiniciar, actualizar o modificar.

---

## 10. Plantilla obligatoria para cada solución

Toda entrega deberá incluir como mínimo:

```markdown
**SOLUCIÓN:**
Descripción de la solución implementada.

**CAUSA:**
Causa raíz identificada, cuando aplique.

**ALCANCE DEL CAMBIO:**
- [ ] Base de datos
- [ ] Sitio
- [ ] Base de datos + Sitio
- [ ] Configuración
- [ ] Servicio
- [ ] Otro

**MOTOR AFECTADO:**
- [ ] PostgreSQL
- [ ] SQL Server
- [ ] Ambos
- [ ] No aplica

**ACCIONES REQUERIDAS EN PRODUCCIÓN:**
1. ...
2. ...
3. ...

**ARCHIVOS A ACTUALIZAR:**
- ...

**OBJETOS DE BASE DE DATOS A ACTUALIZAR:**
- ...

**SERVICIOS / SITIO:**
- ...

**CONFIGURACIÓN:**
- ...

**`.env`:**
Indicar expresamente si debe permanecer sin modificaciones.

**ORDEN DE EJECUCIÓN:**
1. ...
2. ...
3. ...

**VALIDACIÓN POSTERIOR:**
1. ...
2. ...
3. ...

**RESULTADO ESPERADO:**
Describir claramente cómo se determina que la solución quedó correctamente aplicada.

**NO MODIFICAR:**
Indicar cualquier archivo, base de datos, configuración, objeto externo o componente que no deba tocarse.
```
