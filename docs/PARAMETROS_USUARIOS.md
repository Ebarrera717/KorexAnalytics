# MÓDULO DE PARÁMETROS DE USUARIOS - KOREX ANALYTICS

---

## 1. PROPÓSITO Y ALCANCE

El módulo de **Parámetros de Usuarios** gestiona las preferencias operativas, restricciones de ejecución, servidores y bases de datos asignadas a cada usuario en Korex Analytics.

---

## 2. ARQUITECTURA DE RESOLUCIÓN DE PARÁMETROS

```text
┌─────────────────────────────────────────────────────────┐
│                    USUARIO EN SESIÓN                    │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│            PARÁMETROS ASIGNADOS AL USUARIO              │
│  - DefaultSQLProfileId: "2"                             │
│  - DefaultDatabase: "Financiero_2026"                   │
│  - MaxRecordsLimit: "5000"                              │
│  - AllowedProcedures: ["spReporteVentas", "spKardex"]   │
│  - AutoExportFormat: "EXCEL"                            │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                 MOTOR DE EJECUCIÓN                      │
│ Aplica restricciones, llena valores predeterminados en  │
│ formularios y valida autorización de la base destino    │
└─────────────────────────────────────────────────────────┘
```

---

## 3. ESPECIFICACIÓN DE ENDPOINTS

| Endpoint | Método | Descripción | Nivel de Acceso |
|---|---|---|---|
| `/api/parameters/user` | `GET` | Obtiene los parámetros del usuario en sesión activa. | Todos los usuarios autenticados. |
| `/api/parameters/user/[id]` | `GET` | Obtiene los parámetros de un usuario específico. | Admin / SuperAdmin. |
| `/api/parameters/user/[id]` | `POST` / `PUT` | Crea o actualiza un parámetro de usuario. | Admin / SuperAdmin. |
| `/api/parameters/user/[id]` | `DELETE` | Elimina un parámetro específico (restaura valor por defecto del sistema). | Admin / SuperAdmin. |
| `/api/parameters/system` | `GET` / `POST` | Gestiona parámetros globales del sistema (valores por defecto). | SuperAdmin. |

---

## 4. INTEGRACIÓN CON EL MÓDULO DE EJECUCIONES

1. **Precarga Automática**: Al ingresar a la pantalla de Ejecuciones, el sistema consulta los parámetros del usuario para auto-seleccionar el servidor, base de datos y procedimiento favorito.
2. **Filtrado de Procedimientos Permitidos**: Si el usuario posee una lista blanca de procedimientos (`AllowedProcedures`), el desplegable de SPs mostrará exclusivamente los autorizados.
