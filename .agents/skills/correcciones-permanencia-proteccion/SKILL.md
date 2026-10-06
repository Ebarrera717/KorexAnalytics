---
name: correcciones-permanencia-proteccion
description: SKILL MAESTRO universal y obligatorio para la prevención de regresiones, protección permanente de correcciones validadas y garantía de no eliminación o alteración de funcionalidades, configuraciones, parámetros y comportamientos en Korex (PostgreSQL y SQL Server).
---

# SKILL MAESTRO — CONTROL DE REGRESIONES Y PROTECCIÓN DE CORRECCIONES

## 1. OBJETIVO

Establecer un mecanismo obligatorio para impedir que una corrección, funcionalidad, configuración o comportamiento previamente desarrollado y validado en Korex sea perdido, sobrescrito, eliminado, alterado o vuelva a presentar el mismo error como consecuencia de nuevos desarrollos.

Esta regla aplica a TODO el proyecto Korex y no únicamente a casos particulares.

El objetivo principal es:

> **NO REPETIR TRABAJO YA REALIZADO.**

Una vez solucionado y validado un problema, debe quedar protegido para que las futuras versiones de Korex verifiquen automáticamente que la solución continúa funcionando.

---

## 2. REGLA FUNDAMENTAL

Toda corrección realizada en Korex debe convertirse en una **prueba de regresión permanente**.

El ciclo obligatorio será:

**Problema → Corrección → Identificación de causa raíz → Prueba → Validación → Protección permanente → Regresión en futuras versiones**

Una corrección NO se considera completamente terminada simplemente porque funciona después de modificar el código.

Debe garantizarse que:

* continúa funcionando posteriormente;
* no es sobrescrita por otro desarrollo;
* no es eliminada por una migración;
* no es modificada por un instalador;
* no es modificada por un actualizador;
* no es afectada por otro script;
* no es reemplazada por una configuración anterior;
* funciona en PostgreSQL;
* funciona en SQL Server;
* funciona después de instalar;
* funciona después de actualizar.

---

## 3. ALCANCE GENERAL

Esta política debe aplicarse a TODOS los componentes de Korex:

### Aplicación

* Frontend.
* Backend.
* APIs.
* Servicios.
* Procesos automáticos.
* Validaciones.
* Formularios.
* Reportes.
* Exportaciones.
* Importaciones.
* Interfaces externas.
* Procesos programados.

### Base de datos

* Tablas.
* Columnas.
* Índices.
* Constraints.
* SP.
* Funciones.
* Triggers.
* Vistas.
* Parámetros.
* Datos iniciales.
* Migraciones.
* Scripts.
* Jobs.
* Procesos automáticos.

### Configuración

* Parámetros del sistema.
* Variables de configuración.
* `.env`.
* Configuración SQL.
* Configuración de interfaces.
* Configuración de procesos automáticos.

### Instaladores

* Setup PostgreSQL.
* Setup SQL Server.
* Scripts de instalación.
* Creación de estructuras.
* Carga de parámetros.
* Scripts posteriores a instalación.

### Actualizadores

* Actualizador PostgreSQL.
* Actualizador SQL Server.
* Migraciones.
* Scripts de actualización.
* Copias de archivos.
* Configuración.

### Infraestructura

* PostgreSQL.
* SQL Server.
* Servicios.
* Procesos auxiliares.
* Integraciones.

---

## 4. CADA CORRECCIÓN DEBE GENERAR UNA PRUEBA DE REGRESIÓN

Cuando se encuentre y corrija cualquier problema, se debe crear una prueba que permita detectar si ese mismo problema vuelve a aparecer.

Ejemplos:

* Un parámetro que se estaba ignorando.
* Un SP que generaba información incorrecta.
* Una tabla que no se creaba.
* Una función que fallaba.
* Un proceso que no generaba movimientos.
* Una factura que no se enviaba.
* Un reporte que mostraba información incorrecta.
* Una validación que no funcionaba.
* Un instalador que sobrescribía información.
* Un actualizador que modificaba configuración.
* Una interfaz que dejaba de funcionar.

Todos estos casos deben convertirse en pruebas permanentes.

---

## 5. NO EXISTEN "CORRECCIONES TEMPORALES"

Una modificación manual en una base de datos o servidor puede utilizarse para investigar o confirmar un problema, pero NO constituye una solución definitiva.

Toda solución definitiva debe quedar incorporada en el mecanismo correspondiente.

Por ejemplo:

Si se modifica manualmente un parámetro y el problema desaparece, se debe determinar:

* por qué tenía el valor incorrecto;
* quién lo modificó;
* qué script lo estableció;
* si un instalador lo sobrescribe;
* si un actualizador lo modifica;
* si existe otra fuente de configuración;
* si el código está leyendo otra ubicación;
* si existe duplicidad de configuración.

La solución definitiva debe corregir la causa y no únicamente el resultado.

---

## 6. PROTECCIÓN CONTRA REGRESIONES

Antes de aprobar cualquier cambio nuevo, Korex debe ejecutar las pruebas existentes.

Esto significa que:

> **Los nuevos desarrollos deben probarse contra todo lo que ya funcionaba.**

No se debe probar únicamente la funcionalidad nueva.

Ejemplo:

Se desarrolla una nueva funcionalidad de facturación.

No basta con probar facturación.

También deben ejecutarse las pruebas relacionadas con:

* cotizaciones;
* facturas;
* exportaciones;
* interfaces;
* parámetros;
* movimientos;
* maestros;
* usuarios;
* permisos;
* reportes;
* procesos automáticos;
* y todas las demás regresiones existentes.

---

## 7. LAS PRUEBAS DE REGRESIÓN SON ACUMULATIVAS

Las pruebas NO deben eliminarse simplemente porque el problema ya fue solucionado.

Cada corrección importante agrega una nueva prueba al conjunto existente.

Por lo tanto:

Versión 1: 10 pruebas.  
Versión 2: 10 pruebas anteriores + 3 nuevas = 13.  
Versión 3: 13 anteriores + 5 nuevas = 18.  

Y así sucesivamente.

El conjunto de pruebas debe crecer y proteger el conocimiento acumulado del proyecto.

---

## 8. VALIDACIÓN DE CÓDIGO, BASE DE DATOS Y CONFIGURACIÓN

Cuando una prueba falle, se debe investigar todas las posibles fuentes del cambio.

La validación debe revisar como mínimo:

* código fuente;
* scripts;
* migraciones;
* SP;
* funciones;
* tablas;
* parámetros;
* datos iniciales;
* configuración;
* instaladores;
* actualizadores;
* procesos automáticos;
* archivos de configuración;
* dependencias.

No asumir que el problema está únicamente en el código.

---

## 9. DETECCIÓN DE SOBRESCRITURAS

Toda nueva versión debe identificar operaciones que puedan sobrescribir configuraciones o información existente.

Se deben revisar especialmente:

* INSERT;
* UPDATE;
* DELETE;
* MERGE;
* UPSERT;
* DROP;
* CREATE;
* ALTER;
* reemplazo de archivos;
* copia de configuraciones;
* regeneración de parámetros;
* inicialización de datos.

Cuando exista riesgo de sobrescribir información existente, debe determinarse si la operación es realmente necesaria y si respeta las reglas de protección del sistema.

---

## 10. PROTECCIÓN DE CONFIGURACIONES EXISTENTES

Las configuraciones existentes deben conservarse salvo que exista un requerimiento explícito para modificarlas.

Esto incluye especialmente configuraciones de producción.

El proceso de actualización debe diferenciar claramente entre:

### Configuración nueva
Puede crearse cuando no existe.

### Configuración existente
Debe conservarse.

### Configuración que requiere migración
Debe migrarse explícitamente y con respaldo.

### Configuración protegida
No puede modificarse automáticamente.

Esto aplica también al `.env`, el cual tiene su propia regla obligatoria de protección.

---

## 11. VALIDACIÓN DOBLE DE BASE DE DATOS

Toda corrección y nuevo desarrollo que tenga impacto en base de datos debe validarse en:

### PostgreSQL

Y también en:

### SQL Server

No se permite asumir que porque funciona en un motor funcionará automáticamente en el otro.

Se deben validar:

* tablas;
* SP;
* funciones;
* consultas;
* parámetros;
* transacciones;
* índices;
* tipos de datos;
* restricciones;
* procesos automáticos;
* rendimiento;
* instalación;
* actualización.

---

## 12. AISLAMIENTO DE MOTORES

Cuando se esté trabajando con SQL Server:

**NO se debe modificar, crear ni generar accidentalmente objetos PostgreSQL.**

Cuando se esté trabajando con PostgreSQL:

**NO se debe modificar, crear ni generar accidentalmente objetos SQL Server.**

Los instaladores y actualizadores deben permanecer completamente separados por motor.

---

## 13. VALIDACIÓN DEL INSTALADOR

Cada versión debe probarse mediante una instalación limpia.

Debe verificarse:

* estructura de base de datos;
* parámetros;
* configuración;
* SP;
* funciones;
* tablas;
* archivos;
* permisos;
* procesos;
* funcionalidades existentes.

Después de instalar se deben ejecutar nuevamente las pruebas de regresión.

---

## 14. VALIDACIÓN DEL ACTUALIZADOR

Cada versión debe probarse también sobre una instalación existente.

Debe verificarse:

* que los archivos correctos sean actualizados;
* que la base de datos sea actualizada;
* que las configuraciones existentes sean conservadas;
* que el `.env` no sea alterado;
* que no se elimine información;
* que no se pierdan parámetros;
* que no desaparezcan SP;
* que no desaparezcan funciones;
* que no se alteren funcionalidades existentes.

Después de actualizar se deben ejecutar nuevamente todas las pruebas de regresión.

---

## 15. PRUEBA DE "ANTES Y DESPUÉS"

Cuando sea técnicamente posible, el sistema de pruebas debe comparar:

### Antes de la actualización

* parámetros;
* objetos;
* estructuras;
* configuraciones;
* funcionalidades protegidas.

### Después de la actualización

Volver a verificar los mismos elementos.

Cualquier diferencia inesperada debe generar una alerta.

---

## 16. CONTROL DE CAMBIOS

Cada versión debe generar un registro de:

* archivos modificados;
* SP modificados;
* funciones modificadas;
* tablas modificadas;
* parámetros modificados;
* migraciones ejecutadas;
* configuraciones modificadas;
* nuevas funcionalidades;
* correcciones realizadas.

Esto permite determinar posteriormente qué cambio pudo generar una regresión.

---

## 17. PRUEBAS AUTOMÁTICAS DESDE EL PROPIO PROYECTO

Korex debe contar con un proceso ejecutable desde el proyecto que permita ejecutar automáticamente las pruebas (`node scripts/validate_full_suite.js`).

El proceso debe:

1. Identificar el motor seleccionado.
2. Ejecutar las pruebas correspondientes.
3. Validar base de datos.
4. Validar aplicación.
5. Validar procesos.
6. Ejecutar pruebas de regresión acumulativas.
7. Detectar diferencias.
8. Registrar errores.
9. Generar un reporte.
10. Indicar claramente PASS o FAIL.

Cuando corresponda, debe ejecutar el conjunto de pruebas tanto para PostgreSQL como para SQL Server.

---

## 18. BLOQUEO DE ENTREGA

Si una prueba de regresión falla:

**LA VERSIÓN NO DEBE CONSIDERARSE APROBADA.**

El proceso debe mostrar:

`REGRESIÓN DETECTADA`

e indicar:

* prueba fallida;
* funcionalidad afectada;
* versión;
* motor;
* evidencia;
* posible causa;
* objeto involucrado.

No se debe ocultar ni ignorar una prueba fallida para permitir la entrega.

---

## 19. REPORTE DE REGRESIONES

Cada ejecución debe generar un reporte con:

### Información general

* versión;
* fecha;
* hora;
* ambiente;
* motor de base de datos.

### Resultados

* pruebas ejecutadas;
* pruebas aprobadas;
* pruebas fallidas;
* pruebas nuevas;
* regresiones detectadas.

### Cambios

* código;
* SP;
* funciones;
* tablas;
* parámetros;
* configuraciones;
* archivos.

### Resultado

`APROBADO` o `NO APROBADO`.

---

## 20. CAUSA RAÍZ OBLIGATORIA

Cuando una regresión sea detectada, no basta con volver a corregir el problema.

Se debe identificar:

1. Qué funcionaba anteriormente.
2. Qué dejó de funcionar.
3. Qué cambio ocurrió entre ambas versiones.
4. Qué componente produjo la regresión.
5. Por qué las pruebas anteriores no la detectaron.
6. Qué prueba nueva o mejora de prueba debe incorporarse para impedir que vuelva a ocurrir.

---

## 21. REGLA DE NO REPETICIÓN

Cada vez que el equipo tenga que solucionar nuevamente un problema que ya había sido solucionado, debe considerarse una **falla del mecanismo de regresión**.

En ese caso no solamente debe corregirse el problema funcional.

También debe mejorarse el sistema de pruebas para evitar una tercera ocurrencia.

Principio obligatorio:

> **UN PROBLEMA CORREGIDO NO DEBE VOLVER A SER DESCUBIERTO COMO SI FUERA UN PROBLEMA NUEVO.**

---

## 22. CRITERIO FINAL DE CALIDAD

Una versión de Korex solamente podrá considerarse lista cuando:

* las nuevas funcionalidades funcionan;
* las correcciones funcionan;
* las pruebas de regresión funcionan;
* PostgreSQL funciona;
* SQL Server funciona;
* la instalación funciona;
* la actualización funciona;
* las configuraciones protegidas permanecen intactas;
* no existen regresiones conocidas;
* los errores detectados están documentados;
* el reporte automático indica resultado satisfactorio.

---

# PRINCIPIO MAESTRO

## "TODO LO QUE SE CORRIGE, SE PROTEGE."

No se debe depender de que un desarrollador recuerde una corrección anterior.

No se debe depender de una prueba manual realizada ayer.

No se debe depender de que una persona recuerde qué parámetro fue modificado.

El proyecto debe conservar ese conocimiento mediante:

**pruebas automáticas + pruebas de regresión + control de cambios + validación de instalación + validación de actualización + validación PostgreSQL + validación SQL Server.**

El objetivo es que Korex pueda evolucionar sin destruir accidentalmente lo que ya fue construido y validado.
