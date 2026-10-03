# PROMPT MAESTRO DE DESARROLLO - KOREX ANALYTICS

---

## 1. IDENTIFICACIÓN DEL PROYECTO

**Nombre oficial del proyecto:** Korex Analytics  
**Proyecto de referencia:** AgenciasNew  

Korex Analytics será un proyecto nuevo, independiente y autónomo, construido tomando como referencia técnica, arquitectónica y funcional determinados componentes existentes y probados en AgenciasNew.

AgenciasNew será únicamente una **referencia técnica y funcional**.  
Korex Analytics NO debe convertirse en una copia completa de AgenciasNew ni depender de él.

---

## 2. OBJETIVO GENERAL

Crear **Korex Analytics** reutilizando y adaptando las capacidades necesarias de AgenciasNew para disponer de:

1. Seguridad y autenticación.
2. Manejo de usuarios.
3. Roles y permisos.
4. Módulo completo de Parámetros de Usuarios.
5. Lógica completa de Parámetros de Usuarios.
6. Configuración de SQL Server.
7. Conexión a SQL Server.
8. Selección/identificación de la base de datos sobre la cual se realizará una ejecución.
9. Módulo de Ejecuciones.
10. Lógica completa del módulo de Ejecuciones.
11. Trazabilidad.
12. Manejo de errores.
13. Auditoría.
14. Pruebas automatizadas.
15. Control de regresiones.
16. Buenas prácticas y SKILLS de programación.
17. Identidad visual propia y diferente de AgenciasNew.

El resultado debe ser un sistema independiente, seguro, mantenible, escalable y preparado para futuras funcionalidades de análisis.

---

## 3. REGLA FUNDAMENTAL DE INDEPENDENCIA

Korex Analytics NO debe modificar ni depender operativamente de AgenciasNew.

Está prohibido utilizar directamente desde Korex Analytics:
* Base de datos de AgenciasNew.
* Tablas de AgenciasNew.
* Stored Procedures de AgenciasNew.
* Functions de AgenciasNew.
* Views de AgenciasNew.
* `.env` de AgenciasNew.
* Credenciales de AgenciasNew.
* Configuraciones de AgenciasNew.
* Rutas de instalación de AgenciasNew.
* Archivos productivos de AgenciasNew.
* Servicios productivos de AgenciasNew.

Cuando una funcionalidad de AgenciasNew sea necesaria, debe:
1. Analizarse.
2. Documentarse.
3. Adaptarse.
4. Implementarse dentro de Korex Analytics.
5. Validarse independientemente.

**Nunca copiar código de forma ciega.**

---

## 4. FASE 0 – ANÁLISIS OBLIGATORIO

Antes de desarrollar cualquier funcionalidad realizar una **FASE 0**.  
No comenzar directamente a programar.

Analizar AgenciasNew y documentar:

### 4.1 Arquitectura
Identificar:
* Framework.
* Lenguaje.
* Frontend.
* Backend.
* APIs.
* Servicios.
* Middleware.
* Estructura de carpetas.
* Dependencias.
* Configuración.
* Manejo de errores.
* Logging.
* Autenticación.
* Autorización.
* Base de datos.
* Scripts SQL.
* Proceso de compilación.
* Proceso de ejecución.
* Proceso de instalación.
* Proceso de actualización.

### 4.2 Seguridad
Analizar:
* Login.
* Autenticación.
* Autorización.
* Usuarios.
* Roles.
* Permisos.
* Sesiones.
* Cookies.
* Tokens.
* Protección de endpoints.
* Validaciones.
* Manejo de credenciales.
* Auditoría.

### 4.3 Parámetros de Usuarios
Analizar completamente:
* Pantallas.
* Tablas.
* Stored Procedures.
* Functions.
* APIs.
* Relaciones.
* Permisos.
* Valores.
* Validaciones.
* Lectura.
* Creación.
* Actualización.
* Eliminación.
* Aplicación de parámetros.
* Relación entre usuario y parámetros.
* Utilización de parámetros dentro de procesos.

No trasladar solamente la interfaz. Debe trasladarse la lógica funcional necesaria.

### 4.4 SQL Server
Analizar:
* Servidor.
* Instancia.
* Puerto.
* Base de datos.
* Usuario.
* Autenticación.
* Contraseña.
* Cifrado.
* Opciones de conexión.
* Prueba de conexión.
* Almacenamiento de configuración.
* Selección de configuración.
* Validación.
* Manejo de errores.

### 4.5 Ejecuciones
Analizar:
* Creación.
* Usuario.
* Parámetros.
* Configuración SQL.
* Base de datos destino.
* Inicio.
* Proceso.
* Estado.
* Finalización.
* Resultado.
* Error.
* Historial.
* Duración.
* Trazabilidad.
* Reintentos, si existen.

Al finalizar Fase 0 crear: `ANALISIS_FASE_0.md`.

---

## 5. MATRIZ DE REUTILIZACIÓN

Crear una matriz que indique para cada componente:

| Componente | Existe en AgenciasNew | Se reutiliza | Se adapta | Se desarrolla nuevo | Dependencia final |
|---|---|---|---|---|---|
| Seguridad | Sí/No | | | | Independiente |
| Usuarios | Sí/No | | | | Independiente |
| Parámetros Usuarios | Sí/No | | | | Independiente |
| SQL Server | Sí/No | | | | Independiente |
| Ejecuciones | Sí/No | | | | Independiente |

La matriz debe impedir que se copien funcionalidades innecesarias.

---

## 6. SEGURIDAD

La seguridad debe diseñarse desde el inicio.

Implementar como mínimo:
* Autenticación.
* Autorización.
* Usuarios.
* Roles.
* Permisos.
* Control de sesiones.
* Expiración de sesiones.
* Logout seguro.
* Protección de cookies.
* Protección de endpoints.
* Validación de entradas.
* Consultas parametrizadas.
* Protección contra SQL Injection.
* Mínimo privilegio.
* Manejo seguro de errores.
* Auditoría.
* Logging seguro.

La autorización debe validarse en backend. Ocultar un botón en frontend NO constituye una medida de seguridad suficiente.

---

## 7. USUARIOS

Korex Analytics debe contar con su propio sistema de usuarios.

Debe soportar, de acuerdo con la implementación de AgenciasNew:
* creación;
* modificación;
* activación;
* desactivación;
* autenticación;
* roles;
* permisos;
* parámetros;
* auditoría.

Los usuarios de Korex Analytics deben ser independientes de los usuarios de AgenciasNew.

---

## 8. MÓDULO DE PARÁMETROS DE USUARIOS

Debe trasladarse el **módulo completo y la lógica completa** de Parámetros de Usuarios de AgenciasNew.

Debe incluir, según corresponda:
* creación;
* consulta;
* actualización;
* eliminación;
* asignación;
* validación;
* valores predeterminados;
* lectura;
* aplicación dentro de procesos.

La arquitectura debe mantener la relación:
```text
USUARIO
   ↓
PARÁMETROS DE USUARIO
   ↓
PROCESO
```
Los parámetros deben poder ser utilizados por el módulo de Ejecuciones cuando corresponda.

---

## 9. CONFIGURACIÓN SQL SERVER

Korex Analytics debe incorporar el módulo de configuración SQL Server de AgenciasNew.

Debe permitir gestionar, según corresponda:
* servidor;
* instancia;
* puerto;
* base de datos;
* usuario;
* autenticación;
* contraseña;
* cifrado;
* opciones de conexión;
* prueba de conexión;
* estado.

Las credenciales deben protegerse.  
Nunca:
* hardcodear contraseñas;
* registrar contraseñas en logs;
* incluir secretos en el repositorio;
* copiar credenciales de AgenciasNew.

---

## 10. REGLA CRÍTICA DE CONEXIÓN

La Ejecución debe conectarse a la **base de datos SQL Server correspondiente a la configuración seleccionada**.  
No debe existir una base fija o hardcodeada.

La arquitectura será conceptualmente:
```text
USUARIO
   ↓
PARÁMETROS DE USUARIO
   ↓
CONFIGURACIÓN SQL SERVER
   ↓
SERVIDOR / INSTANCIA
   ↓
BASE DE DATOS
   ↓
VALIDACIÓN DE CONEXIÓN
   ↓
EJECUCIÓN
   ↓
PROCESO
   ↓
RESULTADO
```

Antes de ejecutar debe determinarse:
1. Usuario.
2. Parámetros.
3. Configuración SQL.
4. Servidor.
5. Instancia.
6. Puerto.
7. Base de datos.
8. Credenciales.
9. Conexión.
10. Permisos.
11. Proceso.

Solamente después de validar todo se permite ejecutar.

---

## 11. PROHIBICIÓN DE CONEXIONES HARDCODEADAS

Está prohibido colocar en el código:
```text
Servidor = "SERVIDOR_PRUEBAS"
BaseDatos = "Korex_pruebas"
Usuario = "sa"
```
La información debe obtenerse de la configuración correspondiente.  
Crear una validación automática para detectar conexiones hardcodeadas.

---

## 12. MÚLTIPLES CONFIGURACIONES SQL SERVER

Korex Analytics debe estar preparado para manejar más de una configuración SQL Server cuando la arquitectura lo requiera.

Ejemplo:
```text
CONFIGURACIÓN A
Servidor: SQL01
Base: CLIENTE_A

CONFIGURACIÓN B
Servidor: SQL02
Base: CLIENTE_B
```

Una ejecución asociada a A nunca debe terminar accidentalmente en B.  
Debe existir validación de correspondencia:
```text
EJECUCIÓN
   ↓
CONFIGURACIÓN SQL
   ↓
BASE DESTINO
```

---

## 13. MÓDULO DE EJECUCIONES

Trasladar el módulo de Ejecuciones de AgenciasNew y toda la lógica necesaria.

Debe permitir:
* crear ejecución;
* identificar usuario;
* cargar parámetros;
* seleccionar configuración SQL;
* determinar base destino;
* validar conexión;
* validar permisos;
* ejecutar proceso;
* registrar inicio;
* registrar finalización;
* registrar resultado;
* registrar errores;
* consultar historial;
* mantener trazabilidad.

Los estados deben analizarse durante Fase 0.  
Como referencia:
```text
PENDIENTE
EN_EJECUCION
FINALIZADA
ERROR
CANCELADA
```
No asumir que estos son exactamente los estados de AgenciasNew.

---

## 14. TRAZABILIDAD

Cada ejecución debe permitir determinar:
* Usuario.
* Fecha.
* Hora.
* Proceso.
* Configuración SQL utilizada.
* Servidor.
* Base de datos.
* Estado.
* Duración.
* Resultado.
* Error.

Nunca almacenar: contraseña, token, secreto ni credencial completa.

La información debe ser suficiente para responder:
> **¿Quién ejecutó qué proceso, cuándo y contra qué base de datos?**

---

## 15. VALIDACIÓN ANTES DE EJECUTAR

Toda ejecución debe seguir:
```text
IDENTIFICAR USUARIO
        ↓
CARGAR PARÁMETROS
        ↓
IDENTIFICAR CONFIGURACIÓN SQL
        ↓
IDENTIFICAR BASE DESTINO
        ↓
VALIDAR CONEXIÓN
        ↓
VALIDAR PERMISOS
        ↓
INICIAR EJECUCIÓN
        ↓
REGISTRAR RESULTADO
```

Si falla la conexión:
* NO ejecutar;
* registrar el error;
* marcar ejecución como ERROR;
* informar el problema de manera segura.

---

## 16. VALIDACIÓN DE AISLAMIENTO DE BASES

Crear pruebas que demuestren:
```text
CONFIGURACIÓN A  ──►  BASE A  ──►  EJECUCIÓN A
CONFIGURACIÓN B  ──►  BASE B  ──►  EJECUCIÓN B
```
Y demostrar que:
```text
CONFIGURACIÓN A  ──X──►  BASE B
```
no puede ocurrir accidentalmente.

---

## 17. BASE DE DATOS DE KOREX ANALYTICS

Korex Analytics tendrá su propia base de datos.  
Debe contener únicamente los objetos necesarios para:
* usuarios;
* roles;
* permisos;
* parámetros;
* configuración SQL Server;
* Ejecuciones;
* auditoría;
* configuración propia.

No utilizar directamente tablas de AgenciasNew.

---

## 18. TRANSACCIONES

Toda operación que modifique múltiples elementos relacionados debe analizar si requiere transacción.  
Cuando corresponda:
```text
BEGIN TRANSACTION
       ↓
VALIDACIONES
       ↓
OPERACIONES
       ↓
VALIDACIÓN FINAL
       ↓
COMMIT
```
En caso de error:
```text
ROLLBACK
   ↓
REGISTRO DEL ERROR
   ↓
EJECUCIÓN = ERROR
```
Evitar estados parciales inconsistentes.

---

## 19. MANEJO DE ERRORES

Implementar manejo centralizado de errores.  
Un error nunca debe provocar silenciosamente:
* operación incompleta;
* ejecución marcada como exitosa;
* datos parcialmente modificados.

Registrar:
* proceso;
* ejecución;
* fecha/hora;
* contexto técnico seguro;
* mensaje técnico en logs.

No mostrar información sensible al usuario.

---

## 20. ALCANCE REAL DE CADA CORRECCIÓN

Antes de implementar cualquier corrección determinar obligatoriamente:
* **A. Solo base de datos**: cuando la causa requiera únicamente tabla, SP, Function, View, índice, constraint u otro objeto SQL.
* **B. Solo sitio/aplicación**: cuando la causa requiera únicamente frontend, backend, API, componente o configuración.
* **C. Base de datos + aplicación**: cuando la causa raíz requiera ambos.

No realizar modificaciones fuera del alcance determinado.

---

## 21. CONTROL DE REGRESIONES

Toda corrección debe quedar protegida mediante pruebas.  
Especialmente:
* usuarios;
* parámetros;
* permisos;
* configuración SQL;
* conexión;
* selección de base;
* Ejecuciones;
* SPs;
* APIs.

Una corrección no se considera terminada si existe posibilidad razonable de que desaparezca durante una actualización posterior.

---

## 22. SKILLS OBLIGATORIOS DE PROGRAMACIÓN

Korex Analytics debe aplicar permanentemente todas las SKILLS de desarrollo definidas para el proyecto:

### Arquitectura
* separación de responsabilidades;
* SOLID;
* DRY;
* bajo acoplamiento;
* alta cohesión;
* modularidad.

### Seguridad
* mínimo privilegio;
* secretos fuera del código;
* validación de entradas;
* SQL parametrizado;
* autenticación;
* autorización.

### Base de datos
* integridad;
* PK;
* FK;
* índices;
* constraints;
* transacciones;
* versionamiento;
* migraciones controladas.

### Código
* nombres claros;
* funciones pequeñas;
* evitar duplicación;
* evitar código muerto;
* manejo correcto de excepciones;
* documentación.

### Calidad
* pruebas unitarias;
* pruebas de integración;
* pruebas de regresión;
* validaciones automáticas;
* revisión de performance.

### Operación
* logs;
* trazabilidad;
* diagnóstico;
* configuración;
* documentación;
* control de cambios.

---

## 23. PRUEBAS AUTOMATIZADAS

Crear pruebas para:

### Usuarios
* login correcto;
* login incorrecto;
* permisos;
* roles;
* parámetros;
* actualización.

### SQL Server
* conexión correcta;
* servidor incorrecto;
* instancia incorrecta;
* base incorrecta;
* credenciales incorrectas;
* timeout;
* pérdida de conexión.

### Ejecuciones
* ejecución correcta;
* ejecución contra Base A;
* ejecución contra Base B;
* validación de configuración;
* error de conexión;
* error SQL;
* rollback;
* trazabilidad;
* historial.

### Seguridad
* usuario sin permiso;
* acceso directo no autorizado;
* modificación indebida de parámetros;
* intento de ejecutar otra configuración;
* intento de ejecutar contra una base no autorizada.

---

## 24. CONTROL DE DEPENDENCIAS

Antes de agregar una dependencia:
* verificar si ya existe solución interna;
* revisar seguridad;
* revisar mantenimiento;
* revisar licencia;
* revisar compatibilidad;
* analizar vulnerabilidades.

No agregar dependencias innecesarias.

---

## 25. CONFIGURACIÓN Y .ENV

Korex Analytics tendrá su propio `.env`.

Reglas:
* Nunca copiar `.env` desde AgenciasNew.
* Nunca copiar credenciales desde entornos de prueba.
* Nunca incluir secretos en el código.
* Crear `.env.example`.
* Documentar variables requeridas.
* No incluir `.env` en el repositorio.
* Validar variables obligatorias al iniciar.

---

## 26. IDENTIDAD VISUAL DE KOREX ANALYTICS

Korex Analytics debe tener una identidad visual **claramente diferente de AgenciasNew**.

No copiar automáticamente: colores, temas, fondos, botones, tarjetas, iconografía, encabezados, menús, tablas, formularios ni tipografías.

La lógica puede reutilizarse, pero la presentación visual debe ser propia.

---

## 27. PALETA VISUAL

Definir una paleta propia orientada a: tecnología, análisis, información, confiabilidad, modernidad y profesionalismo.

Como propuesta inicial:
* **Azul petróleo / azul oscuro**: elementos principales y navegación.
* **Turquesa**: acciones e interacción.
* **Gris claro**: fondos secundarios.
* **Blanco**: superficies y tarjetas.
* **Azul medio**: información.
* **Verde**: éxito.
* **Ámbar/naranja**: advertencia.
* **Rojo**: errores y acciones destructivas.

La paleta definitiva debe documentarse.

---

## 28. VARIABLES DE DISEÑO

No colocar colores directamente en cada componente.  
Crear tokens centralizados:
```text
--primary
--secondary
--background
--surface
--text
--success
--warning
--error
--info
--border
```
Esto permitirá modificar el tema desde un único lugar.

---

## 29. DASHBOARD

El Dashboard debe estar orientado al análisis y seguimiento de ejecuciones.  
Mostrar, cuando corresponda:
* ejecuciones recientes;
* ejecuciones en proceso;
* ejecuciones exitosas;
* ejecuciones con error;
* duración;
* usuario;
* servidor;
* base de datos;
* indicadores de actividad.

Debe tener una presentación visual propia de Korex Analytics.

---

## 30. ESTADOS DE EJECUCIÓN

Los estados deben diferenciarse visualmente mediante:
* color;
* texto;
* icono;
* tooltip cuando corresponda.

Ejemplo:
```text
PENDIENTE
EN EJECUCIÓN
FINALIZADA
ERROR
CANCELADA
```
No utilizar únicamente colores para comunicar estados.

---

## 31. RESPONSIVE Y ACCESIBILIDAD

El diseño debe funcionar correctamente en: escritorio, portátil, tablet y diferentes resoluciones.

Validar: contraste, legibilidad, foco, teclado, tamaños, mensajes y estados visuales.

---

## 32. DOCUMENTACIÓN

Crear:
```text
/docs
   ├── ANALISIS_FASE_0.md
   ├── ARQUITECTURA.md
   ├── SEGURIDAD.md
   ├── USUARIOS.md
   ├── PARAMETROS_USUARIOS.md
   ├── SQL_SERVER.md
   ├── EJECUCIONES.md
   ├── BASE_DATOS.md
   ├── PRUEBAS.md
   ├── CAMBIOS.md
   └── INSTALACION.md
```

---

## 33. CONTROL DE CAMBIOS

Cada cambio debe registrar: fecha, motivo, causa raíz, alcance, archivos modificados, objetos SQL modificados, impacto, pruebas, resultado, riesgos y reversión cuando corresponda.

---

## 34. REGLA DE NO DESTRUCCIÓN

Está prohibido ejecutar automáticamente operaciones destructivas como:
```text
DROP DATABASE
DROP TABLE
TRUNCATE
DELETE masivo
DROP PROCEDURE
DROP FUNCTION
DROP VIEW
DROP SCHEMA
```
sin:
1. identificar motivo;
2. analizar impacto;
3. autorización cuando corresponda;
4. backup cuando aplique;
5. mecanismo de reversión.

Especialmente está prohibido afectar AgenciasNew.

---

## 35. PERFORMANCE

Desde el inicio analizar: consultas SQL, índices, conexiones, pool, tiempos de respuesta, operaciones repetitivas, consultas N+1, bloqueos y transacciones largas.

No realizar optimizaciones que cambien el comportamiento funcional sin validación.

---

## 36. VALIDACIÓN DE AISLAMIENTO DE AGENCIASNEW

Crear validaciones automáticas que detecten referencias accidentales a AgenciasNew en:
* código;
* `.env`;
* SQL;
* configuración;
* rutas;
* instaladores;
* dependencias;
* conexiones.

La única referencia permitida será documental/técnica.

---

## 37. CRITERIO DE TERMINACIÓN

Una funcionalidad NO se considera terminada solamente porque funciona manualmente.  
Debe cumplir:
```text
CAUSA RAÍZ
    ↓
ALCANCE
    ↓
DESARROLLO
    ↓
VALIDACIÓN CÓDIGO
    ↓
VALIDACIÓN SQL
    ↓
PRUEBAS
    ↓
SEGURIDAD
    ↓
REGRESIÓN
    ↓
TRAZABILIDAD
    ↓
DOCUMENTACIÓN
```

---

## 38. ENTREGABLES DE FASE 0

Antes de iniciar el desarrollo funcional entregar:
1. `ANALISIS_FASE_0.md`
2. `ARQUITECTURA.md`
3. `SEGURIDAD.md`
4. `USUARIOS.md`
5. `PARAMETROS_USUARIOS.md`
6. `SQL_SERVER.md`
7. `EJECUCIONES.md`
8. `BASE_DATOS.md`
9. `PRUEBAS.md`
10. `MATRIZ_DEPENDENCIAS.md`
11. `MATRIZ_RIESGOS.md`
12. Definición de identidad visual.

---

## 39. CRITERIO FINAL DE ACEPTACIÓN

Korex Analytics se considera correctamente construido cuando:
* Tiene seguridad independiente.
* Tiene usuarios independientes.
* Tiene roles y permisos.
* Tiene Parámetros de Usuarios.
* Tiene la lógica de Parámetros de Usuarios.
* Tiene configuración SQL Server.
* Puede conectarse a SQL Server.
* Puede trabajar con la base de datos configurada.
* Tiene módulo de Ejecuciones.
* Cada ejecución utiliza la configuración SQL correspondiente.
* Puede identificar contra qué base se ejecutó.
* No tiene conexiones hardcodeadas.
* Tiene trazabilidad.
* Tiene manejo de errores.
* Tiene pruebas automatizadas.
* Tiene control de regresiones.
* Tiene documentación.
* Tiene identidad visual propia.
* No depende de AgenciasNew.
* No afecta AgenciasNew.

---

## 40. ARQUITECTURA FUNCIONAL FINAL

La relación principal de Korex Analytics debe ser:

```text
                         KOREX ANALYTICS
                                │
        ┌───────────────────────┼────────────────────────┐
        │                       │                        │
        ↓                       ↓                        ↓
    SEGURIDAD               USUARIOS                EJECUCIONES
                                │                        │
                                ↓                        │
                       PARÁMETROS USUARIO                │
                                │                        │
                                └──────────┬─────────────┘
                                           ↓
                                  CONFIGURACIÓN
                                   SQL SERVER
                                           ↓
                                  BASE DE DATOS
                                     DESTINO
                                           ↓
                                      PROCESO
                                           ↓
                                  RESULTADO / ERROR
                                           ↓
                                     TRAZABILIDAD
```

---

## 41. REGLA FINAL DEL PROYECTO

El objetivo de este desarrollo es crear:

> **Korex Analytics: una plataforma independiente para gestionar usuarios, parámetros, conexiones SQL Server y ejecuciones sobre bases de datos SQL Server configurables, con seguridad, trazabilidad, control de errores, pruebas y una identidad visual propia.**

AgenciasNew será exclusivamente la referencia para reutilizar las funcionalidades que ya han sido validadas.

**Nunca se debe sacrificar la independencia de Korex Analytics por reutilizar código de AgenciasNew.**

La prioridad será:

**Seguridad → Independencia → Integridad → Trazabilidad → Calidad → Mantenibilidad → Performance → Experiencia de usuario.**
