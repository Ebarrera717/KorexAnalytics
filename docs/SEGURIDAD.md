# POLÍTICA Y MODELO DE SEGURIDAD - KOREX ANALYTICS

---

## 1. PRINCIPIOS FUNDAMENTALES DE SEGURIDAD

1. **Defensa en Profundidad**: La seguridad opera en múltiples capas (Red, Aplicación, Base de Datos, Cifrado, Auditoría).
2. **Mínimo Privilegio**: Cada usuario y servicio opera con los permisos estrictamente necesarios para su rol.
3. **Validación en Backend**: Queda estrictamente prohibido confiar en la validación o visibilidad del frontend. Toda petición a una API valida sesión, rol y permisos en servidor.
4. **Secretos Fuera del Código**: Cero contraseñas hardcodeadas o volcadas en repositorios/logs.

---

## 2. AUTENTICACIÓN Y GESTIÓN DE SESIONES

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant Frontend as Cliente / Navegador
    participant API as API /api/auth/login
    participant DB as Korex Analytics DB

    Usuario->>Frontend: Ingresa Email y Contraseña
    Frontend->>API: POST /api/auth/login (Payload seguro)
    API->>DB: Consulta usuario por Email
    DB-->>API: Retorna hash de contraseña y estado
    API->>API: bcrypt.compare(password, passwordHash)
    alt Credenciales Válidas y Usuario Activo
        API->>API: Generar JWT con expiración (ej. 8h)
        API-->>Frontend: Set-Cookie (HttpOnly, Secure, SameSite=Strict) + 200 OK
        Frontend->>Usuario: Redirige a Dashboard
    else Credenciales Inválidas o Inactivo
        API->>DB: Registrar intento fallido en SystemLog
        API-->>Frontend: 401 Unauthorized (Mensaje genérico seguro)
        Frontend->>Usuario: Alerta de credenciales incorrectas
    end
```

---

## 3. AUTORIZACIÓN BASADA EN ROLES (RBAC)

Se definen 4 niveles estándar de roles:

| Rol | Alcance de Acceso | Acciones Permitidas |
|---|---|---|
| **SUPER_ADMIN** | Control Total del Sistema | Gestión de usuarios, perfiles SQL, parámetros, catálogos, auditoría y ejecución de cualquier SP. |
| **ADMIN** | Administración Operativa | Gestión de usuarios estándar, configuración de parámetros y ejecución de SPs autorizados. |
| **ANALYST** | Operación Analítica | Configuración de filtros, guardado de presets y ejecución de consultas/procedimientos analíticos. |
| **AUDITOR** | Supervisión y Lectura | Consulta de dashboard, historiales de ejecución, trazabilidad y logs de seguridad (sin permiso de ejecución). |

---

## 4. PROTECCIÓN DE CONEXIONES Y CIFRADO DE CREDENCIALES

1. **Cifrado AES-256-CBC**:
   - Toda contraseña de conexión a SQL Server se almacena cifrada bajo el formato `ENC(<iv>:<ciphertext>)`.
   - La clave maestra de cifrado reside en variables de entorno del servidor.
2. **Sanitización de Logs**:
   - Todo volcado de error a logs o trazabilidad enmascara datos sensibles: `password`, `token`, `secret`, `clave` → `***MASKED***`.
3. **Consultas Parametrizadas**:
   - Todo acceso a SQL Server utiliza `input()` tipado en el driver `mssql`, bloqueando cualquier vector de SQL Injection.
