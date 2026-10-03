import mssql from 'mssql';
import { decryptDatabasePassword } from './security';

export interface SQLProfileConfig {
    id: number;
    name: string;
    server: string;
    instance?: string;
    port?: number;
    defaultDatabase: string;
    allowedDatabases?: string[];
    username: string;
    encryptedPassword?: string;
    plainPassword?: string;
    encrypt?: boolean;
    trustServerCertificate?: boolean;
    connectionTimeout?: number;
    requestTimeout?: number;
}

/**
 * Gestor dinámico de conexiones SQL Server para Korex Analytics.
 * Soporta múltiples perfiles de conexión simultáneos y previene descalce de bases de datos.
 */
export class SQLPoolManager {
    /**
     * Construye y abre un pool de conexión temporal o bajo demanda hacia el servidor y base de datos seleccionados.
     */
    public static async getConnection(profile: SQLProfileConfig, targetDatabase?: string): Promise<{ pool: mssql.ConnectionPool; activeDatabase: string }> {
        const dbToUse = (targetDatabase || profile.defaultDatabase || '').trim();

        if (!dbToUse) {
            throw new Error(`[KAX_SQL_POOL] Error: No se ha especificado una base de datos válida para el perfil "${profile.name}".`);
        }

        // Validación de lista blanca de bases de datos permitidas
        if (profile.allowedDatabases && profile.allowedDatabases.length > 0) {
            const allowedSet = new Set(profile.allowedDatabases.map(d => d.trim().toLowerCase()));
            if (!allowedSet.has(dbToUse.toLowerCase())) {
                throw new Error(`[KAX_SQL_POOL] Error de Seguridad: La base de datos "${dbToUse}" no está autorizada en el perfil "${profile.name}".`);
            }
        }

        const password = profile.plainPassword || (profile.encryptedPassword ? decryptDatabasePassword(profile.encryptedPassword) : '');
        const host = (profile.server || '127.0.0.1').trim();
        const port = profile.port || 1433;

        const config: mssql.config = {
            user: profile.username,
            password: password,
            server: host,
            database: dbToUse,
            port: port,
            options: {
                instanceName: profile.instance || undefined,
                encrypt: profile.encrypt !== undefined ? profile.encrypt : false,
                trustServerCertificate: profile.trustServerCertificate !== undefined ? profile.trustServerCertificate : true,
                connectTimeout: (profile.connectionTimeout || 15) * 1000,
                requestTimeout: (profile.requestTimeout || 180) * 1000,
                enableArithAbort: true
            },
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000
            }
        };

        try {
            const pool = new mssql.ConnectionPool(config);
            await pool.connect();

            // Verificación activa de la base conectada
            const checkRes = await pool.request().query('SELECT DB_NAME() AS current_db');
            const connectedDb = checkRes.recordset[0]?.current_db;

            if (connectedDb && connectedDb.toLowerCase() !== dbToUse.toLowerCase()) {
                await pool.close();
                throw new Error(`[KAX_SQL_POOL] Descalce Crítico: Se solicitó "${dbToUse}" pero la conexión se abrió en "${connectedDb}". Conexión abortada.`);
            }

            return { pool, activeDatabase: connectedDb || dbToUse };
        } catch (err: any) {
            console.error(`[KAX_SQL_POOL] Error al conectar con SQL Server (${profile.server}/${dbToUse}):`, err.message);
            throw new Error(`Fallo de conexión SQL Server [${profile.name} -> ${dbToUse}]: ${err.message}`);
        }
    }

    /**
     * Prueba de conectividad segura para validar credenciales y puertos de un perfil.
     */
    public static async testConnection(profile: SQLProfileConfig): Promise<{ success: boolean; message: string; version?: string; activeDatabase?: string }> {
        let pool: mssql.ConnectionPool | null = null;
        try {
            const { pool: connPool, activeDatabase } = await this.getConnection(profile);
            pool = connPool;
            const res = await pool.request().query('SELECT @@VERSION AS sql_version, DB_NAME() AS db_name');
            const version = res.recordset[0]?.sql_version || 'SQL Server';
            await pool.close();
            return {
                success: true,
                message: 'Conexión validada exitosamente.',
                version: version.split('\n')[0],
                activeDatabase: activeDatabase
            };
        } catch (err: any) {
            if (pool) {
                try { await pool.close(); } catch (_) {}
            }
            return {
                success: false,
                message: err.message
            };
        }
    }
}
