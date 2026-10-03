# GESTIÓN Y CONEXIÓN DINÁMICA SQL SERVER - KOREX ANALYTICS

---

## 1. OBJETIVO Y REGLA DE NO CONEXIONES HARDCODEADAS

Korex Analytics soporta la gestión de **Múltiples Perfiles de Conexión SQL Server**.

> [!CAUTION]
> **Prohibición Absoluta**: Queda terminantemente prohibido quemar o asumir nombres de servidores (`sa`, `localhost`, `Korex_pruebas`) en el código. Toda conexión se resuelve en caliente a partir del perfil seleccionado y validado.

---

## 2. ESTRUCTURA DE UN PERFIL DE CONEXIÓN (`SQLConnectionProfile`)

```typescript
interface SQLConnectionProfile {
    id: number;
    name: string;             // Ej: "Producción Norte", "DataWarehouse Central"
    server: string;           // Host o IP (ej: "192.168.1.50")
    instance?: string;        // Nombre de instancia opcional (ej: "SQLEXPRESS")
    port?: number;            // Puerto TCP (ej: 1433)
    defaultDatabase: string;  // Base de datos principal (ej: "Empresa_2026")
    allowedDatabases: string[]; // Lista blanca de bases accesibles
    username: string;         // Usuario SQL Server
    encryptedPassword: string;// Contraseña cifrada AES-256
    encrypt: boolean;         // SSL/TLS Encryption
    trustServerCertificate: boolean;
    connectionTimeout: number;// Segundos para timeout de conexión (default: 15)
    requestTimeout: number;   // Segundos para timeout de query/SP (default: 180)
    isActive: boolean;
}
```

---

## 3. FLUJO DE CONEXIÓN Y RESOLUCIÓN DINÁMICA

```mermaid
sequenceDiagram
    autonumber
    participant UI as Interfaz de Ejecuciones
    participant Runner as Execution Runner API
    participant Resolver as SQL Config Resolver
    participant PoolMgr as Connection Pool Manager
    participant SQLServer as Servidor SQL Server Destino

    UI->>Runner: Solicitar Ejecución (profileId: 2, db: "Ventas_2026", sp: "spAnalisis")
    Runner->>Resolver: Obtener y desencriptar perfil #2
    Resolver-->>Runner: Credenciales desencriptadas en memoria
    Runner->>Runner: Validar que "Ventas_2026" esté en allowedDatabases
    Runner->>PoolMgr: Obtener ConnectionPool(server, port, user, pass, db)
    PoolMgr->>SQLServer: Handshake & Autenticación TCP
    SQLServer-->>PoolMgr: Conexión establecida (200 OK)
    Runner->>SQLServer: Ejecutar Procedimiento con Parámetros Tipados
    SQLServer-->>Runner: Recordset devuelto
    Runner->>PoolMgr: Liberar/Reciclar conexión
    Runner-->>UI: Retornar Datos & Estadísticas
```

---

## 4. VALIDACIÓN PREVENTIVA DE AISLAMIENTO (PRUEBA A vs B)

El sistema garantiza que una ejecución programada para la **Configuración A (Base A)** nunca pueda dispararse sobre la **Configuración B (Base B)**:
1. El backend compara explícitamente el `targetDatabase` solicitado contra el catálogo del `profileId`.
2. Se ejecuta un `USE [TargetDatabase]` validado o se abre el pool apuntando estrictamente a dicha base.
3. Se verifica `SELECT DB_NAME()` en la sesión antes de invocar el SP.
