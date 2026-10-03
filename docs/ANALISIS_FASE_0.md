# FASE 0: ANÁLISIS INTEGRAL Y ARQUITECTURA DE REFERENCIA
## Proyecto: Korex Analytics (Referencia Técnica: AgenciasNew)

---

## 1. INTRODUCCIÓN Y ALCANCE

Este documento formaliza el análisis exhaustivo de **Fase 0** exigido por el *Prompt Maestro de Desarrollo de Korex Analytics*, evaluando la arquitectura técnica, seguridad, modelos de datos, flujos de ejecución y conectividad de **AgenciasNew** con el objetivo exclusivo de extraer, adaptar e independizar los módulos requeridos para la creación de **Korex Analytics**.

> [!IMPORTANT]
> **Principio Inviolable de Independencia**: Korex Analytics no comparte bases de datos, credenciales, variables `.env`, rutas de ejecución ni servicios con AgenciasNew. Todo componente analizado es adaptado de forma autónoma.

---

## 2. ANÁLISIS DE ARQUITECTURA (AGENCIASNEW VS KOREX ANALYTICS)

| Aspecto Técnico | AgenciasNew (Referencia) | Korex Analytics (Destino Autónomo) |
|---|---|---|
| **Framework Base** | Next.js 14+ (App Router), React 18, TypeScript | Next.js (App Router), React, TypeScript |
| **Estilos & UI** | Tailwind CSS (Azul primario `bg-blue-600`) | Tailwind CSS con Paleta Exclusiva (Azul petróleo, Turquesa, Tokens Centralizados) |
| **ORM / Acceso Datos** | Prisma ORM + Driver Nativo `mssql` / `pg` | Driver Nativo SQL Server (`mssql`) + Motor de Conexiones Dinámicas Aisladas |
| **Autenticación** | JWT en Cookie HTTP-Only / Bcrypt | JWT en Cookie HTTP-Only Segura / Bcrypt / Sesiones Expirables |
| **Modo de Operación** | Dual (Postgres / SQL Server) | Enfoque Centralizado en SQL Server Dinámico & Multi-Conexión |
| **Gestión de Ejecuciones** | Página monolítica en `dashboard/executions` | Módulo desacoplado de Ejecución, Monitoreo en Tiempo Real y Trazabilidad Transaccional |
| **Identidad Visual** | Comercial / Agencias de Viajes | Analítica / Inteligencia de Datos / Confiabilidad / Alta Densidad de Información |

---

## 3. ANÁLISIS DE SEGURIDAD

1. **Autenticación & Hashing**:
   - Algoritmo: `bcryptjs` con salt rounds de 10.
   - Manejo de Tokens: Tokens de restablecimiento con expiración temporal (`resetPasswordToken`, `resetPasswordExpires`).
   - Autenticación de Endpoints: Middleware y validación backend obligatoria de rol y permisos.
2. **Autorización basada en Roles (RBAC)**:
   - Tabla `Role` con campo `permissions` (JSON estructurado).
   - Verificación estricta en Backend: Queda prohibido depender únicamente de la visibilidad en UI.
3. **Protección contra Inyección SQL**:
   - Consultas parametrizadas obligatorias en el driver `mssql` (`req.input('param', type, value)`).
   - Validación previa contra `sys.parameters` para descartar parámetros inexistentes.
4. **Cifrado de Secretos**:
   - Cifrado AES-256-CBC para contraseñas de bases de datos almacenadas (`ENC(...)`).

---

## 4. ANÁLISIS DEL MÓDULO DE PARÁMETROS DE USUARIOS

En AgenciasNew, los parámetros operan en dos niveles:
1. **Parámetros Globales (`SystemParameter`)**: Claves como `ServidorSQLServer`, `BaseSQLServer`, `UsuarioSQLServer`, `ClaveSQLServer`, `EncriptarClaves`.
2. **Parámetros por Usuario**: Restricciones de sucursal, rol y permisos de edición.

### Evolución en Korex Analytics:
Korex Analytics introduce el modelo fuertemente tipado `UserParameter` y `ConnectionProfile`:
```text
USUARIO (User)
   │
   ▼
PERFIL / PARÁMETROS DE USUARIO (UserParameter)
   │
   ▼
PERFIL DE CONEXIÓN SQL (SQLConnectionProfile)
   │
   ▼
BASE DE DATOS DESTINO (Database)
   │
   ▼
EJECUCIÓN DE PROCESO (ExecutionRun)
```

---

## 5. ANÁLISIS DEL MÓDULO DE EJECUCIONES

El análisis de `src/app/api/executions/run/route.ts` y `ExecutionProcedure` revela:
- **Detección Dinámica de Metadatos**: Uso de `sys.parameters` de SQL Server para mapear `@paramName` y tipos de datos.
- **Soporte para Procedimientos Almacenados de Larga Duración**: Configuración de `maxDuration = 300` (5 minutos) y timeout de socket a 180,000 ms.
- **Presets de Ejecución**: Guardado de configuraciones de filtros, visibilidad de columnas (`ColumnConfig`) y totales seleccionados.

---

## 6. MATRIZ DE REUTILIZACIÓN Y ADAPTACIÓN

| Componente | Estado en AgenciasNew | Decisión | Justificación y Adaptación |
|---|---|---|---|
| **Motor de Autenticación** | Presente | **Se Adapta** | Se extrae la lógica de verificación y cifrado; se independiza la sesión y base de usuarios. |
| **Gestión de Roles y Permisos** | Presente | **Se Adapta** | Se adapta para roles analíticos (Admin, Auditor, Analista, Operador de Ejecución). |
| **Parámetros de Usuario** | Presente parcialmente | **Se Desarrolla Nuevo** | Se crea módulo unificado `UserParameter` vinculado a perfiles de conexión. |
| **Configuración SQL Server** | Presente (Mono-servidor) | **Se Desarrolla Nuevo** | Se amplía a **Multi-Configuración** (Servidores y Bases Dinámicas A/B). |
| **Motor de Ejecución de SPs** | Presente | **Se Adapta** | Se aísla el runner, se añade trazabilidad granular `TRC-XXXX` y control de transacciones. |
| **Identidad Visual** | Específica de Agencias | **Nuevo 100%** | Nueva paleta (Azul Petróleo / Turquesa), tokens centralizados y diseño analítico. |

---

## 7. CONCLUSIÓN DE FASE 0

Se valida la viabilidad total de la independencia de **Korex Analytics**. El proyecto arranca sobre cimientos técnicos robustos sin arrastrar código muerto ni dependencias operativas con AgenciasNew.
