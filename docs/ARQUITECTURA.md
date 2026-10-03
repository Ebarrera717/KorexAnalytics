# ARQUITECTURA TÉCNICA - KOREX ANALYTICS

---

## 1. VISIÓN GENERAL

**Korex Analytics** está estructurado como una plataforma web modular, autónoma y desacoplada, orientada a la administración de usuarios, parametrización operativa, configuración multi-instancia de SQL Server y ejecución controlada de procedimientos analíticos con trazabilidad total.

---

## 2. DIAGRAMA DE ARQUITECTURA DEL SISTEMA

```mermaid
flowchart TD
    subgraph Frontend["Frontend (Next.js App Router)"]
        UI_Login["Portal Login"]
        UI_Dashboard["Dashboard Analítico"]
        UI_Exec["Módulo de Ejecuciones"]
        UI_Params["Parámetros de Usuario"]
        UI_SQL["Configuraciones SQL Server"]
        UI_History["Historial & Trazabilidad"]
    end

    subgraph CoreBackend["Backend & API Layer (Node.js / Next.js API Routes)"]
        AuthMiddleware["Auth & RBAC Middleware"]
        ExecEngine["Execution Engine & Runner"]
        ConnManager["SQL Server Dynamic Pool Manager"]
        AuditLogger["Audit & Traceability Service"]
        ParamResolver["User Parameter Resolver"]
    end

    subgraph InternalStorage["Base de Datos Interna Korex Analytics"]
        KAX_DB[("Korex_Analytics DB")]
        T_Users["Usuarios & Roles"]
        T_Params["Parámetros de Usuario"]
        T_Profiles["Perfiles de Conexión SQL"]
        T_ExecHistory["Historial & Logs de Ejecución"]
        T_Procedures["Catálogo de Procedimientos & Presets"]
    end

    subgraph TargetDatabases["Bases de Datos Destino (SQL Server)"]
        SQL_ServerA[("Servidor A / Base Cliente 1")]
        SQL_ServerB[("Servidor B / Base Cliente 2")]
        SQL_ServerN[("Servidor N / Data Warehouse")]
    end

    UI_Login --> AuthMiddleware
    UI_Dashboard --> CoreBackend
    UI_Exec --> ExecEngine
    UI_Params --> ParamResolver
    UI_SQL --> ConnManager
    UI_History --> AuditLogger

    AuthMiddleware --> KAX_DB
    ParamResolver --> KAX_DB
    AuditLogger --> KAX_DB

    ExecEngine --> ParamResolver
    ExecEngine --> ConnManager
    ConnManager --> SQL_ServerA
    ConnManager --> SQL_ServerB
    ConnManager --> SQL_ServerN

    ExecEngine --> AuditLogger
```

---

## 3. CAPAS DEL SISTEMA

### 3.1 Capa de Presentación (Frontend)
- **Tecnología**: Next.js (React 18/19), TypeScript, Tailwind CSS.
- **Identidad**: Tema centralizado basado en variables CSS (`--primary`, `--secondary`, etc.) con paleta de Azul Petróleo y Turquesa.
- **Componentes**: Renderizado responsivo, formularios validados, modales dinámicos y tablas con ordenamiento/filtrado avanzado.

### 3.2 Capa de Negocio y APIs (Backend)
- **API Routes**: Endpoints REST parametrizados bajo `/api/auth`, `/api/users`, `/api/parameters`, `/api/sqlserver`, `/api/executions`.
- **Validador de Ejecución**: Mapeo estricto de parámetros contra `sys.parameters` del SQL Server destino para evitar discrepancias de tipos.
- **Gestión Dinámica de Pools**: Creación y liberación eficiente de conexiones mediante `mssql.ConnectionPool`.

### 3.3 Capa de Datos Interna
- Base de datos independiente para almacenar metadatos de configuración, credenciales cifradas (AES-256), usuarios y logs de auditoría.

### 3.4 Capa de Conectividad Externa (Bases de Datos Destino)
- Conexión dinámica multi-servidor y multi-base gobernada por los perfiles de conexión seleccionados por el usuario ejecutor.
