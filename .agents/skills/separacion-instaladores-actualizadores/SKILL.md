---
name: separacion-instaladores-actualizadores
description: Regla permanente de separación absoluta de instaladores, actualizadores y procesos de generación entre PostgreSQL y SQL Server (GenerarSetup.bat/GenerarActualizador.bat vs GenerarSetupSqlServer.bat/GenerarActualizadorSqlServer.bat).
---

# SKILL OBLIGATORIO – SEPARACIÓN TOTAL DE INSTALADORES Y ACTUALIZADORES

## 1. OBJETIVO

Garantizar una separación absoluta entre los procesos utilizados para instalar, actualizar y mantener Korex sobre:

* PostgreSQL
* SQL Server

Cada motor debe disponer de sus propios procesos, archivos, scripts, configuraciones y ejecutables de instalación y actualización.

No se debe utilizar un instalador genérico que determine dinámicamente el motor ni compartir procesos de instalación entre ambos motores.

La separación debe existir tanto en:

* Generación.
* Instalación.
* Actualización.
* Configuración.
* Scripts.
* Migraciones.
* Base de datos.
* Ejecución.
* Validación.

---

## 2. REGLA PRINCIPAL

Los procesos de PostgreSQL y SQL Server son INDEPENDIENTES.

### POSTGRESQL

Los siguientes archivos son EXCLUSIVAMENTE para PostgreSQL:

```text
GenerarSetup.bat
GenerarActualizador.bat
```

Estos archivos solamente pueden generar instaladores y actualizadores destinados a PostgreSQL.

---

### SQL SERVER

Los siguientes archivos son EXCLUSIVAMENTE para SQL Server:

```text
GenerarSetupSqlServer.bat
GenerarActualizadorSqlServer.bat
```

Estos archivos solamente pueden generar instaladores y actualizadores destinados a SQL Server.

---

## 3. MATRIZ OBLIGATORIA

| Archivo                          | Motor permitido | Motor prohibido |
| -------------------------------- | --------------- | --------------- |
| GenerarSetup.bat                 | PostgreSQL      | SQL Server      |
| GenerarActualizador.bat          | PostgreSQL      | SQL Server      |
| GenerarSetupSqlServer.bat        | SQL Server      | PostgreSQL      |
| GenerarActualizadorSqlServer.bat | SQL Server      | PostgreSQL      |

Esta matriz es una REGLA OBLIGATORIA.

---

## 4. GENERARSETUP.BAT

`GenerarSetup.bat` debe generar EXCLUSIVAMENTE el instalador de Korex para PostgreSQL.

Debe:

* Utilizar únicamente configuración PostgreSQL.
* Incluir únicamente componentes necesarios para PostgreSQL.
* Incluir únicamente scripts/migraciones PostgreSQL.
* Generar únicamente el instalador PostgreSQL.
* No consultar SQL Server.
* No requerir SQL Server.
* No detectar SQL Server.
* No crear configuraciones para SQL Server.
* No modificar archivos destinados al instalador SQL Server.

Está PROHIBIDO que este proceso genere un instalador híbrido PostgreSQL + SQL Server.

---

## 5. GENERARACTUALIZADOR.BAT

`GenerarActualizador.bat` debe generar EXCLUSIVAMENTE el actualizador de Korex para PostgreSQL.

Debe:

* Utilizar únicamente configuración PostgreSQL.
* Generar únicamente scripts de actualización PostgreSQL.
* Ejecutar únicamente migraciones PostgreSQL.
* No incluir scripts SQL Server.
* No consultar SQL Server.
* No modificar configuraciones SQL Server.
* No generar actualizadores híbridos.

---

## 6. GENERARSETUPSQLSERVER.BAT

`GenerarSetupSqlServer.bat` debe generar EXCLUSIVAMENTE el instalador de Korex para SQL Server.

Debe:

* Utilizar únicamente configuración SQL Server.
* Incluir únicamente componentes SQL Server.
* Incluir únicamente scripts/migraciones SQL Server.
* Generar únicamente el instalador SQL Server.
* No consultar PostgreSQL.
* No requerir PostgreSQL.
* No detectar PostgreSQL.
* No modificar archivos del instalador PostgreSQL.

### IMPORTANTE

El instalador SQL Server NO debe crear automáticamente la base de datos del cliente.

Debe asumir que:

> La base de datos SQL Server debe existir previamente porque será creada/restaurada manualmente por el cliente o administrador de infraestructura.

El instalador debe:

1. Solicitar/recibir los datos de conexión.
2. Validar el servidor.
3. Validar la base de datos.
4. Validar credenciales/permisos.
5. Validar que la estructura requerida exista o pueda actualizarse según el proceso definido.
6. Configurar Korex.
7. Continuar únicamente si la validación es satisfactoria.

Si la base de datos no existe:

```text
INSTALACIÓN DETENIDA

La base de datos SQL Server especificada no existe.

Debe crear/restaurar previamente la base de datos y volver a ejecutar el instalador.
```

NO debe crearla automáticamente.

---

## 7. GENERARACTUALIZADORSQLSERVER.BAT

`GenerarActualizadorSqlServer.bat` debe generar EXCLUSIVAMENTE el actualizador de Korex para SQL Server.

Debe:

* Utilizar únicamente configuración SQL Server.
* Generar únicamente scripts SQL Server.
* Aplicar únicamente cambios SQL Server.
* No conectarse a PostgreSQL.
* No modificar PostgreSQL.
* No ejecutar migraciones PostgreSQL.
* No generar actualizadores PostgreSQL.

---

## 8. PROHIBICIÓN DE INSTALADORES HÍBRIDOS

NO se debe crear un proceso como:

```text
GenerarSetup.bat
    ↓
preguntar:
1. PostgreSQL
2. SQL Server
```

Ni:

```text
Setup.exe
    ↓
detectar motor
    ↓
instalar cualquiera
```

La selección del motor debe estar determinada DESDE EL PROCESO DE GENERACIÓN.

Debe existir una separación física y lógica:

```text
POSTGRESQL
─────────────────────────
GenerarSetup.bat
       ↓
Setup PostgreSQL

GenerarActualizador.bat
       ↓
Actualizador PostgreSQL
```

Y:

```text
SQL SERVER
─────────────────────────
GenerarSetupSqlServer.bat
       ↓
Setup SQL Server

GenerarActualizadorSqlServer.bat
       ↓
Actualizador SQL Server
```

---

## 9. EJECUCIÓN DE LOS INSTALADORES

La separación también debe mantenerse durante la ejecución.

### Instalador PostgreSQL

Debe saber que es un instalador PostgreSQL.

Debe trabajar exclusivamente con:

```text
PostgreSQL
```

No debe:

* buscar SQL Server;
* conectarse a SQL Server;
* modificar SQL Server;
* ejecutar scripts SQL Server;
* alterar configuraciones SQL Server.

---

### Instalador SQL Server

Debe saber que es un instalador SQL Server.

Debe trabajar exclusivamente con:

```text
SQL Server
```

No debe:

* buscar PostgreSQL;
* conectarse a PostgreSQL;
* modificar PostgreSQL;
* ejecutar scripts PostgreSQL;
* alterar configuraciones PostgreSQL.

---

## 10. ACTUALIZADORES

La misma separación debe aplicarse a los actualizadores.

### Actualizador PostgreSQL

```text
GenerarActualizador.bat
        ↓
Actualizador PostgreSQL
        ↓
PostgreSQL únicamente
```

### Actualizador SQL Server

```text
GenerarActualizadorSqlServer.bat
        ↓
Actualizador SQL Server
        ↓
SQL Server únicamente
```

---

## 11. NO COMPARTIR SCRIPTS DE BASE DE DATOS SIN CONTROL

Los scripts específicos de cada motor deben estar separados.

Ejemplo conceptual:

```text
/database
    /postgresql
        /migrations
        /procedures
        /functions
        /views
        /scripts

    /sqlserver
        /migrations
        /procedures
        /functions
        /views
        /scripts
```

Cada proceso de generación debe tomar únicamente los archivos correspondientes a su motor.

---

## 12. PROTECCIÓN CONTRA ERRORES

Cada generador debe validar que está trabajando con el motor correcto.

Por ejemplo:

```text
GenerarSetup.bat
→ MOTOR OBJETIVO = POSTGRESQL
```

```text
GenerarSetupSqlServer.bat
→ MOTOR OBJETIVO = SQL SERVER
```

Si se detecta una configuración incompatible:

```text
ERROR DE CONFIGURACIÓN

El proceso de generación PostgreSQL detectó componentes SQL Server.

La generación ha sido cancelada para evitar contaminación cruzada.
```

Y viceversa.

---

## 13. NO MODIFICAR EL OTRO INSTALADOR

La generación de un instalador nunca debe modificar archivos pertenecientes al otro motor.

Por ejemplo:

Ejecutar:

```text
GenerarSetupSqlServer.bat
```

debe garantizar:

```text
Setup SQL Server → PUEDE CAMBIAR
Setup PostgreSQL → SIN CAMBIOS
```

Ejecutar:

```text
GenerarSetup.bat
```

debe garantizar:

```text
Setup PostgreSQL → PUEDE CAMBIAR
Setup SQL Server → SIN CAMBIOS
```

La misma regla aplica para los actualizadores.

---

## 14. VALIDACIÓN AUTOMÁTICA

Antes de generar un instalador, el proceso debe verificar:

### PostgreSQL

```text
Motor objetivo: PostgreSQL
Scripts incluidos: PostgreSQL
Configuración: PostgreSQL
Migraciones: PostgreSQL
Dependencias: PostgreSQL
```

### SQL Server

```text
Motor objetivo: SQL Server
Scripts incluidos: SQL Server
Configuración: SQL Server
Migraciones: SQL Server
Dependencias: SQL Server
```

Si aparece un componente del motor contrario, la generación debe detenerse.

---

## 15. PRUEBA OBLIGATORIA DE AISLAMIENTO

El proceso automatizado de pruebas debe comprobar que:

### Ejecutando generación PostgreSQL

```text
PostgreSQL = GENERADO/CORRECTO
SQL Server = SIN MODIFICACIONES
```

### Ejecutando generación SQL Server

```text
SQL Server = GENERADO/CORRECTO
PostgreSQL = SIN MODIFICACIONES
```

Debe verificarse incluso mediante comparación de archivos/hash cuando sea técnicamente conveniente.

---

## 16. ACTUALIZACIONES FUTURAS

Todo nuevo desarrollo que afecte la instalación o actualización debe determinar explícitamente:

```text
¿Afecta PostgreSQL?
¿Afecta SQL Server?
¿Afecta ambos?
```

Si afecta ambos:

NO se debe modificar un único instalador intentando soportar ambos.

Se debe implementar:

```text
Cambio PostgreSQL
→ GenerarSetup.bat
→ GenerarActualizador.bat
```

y, cuando corresponda:

```text
Cambio SQL Server
→ GenerarSetupSqlServer.bat
→ GenerarActualizadorSqlServer.bat
```

Cada uno con su implementación correspondiente.

---

## 17. PRINCIPIO DE SEGURIDAD

La separación de instaladores NO es solamente una organización de archivos.

Es una medida de protección.

El objetivo es impedir que:

* Un instalador PostgreSQL modifique SQL Server.
* Un instalador SQL Server modifique PostgreSQL.
* Un actualizador PostgreSQL ejecute scripts SQL Server.
* Un actualizador SQL Server ejecute scripts PostgreSQL.
* Una generación accidental mezcle componentes.
* Una actualización de un motor altere el otro.

---

## 18. REGLA FINAL OBLIGATORIA E INTEGRACIÓN CON PROTECCIÓN DE CORRECCIONES

A partir de este momento:

### PostgreSQL

```text
GenerarSetup.bat
GenerarActualizador.bat
```

son EXCLUSIVOS de PostgreSQL.

### SQL Server

```text
GenerarSetupSqlServer.bat
GenerarActualizadorSqlServer.bat
```

son EXCLUSIVOS de SQL Server.

NO deben fusionarse.

NO deben convertirse en instaladores dinámicos.

NO deben compartir ejecución.

NO deben modificar archivos del otro motor.

NO deben conectarse al otro motor.

NO deben ejecutar scripts del otro motor.

La independencia debe mantenerse durante:

**GENERACIÓN → INSTALACIÓN → CONFIGURACIÓN → ACTUALIZACIÓN → EJECUCIÓN.**

**INTEGRACIÓN CON EL SKILL DE PERMANENCIA Y PROTECCIÓN DE CORRECCIONES (`correcciones-permanencia-proteccion`)**:
Cada instalador/actualizador debe tener sus propias pruebas de regresión y su propio historial de cambios protegido, asegurando que ninguna corrección en un motor impacte negativamente ni degrade las capacidades o archivos del otro motor.

Esta regla es PERMANENTE y DE CUMPLIMIENTO OBLIGATORIO.
