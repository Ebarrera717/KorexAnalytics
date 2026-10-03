# MODELO DE BASE DE DATOS - KOREX ANALYTICS

---

## 1. ESQUEMA DDL INTERNO DE KOREX ANALYTICS

Korex Analytics cuenta con su propia base de datos dedicada (`Korex_Analytics` o equivalente configurado en su `.env`).

```mermaid
erDiagram
    Role ||--o{ User : "asigna a"
    User ||--o{ UserParameter : "posee"
    User ||--o{ ExecutionRun : "lanza"
    SQLConnectionProfile ||--o{ ExecutionRun : "se ejecuta en"
    ExecutionProcedure ||--o{ ExecutionPreset : "posee"
    ExecutionProcedure ||--o{ ExecutionRun : "se invoca en"

    Role {
        int id PK
        string name UK
        string description
        string permissions
        bit isActive
    }

    User {
        int id PK
        string name
        string email UK
        string passwordHash
        int roleId FK
        bit isActive
        datetime createdAt
    }

    UserParameter {
        int id PK
        int userId FK
        string paramKey
        string paramValue
        string category
    }

    SQLConnectionProfile {
        int id PK
        string name UK
        string server
        string instance
        int port
        string defaultDatabase
        string allowedDatabases
        string username
        string encryptedPassword
        bit encrypt
        bit trustServerCertificate
        int connectionTimeout
        int requestTimeout
        bit isActive
    }

    ExecutionProcedure {
        int id PK
        string name UK
        string spName
        string description
        string category
        string parametersConfig
        bit isActive
    }

    ExecutionPreset {
        int id PK
        int procedureId FK
        int userId FK
        string name
        string description
        string filterValues
        string columnConfigs
        string selectedTotals
    }

    ExecutionRun {
        int id PK
        string traceId UK
        int userId FK
        int profileId FK
        string targetDatabase
        int procedureId FK
        string spName
        string parametersPayload
        string status
        int recordsCount
        int durationMs
        string errorMessage
        datetime createdAt
        datetime completedAt
    }
```

---

## 2. REGLAS DDL Y PRESERVACIÓN DE DATOS

1. **Integridad Referencial**: Uso estricto de PKs, FKs e índices únicos para prevenir inconsistencias.
2. **Índices de Rendimiento**:
   - `CREATE INDEX IX_ExecutionRun_User ON dbo.ExecutionRun(userId, createdAt DESC);`
   - `CREATE INDEX IX_ExecutionRun_Trace ON dbo.ExecutionRun(traceId);`
   - `CREATE INDEX IX_ExecutionRun_Status ON dbo.ExecutionRun(status);`
3. **Inmutabilidad y No Destrucción**: Queda estrictamente prohibido ejecutar `DROP DATABASE` o `TRUNCATE` en procesos automáticos.
