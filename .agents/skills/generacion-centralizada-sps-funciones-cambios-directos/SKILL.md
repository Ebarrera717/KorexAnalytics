---
name: generacion-centralizada-sps-funciones-cambios-directos
description: SKILL OBLIGATORIA — Generación centralizada y controlada de Stored Procedures y Functions para distribución y cambios manuales directos en clientes (SQL Server, PostgreSQL y ZeusERP).
---

# SKILL OBLIGATORIA — GENERACIÓN CENTRALIZADA DE SPs Y FUNCIONES PARA CAMBIOS DIRECTOS

## 1. Objetivo

Establecer una ubicación única, predecible y obligatoria para los Stored Procedures y Functions que se generan para realizar **cambios manuales y rápidos en bases de datos de clientes**, evitando que los desarrolladores tengan que buscar modificaciones en diferentes carpetas del proyecto.

Esta SKILL aplica a:

* PostgreSQL de Korex.
* SQL Server de Korex.
* ZeusERP.
* Stored Procedures.
* Functions.
* Nuevos objetos.
* Modificaciones de objetos existentes.
* Correcciones de objetos existentes.

Los archivos generados bajo esta estructura son utilizados como **mecanismo de distribución manual y rápida** de cambios.

### IMPORTANTE

Esta estructura **NO debe reemplazar, alterar ni romper el mecanismo actual de compilación, instalación o actualización de Korex**.

La compilación existente debe continuar funcionando exactamente como antes.

---

## 2. Estructura obligatoria

La estructura base será:

```text
F:\Proyectos\AgenciasNew\SQL\
```

Dentro de ella deben existir las siguientes ubicaciones:

```text
F:\Proyectos\AgenciasNew\SQL\SqlServer\
F:\Proyectos\AgenciasNew\SQL\PostgreSQL\
F:\Proyectos\AgenciasNew\SQL\ZeusERP\
```

---

## 3. SQL Server — Korex

Todos los SPs y Functions de Korex correspondientes a SQL Server deben centralizarse en:

```text
F:\Proyectos\AgenciasNew\SQL\SqlServer\
```

Debe existir además un archivo consolidado:

```text
F:\Proyectos\AgenciasNew\SQL\SqlServer\TODOS_LOS_SPS_Y_FUNCIONES_SQLSERVER.sql
```

Este archivo debe contener la suma de **todos los SPs y Functions de Korex SQL Server que sean objeto de distribución manual**.

---

## 4. PostgreSQL — Korex

Todos los SPs y Functions de Korex correspondientes a PostgreSQL deben centralizarse en:

```text
F:\Proyectos\AgenciasNew\SQL\PostgreSQL\
```

Debe existir además un archivo consolidado:

```text
F:\Proyectos\AgenciasNew\SQL\PostgreSQL\TODOS_LOS_SPS_Y_FUNCIONES_POSTGRESQL.sql
```

Este archivo debe contener la suma de **todos los SPs y Functions de Korex PostgreSQL que sean objeto de distribución manual**.

---

## 5. ZeusERP

Los SPs y Functions destinados a ZeusERP deben centralizarse exclusivamente en:

```text
F:\Proyectos\AgenciasNew\SQL\ZeusERP\
```

Debe existir un archivo consolidado:

```text
F:\Proyectos\AgenciasNew\SQL\ZeusERP\TODOS_LOS_SPS_Y_FUNCIONES_ZEUSERP.sql
```

Este archivo debe contener la suma de todos los SPs y Functions de ZeusERP destinados a distribución manual.

---

## 6. Generación individual obligatoria

Cada SP o Function debe generarse también como archivo individual.

Ejemplo SQL Server:

```text
F:\Proyectos\AgenciasNew\SQL\SqlServer\
    spInvoicesObtener.sql
    spExportInvoices.sql
    spFacturacion.sql
    fnCalcularTotal.sql
```

PostgreSQL:

```text
F:\Proyectos\AgenciasNew\SQL\PostgreSQL\
    spInvoicesObtener.sql
    spExportInvoices.sql
    fnCalcularTotal.sql
```

ZeusERP:

```text
F:\Proyectos\AgenciasNew\SQL\ZeusERP\
    spExportarFactura.sql
    spActualizarReserva.sql
    fnCalcularImpuesto.sql
```

El nombre real deberá respetar el nombre del objeto de base de datos.

---

## 7. Generación individual + consolidada

Cada modificación debe producir dos resultados:

### Resultado individual

```text
spInvoicesObtener.sql
```

### Resultado consolidado

Debe quedar automáticamente incluido en:

```text
TODOS_LOS_SPS_Y_FUNCIONES_SQLSERVER.sql
```

o:

```text
TODOS_LOS_SPS_Y_FUNCIONES_POSTGRESQL.sql
```

o:

```text
TODOS_LOS_SPS_Y_FUNCIONES_ZEUSERP.sql
```

según corresponda.

Esto significa que **no se debe permitir que exista un SP o Function generado individualmente pero ausente del archivo consolidado**.

---

## 8. Regla de selección del motor

El proceso debe determinar claramente el motor antes de generar los archivos.

### Si es SQL Server de Korex

Destino:

```text
F:\Proyectos\AgenciasNew\SQL\SqlServer\
```

Consolidado:

```text
TODOS_LOS_SPS_Y_FUNCIONES_SQLSERVER.sql
```

### Si es PostgreSQL de Korex

Destino:

```text
F:\Proyectos\AgenciasNew\SQL\PostgreSQL\
```

Consolidado:

```text
TODOS_LOS_SPS_Y_FUNCIONES_POSTGRESQL.sql
```

### Si es ZeusERP

Destino:

```text
F:\Proyectos\AgenciasNew\SQL\ZeusERP\
```

Consolidado:

```text
TODOS_LOS_SPS_Y_FUNCIONES_ZEUSERP.sql
```

Nunca se debe mezclar un objeto de un motor o sistema con otro.

---

## 9. Validación de correspondencia

Después de generar los archivos individuales y los consolidados, el proceso debe validar automáticamente:

```text
OBJETOS DETECTADOS
        =
OBJETOS INDIVIDUALES
        =
OBJETOS DEL CONSOLIDADO
```

Ejemplo:

```text
SPs/Functions detectados:       128
Archivos individuales:          128
Objetos en consolidado:         128

Faltantes:                        0
Duplicados:                       0
```

Resultado:

```text
GENERACIÓN CORRECTA
```

---

## 10. El consolidado no se debe construir manualmente

El archivo:

```text
TODOS_LOS_SPS_Y_FUNCIONES_SQLSERVER.sql
```

debe ser generado automáticamente a partir de los archivos individuales o de la fuente definida por el proyecto.

No se debe depender de que un desarrollador recuerde agregar manualmente un SP al consolidado.

Lo mismo aplica para:

```text
TODOS_LOS_SPS_Y_FUNCIONES_POSTGRESQL.sql
```

y:

```text
TODOS_LOS_SPS_Y_FUNCIONES_ZEUSERP.sql
```

---

## 11. Detección de SPs o Functions faltantes

Si existe un objeto en la fuente de desarrollo pero no se encuentra en la generación:

```text
ERROR

Objeto detectado:
dbo.spExportInvoices

Archivo individual:
NO GENERADO

Archivo consolidado:
NO INCLUIDO
```

La generación debe finalizar como:

```text
FAILED
```

y no debe indicar éxito.

---

## 12. Detección de diferencias entre individual y consolidado

También debe comprobarse que la definición contenida en:

```text
spExportInvoices.sql
```

sea la misma definición que fue incluida dentro de:

```text
TODOS_LOS_SPS_Y_FUNCIONES_SQLSERVER.sql
```

Si son diferentes:

```text
ERROR

Objeto:
spExportInvoices

Archivo individual:
HASH AAAAA

Consolidado:
HASH BBBBB

RESULTADO:
INCONSISTENTE
```

Debe bloquearse la generación hasta corregirlo.

---

## 13. Validación antes de sobrescribir

Cuando un SP o Function ya exista, el proceso debe determinar si:

* no cambió;
* cambió;
* fue eliminado;
* fue agregado.

No debe sobrescribir silenciosamente información sin registrar qué ocurrió.

Ejemplo:

```text
spExportInvoices.sql
ANTES: HASH AAAAA
AHORA: HASH BBBBB

RESULTADO:
MODIFICADO
```

---

## 14. Registro de generación

Cada ejecución debe generar un reporte indicando:

```text
Motor:
SQL Server

Destino:
F:\Proyectos\AgenciasNew\SQL\SqlServer\

Objetos detectados:
128

Objetos generados:
128

Objetos consolidados:
128

Nuevos:
2

Modificados:
4

Sin cambios:
122

Faltantes:
0

Duplicados:
0

Resultado:
SUCCESS
```

---

## 15. Protección de la compilación

Esta SKILL **NO debe modificar la estructura que utiliza el compilador actual**, salvo que sea estrictamente necesario y se valide que no existe regresión.

La generación de:

```text
SQL\SqlServer\
SQL\PostgreSQL\
SQL\ZeusERP\
```

y sus archivos consolidados debe considerarse un **artefacto adicional de distribución manual**.

El sistema de compilación existente debe continuar utilizando sus fuentes actuales.

Por lo tanto:

```text
COMPILACIÓN
     │
     └──► Mantener funcionamiento actual

DISTRIBUCIÓN MANUAL
     │
     └──► SQL\SqlServer
          SQL\PostgreSQL
          SQL\ZeusERP
```

---

## 16. No duplicar fuentes de verdad innecesariamente

Aunque se generen archivos individuales y consolidados, no se deben crear múltiples fuentes independientes de la misma definición.

La definición real debe tener una fuente principal.

Los archivos de distribución deben ser **generados**, no mantenidos manualmente.

Por ejemplo:

```text
FUENTE ORIGINAL
      │
      ├──► spExportInvoices.sql
      │
      └──► TODOS_LOS_SPS_Y_FUNCIONES_SQLSERVER.sql
```

El archivo consolidado debe ser un producto generado, no una segunda versión que un desarrollador tenga que editar manualmente.

---

## 17. Uso para cambios manuales y rápidos

La finalidad de esta estructura es permitir que una persona pueda identificar rápidamente qué debe ejecutar.

Ejemplo:

> Se corrigió `spExportInvoices`.

La persona debe poder encontrarlo directamente en:

```text
F:\Proyectos\AgenciasNew\SQL\SqlServer\spExportInvoices.sql
```

Si necesita ejecutar todos los SPs y Functions:

```text
F:\Proyectos\AgenciasNew\SQL\SqlServer\TODOS_LOS_SPS_Y_FUNCIONES_SQLSERVER.sql
```

Para PostgreSQL:

```text
F:\Proyectos\AgenciasNew\SQL\PostgreSQL\TODOS_LOS_SPS_Y_FUNCIONES_POSTGRESQL.sql
```

Para ZeusERP:

```text
F:\Proyectos\AgenciasNew\SQL\ZeusERP\TODOS_LOS_SPS_Y_FUNCIONES_ZEUSERP.sql
```

---

## 18. Regla para nuevos SPs y Functions

Cuando se cree un nuevo SP o Function:

1. Debe ser detectado automáticamente.
2. Debe generarse su archivo individual.
3. Debe incorporarse automáticamente al consolidado correspondiente.
4. Debe aparecer en el reporte de generación.
5. Debe ser validado contra la fuente.
6. Debe quedar disponible para distribución manual.
7. No debe requerir edición manual del archivo consolidado.

---

## 19. Regla para modificaciones

Cuando se modifique un SP o Function existente:

1. Detectar la modificación.
2. Regenerar el archivo individual.
3. Actualizar el consolidado.
4. Validar que ambos contienen la misma definición.
5. Registrar el cambio.
6. Informar que el objeto quedó disponible para distribución manual.

---

## 20. Regla para eliminaciones

Si un SP o Function es eliminado del proyecto, el proceso debe detectarlo.

No debe eliminar automáticamente archivos de distribución sin dejar registro.

Debe informar:

```text
OBJETO ELIMINADO

spProcedimientoAntiguo

Debe determinarse si:
[ ] Se elimina del paquete manual
[ ] Se mantiene por compatibilidad
[ ] Se requiere script DROP
```

La eliminación debe ser explícita y controlada.

---

## 21. Validación final obligatoria

Antes de declarar exitosa la generación:

```text
[OK] Fuente validada
[OK] Objetos detectados
[OK] Archivos individuales generados
[OK] Consolidado generado
[OK] Cantidades coinciden
[OK] Hashes coinciden
[OK] No existen objetos faltantes
[OK] No existen duplicados
[OK] No existen inconsistencias
[OK] Compilación no afectada
```

Resultado:

```text
GENERACIÓN DE CAMBIOS MANUALES: EXITOSA
```

---

## 22. Regla fundamental

A partir de esta SKILL:

> **Todo SP o Function que pueda requerir una actualización manual debe poder encontrarse en un único directorio según su motor/sistema y debe existir tanto individualmente como dentro del archivo consolidado correspondiente.**

La persona que deba realizar una corrección manual no debe tener que buscar el objeto en diferentes carpetas del proyecto.

La estructura oficial será:

```text
F:\Proyectos\AgenciasNew\SQL\
│
├── SqlServer\
│   ├── sp1.sql
│   ├── sp2.sql
│   ├── fn1.sql
│   └── TODOS_LOS_SPS_Y_FUNCIONES_SQLSERVER.sql
│
├── PostgreSQL\
│   ├── sp1.sql
│   ├── sp2.sql
│   ├── fn1.sql
│   └── TODOS_LOS_SPS_Y_FUNCIONES_POSTGRESQL.sql
│
└── ZeusERP\
    ├── sp1.sql
    ├── sp2.sql
    ├── fn1.sql
    └── TODOS_LOS_SPS_Y_FUNCIONES_ZEUSERP.sql
```

Esta estructura será considerada **estándar obligatorio para distribución manual de cambios de SPs y Functions** y deberá mantenerse estable para evitar que las personas tengan que buscar modificaciones en múltiples ubicaciones.
