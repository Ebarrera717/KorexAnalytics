---
name: execution-strategy-fallback
description: SKILL permanente de arquitectura y contingencia para la estrategia dual de ejecución y fallback de Korex (Windows Service + Task Scheduler + IIS Reverse Proxy) en PostgreSQL y SQL Server.
---

# SKILL OBLIGATORIO: ESTRATEGIA DE EJECUCIÓN Y FALLBACK PARA KOREX
## WINDOWS SERVICE + TASK SCHEDULER + IIS (POSTGRESQL + SQL SERVER)

---

## 1. OBJETIVO Y FILOSOFÍA

Korex debe contar con más de un mecanismo de ejecución para evitar que una política de seguridad, restricción de permisos o configuración corporativa de Windows impida poner el sistema en funcionamiento.

El instalador y actualizador deben detectar automáticamente si el mecanismo principal puede utilizarse. Si no puede utilizarse, debe existir una alternativa controlada y transparente.

---

## 2. ARQUITECTURA GENERAL Y MECANISMOS

```
                       ┌──────────────────────────────────────────────┐
                       │               ENTRADA EXTERNA                │
                       │         Internet / Red Local (HTTP:3000)     │
                       │               IIS + ARR + Rewrite            │
                       └──────────────────────┬───────────────────────┘
                                              │ (Reverse Proxy)
                                              ▼
                                   ┌──────────────────────┐
                                   │   Node.js / Korex    │
                                   │   (localhost:3001)   │
                                   └──────────┬───────────┘
                                              │
                       ┌──────────────────────┴───────────────────────┐
                       │        MECANISMO DE CONTROL DE PROCESO       │
                       ├──────────────────────────────┬───────────────┤
                       │     OPCIÓN A (PRINCIPAL)     │   OPCIÓN B    │
                       │        Windows Service       │ (FALLBACK)    │
                       │   (Korex_NextJS / SCM)       │Task Scheduler │
                       │                              │   (ONSTART)   │
                       └──────────────────────────────┴───────────────┘
                                              │
                                ┌─────────────┴─────────────┐
                                ▼                           ▼
                        [ PostgreSQL ]               [ SQL Server ]
                     (Instalador PG Puro)        (Instalador SQL Puro)
```

---

## 3. LOS 2 MECANISMOS DE EJECUCIÓN

| Nivel | Mecanismo | Identificador | Configuración |
| :--- | :--- | :--- | :--- |
| **Opción Principal (A)** | **Windows Service** | `Korex_NextJS` (PG) / `Korex_SQLServer_Service` (SQL) | Ejecutable daemon (`node-windows`/winsw) registrado en Windows SCM, corriendo bajo `Sistema local` o cuenta de servicio. |
| **Opción Alternativa (B)** | **Windows Task Scheduler** | `Korex NextJS - Startup` (PG) / `Korex SQLServer - Startup` (SQL) | Tarea programada en Windows con trigger `ONSTART` (al arrancar el sistema), ejecución con privilegios más altos (`/rl highest`), ejecutando `node.exe server.js` en modo Standalone. |

---

## 4. REGLA OBLIGATORIA DE NO DEPENDER EXCLUSIVAMENTE DEL SERVICIO

Si el Servicio de Windows:
- No se puede crear (error de permisos o política GPO corporativa).
- No se puede activar o iniciar.
- Se cierra inmediatamente tras arrancar (`daemon/*.err.log`).
- Es bloqueado por políticas de control de servicios.

**EL INSTALADOR NO DEBE CONSIDERAR QUE KOREX NO PUEDE INSTALARSE.**
Debe registrar la causa técnica detallada del fallo del servicio y pasar de forma transparente al mecanismo alternativo (**Windows Task Scheduler**).

---

## 5. FLUJO DE INSTALACIÓN Y CONTINGENCIA

```
[ INICIO ]
    │
    ▼
[ Validar Entorno Windows, Node.js y Korex ]
    │
    ▼
[ Intentar MECANISMO PRINCIPAL: Windows Service ]
    │
    ├─── ¿Arrancó y Puerto 3001 Responde? ───> [ SÍ ] ──> [ Marcar WINDOWS_SERVICE en .env ] ──> [ Validar IIS y Finalizar ]
    │
    └─── [ NO ]
            │
            ▼
    [ Registrar Causa y Error de Windows en install_log.txt ]
            │
            ▼
    [ Intentar MECANISMO ALTERNATIVO: Task Scheduler ]
            │
            ├─── ¿Tarea Creada y Puerto 3001 Responde? ───> [ SÍ ] ──> [ Marcar TASK_SCHEDULER en .env ] ──> [ Validar IIS y Finalizar ]
            │
            └─── [ NO ]
                    │
                    ▼
            [ MODO TERCERA ALTERNATIVA: DIAGNÓSTICO DE BLOQUEO TOTAL ]
            [ Emitir Evidencia Técnica y Guía de Permisos para el Administrador de IT ]
```

---

## 6. TELEMETRÍA Y NO OCULTAR EL ERROR DEL SERVICIO

Si Windows Service no puede utilizarse, el instalador DEBE registrar exactamente en los logs (`install_log.txt` / `install_sqlserver_log.txt`):
```text
Mecanismo principal: Windows Service
Resultado: NO DISPONIBLE
Motivo: [Detalle exacto de daemon/*.err.log o Windows SCM]
Código de error: [Código de salida o excepción]
Mecanismo alternativo: Task Scheduler
Resultado: ACTIVADO Y OPERATIVO (Puerto 3001 escuchando, PID: XXXX)
```
Queda estrictamente prohibido mostrar errores genéricos como *"Error instalando servicio"*.

---

## 7. CRITERIOS TÉCNICOS DE CONFIGURACIÓN

1. **Servidor de Producción Real**: El mecanismo alternativo DEBE ejecutar Next.js en modo Standalone (`node.exe server.js`), NUNCA `npm run dev` ni `next dev`.
2. **Variables de Entorno Unificadas**: El Task Scheduler comparte exactamente las mismas variables del `.env` (`PORT`, `HOSTNAME=127.0.0.1`, `DATABASE_URL`, `NEXTAUTH_SECRET`, etc.).
3. **Aislamiento Absoluto de Motores**: 
   - Instalador PostgreSQL solo registra tareas y servicios de PostgreSQL.
   - Instalador SQL Server solo registra tareas y servicios de SQL Server.
4. **IIS Reverse Proxy Desacoplado**: IIS + ARR + URL Rewrite atiende en el puerto `3000` y redirige a `http://127.0.0.1:3001/` independientemente de si el backend corre como Servicio o como Tarea Programada.
5. **Criterio Integral de Éxito**: No basta con que la tarea exista; se debe comprobar:
   `Tarea registrada ➔ Tarea iniciada ➔ Proceso Node activo ➔ Puerto 3001 escuchando ➔ HTTP 200 respondiendo ➔ IIS conectando ➔ Base de datos accesible`.

---

## 8. PRESERVACIÓN ESTRICTA EN LOS ACTUALIZADORES

- Los scripts actualizadores (`GenerarActualizador.bat` / `Update_Korex.ps1` y `GenerarActualizadorSqlServer.bat` / `Update_Korex_SQLServer.ps1`) **DEBEN detectar primero el mecanismo activo** (`EXECUTION_MECHANISM` en `.env` o inspección de SCM / Task Scheduler).
- **Regla de No Conversión Innecesaria**: Si el cliente ya opera satisfactoriamente bajo `TASK_SCHEDULER`, la actualización NO debe intentar forzarlo de vuelta a `WINDOWS_SERVICE`. Debe actualizar los binarios y reiniciar la tarea programada existente.

---

## 9. PROHIBICIÓN DE EVADIR POLÍTICAS DE SEGURIDAD

Si tanto el Servicio de Windows como el Task Scheduler están bloqueados por políticas de seguridad corporativas del cliente:
- **QUEDA ESTRICTAMENTE PROHIBIDO** intentar desactivar Windows Defender, alterar el Firewall, desactivar antivirus o crear procesos ocultos para evadir controles.
- Se debe detener el proceso de forma controlada y entregar el informe HTML de diagnóstico con la justificación técnica de permisos para el oficial de seguridad/IT.

---

## 10. COMANDOS Y HERRAMIENTAS DE GESTIÓN

- **Administración de Task Scheduler**:
  ```powershell
  powershell -ExecutionPolicy Bypass -File deploy\task_scheduler_manager.ps1 -Action Register -Engine POSTGRESQL -Port 3001
  powershell -ExecutionPolicy Bypass -File deploy\task_scheduler_manager.ps1 -Action Start -Engine POSTGRESQL -Port 3001
  powershell -ExecutionPolicy Bypass -File deploy\task_scheduler_manager.ps1 -Action Status -Engine POSTGRESQL -Port 3001
  ```
- **Diagnóstico y Autoreparación**:
  ```powershell
  powershell -ExecutionPolicy Bypass -File deploy\Korex_Diagnostics_Engine.ps1 -Engine POSTGRESQL -Mode Reparacion
  ```
- **Suite de Validación**:
  ```bash
  node scripts/validate_execution_strategy_suite.js
  ```
