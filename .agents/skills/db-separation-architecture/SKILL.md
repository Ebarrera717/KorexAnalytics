---
name: db-separation-architecture
description: Regla de arquitectura universal para la estricta separación entre la Base de Datos Principal de Korex (.env) y las Bases de Datos Externas de Exportación (Parámetros -> SQL Server / ZeusAgencias_23), garantizando trazabilidad centralizada en Korex y mínima intervención en bases externas protegidas.
---

# SKILL OBLIGATORIO – ARQUITECTURA Y SEPARACIÓN DE BASES DE DATOS

## 1. Regla Principal de Bases de Datos

El sistema debe diferenciar claramente entre la **base de datos principal de Korex** y las **bases de datos externas utilizadas para exportar o integrar información**.

Estas bases tienen propósitos diferentes y **no deben tratarse como una misma infraestructura**.

---

## 2. Base de Datos Principal de Korex

La base de datos principal de Korex es **únicamente la que se encuentra configurada en el archivo `.env`**, en la sección correspondiente a la conexión SQL del proyecto.

Esta base es la base operativa principal del sistema Korex. En esta base se realizan las operaciones propias de Korex, incluyendo:

* Creación y actualización de maestros.
* Generación de cotizaciones.
* Generación de facturas.
* Movimientos.
* Procesos internos.
* Validaciones.
* Configuraciones.
* Trazabilidad.
* Auditoría técnica.
* Registro de errores.
* Funciones internas.
* Procedimientos almacenados requeridos por Korex.
* Tablas y estructuras propias del sistema.

**La trazabilidad global del sistema debe registrarse exclusivamente en la base de datos principal de Korex configurada en el `.env`.**

La base activa de Korex será determinada exclusivamente por la configuración de conexión del proyecto.

---

## 3. Infraestructura Principal Soportada por Korex

Korex debe continuar siendo compatible con las dos infraestructuras principales del proyecto:
* PostgreSQL
* SQL Server

La base principal seleccionada para la ejecución de Korex será la configurada para el proyecto y será la encargada de almacenar la información propia del sistema.

Toda nueva funcionalidad deberá validar su compatibilidad con ambas infraestructuras cuando corresponda a la operación interna de Korex.

La trazabilidad, auditoría, errores y procesos internos deberán registrarse en la **base principal activa de Korex**, y nunca en una base externa utilizada únicamente para exportación o integración.

---

## 4. Bases de Datos Externas para Exportación

La base de datos configurada dentro de:
**Parámetros → SQL Server** (`BaseSQLServer`, `ServidorSQLServer`, `UsuarioSQLServer`, `ClaveSQLServer`, `PuertoSQLServer`)
tiene un propósito diferente.

Esta conexión se utiliza para **exportar o enviar información desde Korex hacia una base de datos externa**.

Entre los procesos que pueden utilizar esta conexión se encuentran:
* Exportación de cotizaciones.
* Exportación de facturas.
* Integraciones requeridas con sistemas externos.

Estas bases son independientes de la base principal de Korex.

```text
KOREX
│
├── Base principal Korex
│   └── Configurada en .env
│       ├── PostgreSQL o SQL Server
│       ├── Operación interna
│       ├── Maestros
│       ├── Cotizaciones
│       ├── Facturas
│       ├── Movimientos
│       ├── Trazabilidad
│       └── Errores
│
└── Base externa de exportación
    └── Configurada en Parámetros → SQL Server
        ├── Exportación de cotizaciones
        └── Exportación de facturas
```

Estas conexiones **no deben confundirse ni intercambiarse**.

---

## 5. Caso Específico: ZeusAgencias_23

En el caso actual, la base **ZeusAgencias_23** es una base de datos externa utilizada como destino de integración o recepción de información exportada desde Korex.

Esta base **NO es la base principal de Korex**.

Por lo tanto:
* No se deben crear tablas nuevas para funcionalidades propias de Korex.
* No se deben modificar tablas existentes.
* No se deben modificar estructuras existentes.
* No se deben modificar campos existentes.
* No se deben eliminar información.
* No se deben alterar datos ajenos al proceso de integración.
* No se deben implementar allí funcionalidades internas de Korex.
* No se deben almacenar trazas internas de Korex.
* No se deben almacenar logs generales de Korex.
* No se deben realizar cambios para adaptar `ZeusAgencias_23` al funcionamiento interno de Korex.

---

## 6. Única Excepción Permitida en ZeusAgencias_23

La base externa, en este caso **ZeusAgencias_23**, solamente podrá modificarse cuando sea estrictamente necesario para permitir la recepción o procesamiento de la información enviada por Korex.

Los cambios permitidos se limitan a:
* Creación o modificación de procedimientos almacenados estrictamente requeridos para recibir información (`spCotizacionesCrear`, `spFacturacionesCrear`, `spFacturaCrear`).
* Creación o modificación de funciones estrictamente requeridas para recibir información (`fnQuitarEspeciales`, `fnObtenerSiguienteConsecutivo`, `fnInterfaceExtractParamValue`).
* Ajustes mínimos y necesarios para soportar la integración.
* Otros cambios únicamente cuando sean indispensables para el proceso específico de recepción de datos.

Cualquier cambio deberá cumplir con el principio de **mínima intervención**:
> **No modificar ZeusAgencias_23, excepto lo estrictamente necesario para recibir y procesar la información enviada desde Korex.**

---

## 7. Prohibición Expresa

Está prohibido utilizar la conexión configurada en **Parámetros → SQL Server** para almacenar información interna de Korex.

Por ejemplo, está prohibido almacenar allí:
* Trazabilidad.
* Logs internos.
* Errores generales.
* Configuración de Korex.
* Auditoría.
* Sesiones.
* Información temporal propia de Korex.
* Información de diagnóstico.
* Procesos internos que no hagan parte directamente de la exportación.

La trazabilidad de una exportación hacia `ZeusAgencias_23` debe continuar almacenándose en la **base principal de Korex**, registrando que el proceso tuvo como destino una base externa.

```text
Base principal Korex
    ↓
Se genera factura
    ↓
Se inicia exportación
    ↓
Destino: ZeusAgencias_23
    ↓
Se ejecuta proceso de integración
    ↓
Resultado recibido
    ↓
TRAZA GUARDADA EN BASE PRINCIPAL KOREX
```

La traza indicará:
* Origen: `KOREX`
* Proceso: `EXPORTACION_FACTURA` / `EXPORTACION_COTIZACION`
* Destino: `ZEUSAGENCIAS_23`
* Resultado: `EXITOSO` / `ERROR`
* SP o función ejecutada en el proceso de integración
* Tiempo de ejecución
* Error técnico, si existe

Pero **la información de trazabilidad no deberá almacenarse en ZeusAgencias_23**.

---

### 8.1 Desacoplamiento Absoluto entre Carga/Importación Local y Exportación a Zeus ERP

- **Prohibición Absoluta de Exportación Automática no Solicitada**: Queda estrictamente PROHIBIDO ejecutar procedimientos de exportación a Zeus ERP (`spFacturacionesCrear`, `spCotizacionesCrear` en la base externa) de manera forzada o automática durante la simple importación masiva desde Excel o la creación/edición operativa en Korex.
- **Inmunidad de la Operación Local frente a Zeus ERP**: La importación desde Excel y la creación/edición operativa interna de Korex son **procesos 100% locales de Korex** (ejecutados en la base principal configurada en `.env`, como `Korex_pruebas` o `Korex_colaereo`). La carga local NUNCA debe fallar, rebotar ni interrumpirse por descalces de validaciones, parámetros, resoluciones o cuentas del ERP Zeus externo.
- **Disparo Exclusivo por Acción del Usuario o Flag Explícito**: El envío/exportación a la base externa protegida (`ZeusAgencias_23`) se ejecutará ÚNICAMENTE cuando:
  1. El usuario presione explícitamente el botón *"Enviar a Zeus ERP"* en la interfaz.
  2. El parámetro del sistema para sincronización automática (`EnviarFacturasAutoSQLserver` / `EnviarCotizacionesAutoSQLserver`) esté configurado explícitamente en `value = '1'`.

---

## 9. Checklist de Verificación Obligatorio para Todo Desarrollo

Antes de realizar cualquier modificación relacionada con bases de datos, identificar obligatoriamente:

1. **¿La operación corresponde al funcionamiento interno de Korex?**
   - **SÍ**: Utilizar exclusivamente la base principal de Korex configurada en el `.env`.

2. **¿La operación corresponde a la exportación o envío de información a un sistema externo?**
   - **SÍ**: Utilizar la conexión externa configurada en **Parámetros → SQL Server**, únicamente para el proceso de integración.

3. **¿Se requiere modificar la base externa?**
   - Validar: ¿El cambio es estrictamente necesario para recibir o procesar la información enviada desde Korex?
   - **NO**: **NO REALIZAR EL CAMBIO EN LA BASE EXTERNA.**

---

## 10. Regla Final de Arquitectura

- **`.env` = Base principal de Korex.**
- **`Parámetros → SQL Server` = Base externa exclusivamente para exportación e integración.**
- **`ZeusAgencias_23` = Base externa protegida, que no debe modificarse salvo lo estrictamente necesario para recibir y procesar los datos enviados desde Korex.**
- **Toda la trazabilidad, diagnóstico y control interno permanece en la base principal de Korex, nunca en la base externa de exportación.**
