import mssql from 'mssql';
import { encryptDatabasePassword, decryptDatabasePassword, sanitizePayload } from './security';
import { SQLPoolManager, SQLProfileConfig } from './sql-pool-manager';

export interface SQLProfileEntity {
    id: number;
    name: string;
    server: string;
    instance?: string;
    port: number;
    defaultDatabase: string;
    allowedDatabases: string[];
    username: string;
    encryptedPassword?: string;
    plainPassword?: string;
    encrypt: boolean;
    trustServerCertificate: boolean;
    connectionTimeout: number;
    requestTimeout: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

let internalPool: mssql.ConnectionPool | null = null;

async function getInternalPool(): Promise<mssql.ConnectionPool> {
    if (internalPool && internalPool.connected) {
        return internalPool;
    }

    const config: mssql.config = {
        server: process.env.KAX_INTERNAL_DB_SERVER || '127.0.0.1',
        port: parseInt(process.env.KAX_INTERNAL_DB_PORT || '1433', 10),
        database: process.env.KAX_INTERNAL_DB_NAME || 'Korex_Analytics',
        user: process.env.KAX_INTERNAL_DB_USER || 'zeusagencias',
        password: process.env.KAX_INTERNAL_DB_PASSWORD || 'zzeusagencias',
        options: {
            encrypt: false,
            trustServerCertificate: true,
            connectTimeout: 10000
        }
    };

    internalPool = new mssql.ConnectionPool(config);
    await internalPool.connect();
    return internalPool;
}

export class SQLProfilesService {
    /**
     * Asegura que exista al menos el perfil oficial de Zeus ERP en la tabla
     */
    private static async ensureInitialSeed(pool: mssql.ConnectionPool) {
        const countRes = await pool.request().query('SELECT COUNT(*) AS total FROM dbo.KAX_SQLConnectionProfile');
        const count = countRes.recordset[0]?.total || 0;

        if (count === 0) {
            const defaultEncPass = encryptDatabasePassword('zzeusagencias');
            await pool.request()
                .input('name', mssql.NVarChar, 'Producción Central (Zeus ERP)')
                .input('server', mssql.NVarChar, '127.0.0.1')
                .input('instance', mssql.NVarChar, '')
                .input('port', mssql.Int, 1433)
                .input('defaultDatabase', mssql.NVarChar, 'Zeusagencias_23')
                .input('allowedDatabases', mssql.NVarChar, JSON.stringify(['Zeusagencias_23', 'ZeusContabilidad_Db', 'Korex_Pruebas']))
                .input('username', mssql.NVarChar, 'zeusagencias')
                .input('encryptedPassword', mssql.NVarChar, defaultEncPass)
                .input('encrypt', mssql.Bit, 0)
                .input('trustServerCertificate', mssql.Bit, 1)
                .input('connectionTimeout', mssql.Int, 15)
                .input('requestTimeout', mssql.Int, 180)
                .input('isActive', mssql.Bit, 1)
                .query(`
                    INSERT INTO dbo.KAX_SQLConnectionProfile (
                        name, server, instance, port, defaultDatabase, allowedDatabases, username,
                        encryptedPassword, encrypt, trustServerCertificate, connectionTimeout,
                        requestTimeout, isActive, createdAt, updatedAt
                    ) VALUES (
                        @name, @server, @instance, @port, @defaultDatabase, @allowedDatabases, @username,
                        @encryptedPassword, @encrypt, @trustServerCertificate, @connectionTimeout,
                        @requestTimeout, @isActive, SYSUTCDATETIME(), SYSUTCDATETIME()
                    )
                `);

            await pool.request()
                .input('name', mssql.NVarChar, 'Data Warehouse & Analítica')
                .input('server', mssql.NVarChar, '127.0.0.1')
                .input('instance', mssql.NVarChar, '')
                .input('port', mssql.Int, 1433)
                .input('defaultDatabase', mssql.NVarChar, 'Korex_Pruebas')
                .input('allowedDatabases', mssql.NVarChar, JSON.stringify(['Korex_Pruebas', 'Korex_Analytics']))
                .input('username', mssql.NVarChar, 'zeusagencias')
                .input('encryptedPassword', mssql.NVarChar, defaultEncPass)
                .input('encrypt', mssql.Bit, 0)
                .input('trustServerCertificate', mssql.Bit, 1)
                .input('connectionTimeout', mssql.Int, 15)
                .input('requestTimeout', mssql.Int, 180)
                .input('isActive', mssql.Bit, 1)
                .query(`
                    INSERT INTO dbo.KAX_SQLConnectionProfile (
                        name, server, instance, port, defaultDatabase, allowedDatabases, username,
                        encryptedPassword, encrypt, trustServerCertificate, connectionTimeout,
                        requestTimeout, isActive, createdAt, updatedAt
                    ) VALUES (
                        @name, @server, @instance, @port, @defaultDatabase, @allowedDatabases, @username,
                        @encryptedPassword, @encrypt, @trustServerCertificate, @connectionTimeout,
                        @requestTimeout, @isActive, SYSUTCDATETIME(), SYSUTCDATETIME()
                    )
                `);
        }
    }

    /**
     * Obtiene todos los perfiles de conexión registrados
     */
    public static async getAllProfiles(): Promise<SQLProfileEntity[]> {
        const pool = await getInternalPool();
        await this.ensureInitialSeed(pool);

        const res = await pool.request().query(`
            SELECT id, name, server, instance, port, defaultDatabase, allowedDatabases,
                   username, encryptedPassword, encrypt, trustServerCertificate,
                   connectionTimeout, requestTimeout, isActive, createdAt, updatedAt
            FROM dbo.KAX_SQLConnectionProfile
            ORDER BY id ASC
        `);

        return res.recordset.map(row => {
            let allowed: string[] = [];
            if (row.allowedDatabases) {
                try {
                    const parsed = JSON.parse(row.allowedDatabases);
                    allowed = Array.isArray(parsed) ? parsed : [row.defaultDatabase];
                } catch {
                    allowed = String(row.allowedDatabases).split(',').map(s => s.trim()).filter(Boolean);
                }
            } else {
                allowed = [row.defaultDatabase];
            }

            return {
                id: row.id,
                name: row.name,
                server: row.server,
                instance: row.instance || '',
                port: row.port || 1433,
                defaultDatabase: row.defaultDatabase,
                allowedDatabases: allowed,
                username: row.username,
                encryptedPassword: row.encryptedPassword,
                encrypt: Boolean(row.encrypt),
                trustServerCertificate: Boolean(row.trustServerCertificate),
                connectionTimeout: row.connectionTimeout || 15,
                requestTimeout: row.requestTimeout || 180,
                isActive: Boolean(row.isActive),
                createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
                updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined
            };
        });
    }

    /**
     * Obtiene un perfil específico por ID con su contraseña cifrada
     */
    public static async getProfileById(id: number): Promise<SQLProfileEntity | null> {
        const pool = await getInternalPool();
        const res = await pool.request()
            .input('id', mssql.Int, id)
            .query(`
                SELECT id, name, server, instance, port, defaultDatabase, allowedDatabases,
                       username, encryptedPassword, encrypt, trustServerCertificate,
                       connectionTimeout, requestTimeout, isActive
                FROM dbo.KAX_SQLConnectionProfile
                WHERE id = @id
            `);

        if (res.recordset.length === 0) return null;
        const row = res.recordset[0];
        let allowed: string[] = [];
        if (row.allowedDatabases) {
            try {
                const parsed = JSON.parse(row.allowedDatabases);
                allowed = Array.isArray(parsed) ? parsed : [row.defaultDatabase];
            } catch {
                allowed = String(row.allowedDatabases).split(',').map(s => s.trim()).filter(Boolean);
            }
        } else {
            allowed = [row.defaultDatabase];
        }

        return {
            id: row.id,
            name: row.name,
            server: row.server,
            instance: row.instance || '',
            port: row.port || 1433,
            defaultDatabase: row.defaultDatabase,
            allowedDatabases: allowed,
            username: row.username,
            encryptedPassword: row.encryptedPassword,
            encrypt: Boolean(row.encrypt),
            trustServerCertificate: Boolean(row.trustServerCertificate),
            connectionTimeout: row.connectionTimeout || 15,
            requestTimeout: row.requestTimeout || 180,
            isActive: Boolean(row.isActive)
        };
    }

    /**
     * Guarda o actualiza un perfil de servidor SQL Server / Zeus ERP
     */
    public static async saveProfile(data: {
        id?: number;
        name: string;
        server: string;
        instance?: string;
        port?: number;
        defaultDatabase: string;
        allowedDatabases?: string[] | string;
        username: string;
        password?: string;
        encrypt?: boolean;
        trustServerCertificate?: boolean;
        connectionTimeout?: number;
        requestTimeout?: number;
        isActive?: boolean;
    }): Promise<SQLProfileEntity> {
        const pool = await getInternalPool();

        let allowedList: string[] = [];
        if (Array.isArray(data.allowedDatabases)) {
            allowedList = data.allowedDatabases;
        } else if (typeof data.allowedDatabases === 'string') {
            allowedList = data.allowedDatabases.split(',').map(s => s.trim()).filter(Boolean);
        }
        if (allowedList.length === 0 && data.defaultDatabase) {
            allowedList = [data.defaultDatabase];
        }
        if (data.defaultDatabase && !allowedList.includes(data.defaultDatabase)) {
            allowedList.unshift(data.defaultDatabase);
        }

        const allowedJson = JSON.stringify(allowedList);

        if (data.id) {
            // Actualización
            const existing = await this.getProfileById(data.id);
            if (!existing) {
                throw new Error(`Perfil con ID ${data.id} no encontrado.`);
            }

            const encPass = data.password && data.password.trim() !== ''
                ? encryptDatabasePassword(data.password)
                : existing.encryptedPassword;

            await pool.request()
                .input('id', mssql.Int, data.id)
                .input('name', mssql.NVarChar, data.name)
                .input('server', mssql.NVarChar, data.server)
                .input('instance', mssql.NVarChar, data.instance || '')
                .input('port', mssql.Int, Number(data.port) || 1433)
                .input('defaultDatabase', mssql.NVarChar, data.defaultDatabase)
                .input('allowedDatabases', mssql.NVarChar, allowedJson)
                .input('username', mssql.NVarChar, data.username)
                .input('encryptedPassword', mssql.NVarChar, encPass)
                .input('encrypt', mssql.Bit, data.encrypt !== undefined ? (data.encrypt ? 1 : 0) : 0)
                .input('trustServerCertificate', mssql.Bit, data.trustServerCertificate !== undefined ? (data.trustServerCertificate ? 1 : 0) : 1)
                .input('connectionTimeout', mssql.Int, Number(data.connectionTimeout) || 15)
                .input('requestTimeout', mssql.Int, Number(data.requestTimeout) || 180)
                .input('isActive', mssql.Bit, data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1)
                .query(`
                    UPDATE dbo.KAX_SQLConnectionProfile
                    SET name = @name,
                        server = @server,
                        instance = @instance,
                        port = @port,
                        defaultDatabase = @defaultDatabase,
                        allowedDatabases = @allowedDatabases,
                        username = @username,
                        encryptedPassword = @encryptedPassword,
                        encrypt = @encrypt,
                        trustServerCertificate = @trustServerCertificate,
                        connectionTimeout = @connectionTimeout,
                        requestTimeout = @requestTimeout,
                        isActive = @isActive,
                        updatedAt = SYSUTCDATETIME()
                    WHERE id = @id
                `);

            return (await this.getProfileById(data.id))!;
        } else {
            // Creación
            const encPass = encryptDatabasePassword(data.password || '');
            const insertRes = await pool.request()
                .input('name', mssql.NVarChar, data.name)
                .input('server', mssql.NVarChar, data.server)
                .input('instance', mssql.NVarChar, data.instance || '')
                .input('port', mssql.Int, Number(data.port) || 1433)
                .input('defaultDatabase', mssql.NVarChar, data.defaultDatabase)
                .input('allowedDatabases', mssql.NVarChar, allowedJson)
                .input('username', mssql.NVarChar, data.username)
                .input('encryptedPassword', mssql.NVarChar, encPass)
                .input('encrypt', mssql.Bit, data.encrypt !== undefined ? (data.encrypt ? 1 : 0) : 0)
                .input('trustServerCertificate', mssql.Bit, data.trustServerCertificate !== undefined ? (data.trustServerCertificate ? 1 : 0) : 1)
                .input('connectionTimeout', mssql.Int, Number(data.connectionTimeout) || 15)
                .input('requestTimeout', mssql.Int, Number(data.requestTimeout) || 180)
                .input('isActive', mssql.Bit, data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1)
                .query(`
                    INSERT INTO dbo.KAX_SQLConnectionProfile (
                        name, server, instance, port, defaultDatabase, allowedDatabases, username,
                        encryptedPassword, encrypt, trustServerCertificate, connectionTimeout,
                        requestTimeout, isActive, createdAt, updatedAt
                    ) VALUES (
                        @name, @server, @instance, @port, @defaultDatabase, @allowedDatabases, @username,
                        @encryptedPassword, @encrypt, @trustServerCertificate, @connectionTimeout,
                        @requestTimeout, @isActive, SYSUTCDATETIME(), SYSUTCDATETIME()
                    );
                    SELECT SCOPE_IDENTITY() AS newId;
                `);

            const newId = insertRes.recordset[0]?.newId;
            return (await this.getProfileById(newId))!;
        }
    }

    /**
     * Elimina un perfil por ID
     */
    public static async deleteProfile(id: number): Promise<boolean> {
        const pool = await getInternalPool();
        const res = await pool.request()
            .input('id', mssql.Int, id)
            .query('DELETE FROM dbo.KAX_SQLConnectionProfile WHERE id = @id');
        return (res.rowsAffected[0] || 0) > 0;
    }

    /**
     * Prueba la conexión hacia un perfil existente (por ID) o con parámetros en vivo (desde el formulario)
     * e identifica todas las bases de datos en línea en ese servidor.
     */
    public static async testConnection(params: {
        id?: number;
        server?: string;
        instance?: string;
        port?: number;
        defaultDatabase?: string;
        username?: string;
        password?: string;
        encrypt?: boolean;
        trustServerCertificate?: boolean;
    }): Promise<{
        success: boolean;
        message: string;
        version?: string;
        activeDatabase?: string;
        responseTimeMs?: number;
        availableDatabases?: string[];
    }> {
        let profileConfig: SQLProfileConfig;

        if (params.id) {
            const saved = await this.getProfileById(params.id);
            if (!saved) {
                return { success: false, message: `Perfil #${params.id} no encontrado en la base de datos.` };
            }
            profileConfig = {
                id: saved.id,
                name: saved.name,
                server: params.server || saved.server,
                instance: params.instance !== undefined ? params.instance : saved.instance,
                port: params.port || saved.port,
                defaultDatabase: params.defaultDatabase || saved.defaultDatabase,
                allowedDatabases: saved.allowedDatabases,
                username: params.username || saved.username,
                encryptedPassword: saved.encryptedPassword,
                plainPassword: params.password && params.password.trim() !== '' ? params.password : undefined,
                encrypt: params.encrypt !== undefined ? params.encrypt : saved.encrypt,
                trustServerCertificate: params.trustServerCertificate !== undefined ? params.trustServerCertificate : saved.trustServerCertificate
            };
        } else {
            profileConfig = {
                id: 0,
                name: 'Prueba en Vivo',
                server: params.server || '127.0.0.1',
                instance: params.instance || '',
                port: Number(params.port) || 1433,
                defaultDatabase: params.defaultDatabase || 'master',
                username: params.username || 'sa',
                plainPassword: params.password || '',
                encrypt: params.encrypt !== undefined ? params.encrypt : false,
                trustServerCertificate: params.trustServerCertificate !== undefined ? params.trustServerCertificate : true,
                connectionTimeout: 10
            };
        }

        const start = Date.now();
        let pool: mssql.ConnectionPool | null = null;

        try {
            const password = profileConfig.plainPassword || (profileConfig.encryptedPassword ? decryptDatabasePassword(profileConfig.encryptedPassword) : '');
            const config: mssql.config = {
                user: profileConfig.username,
                password: password,
                server: profileConfig.server.trim(),
                database: profileConfig.defaultDatabase || 'master',
                port: profileConfig.port || 1433,
                options: {
                    instanceName: profileConfig.instance || undefined,
                    encrypt: profileConfig.encrypt,
                    trustServerCertificate: profileConfig.trustServerCertificate,
                    connectTimeout: 10000,
                    requestTimeout: 15000,
                    enableArithAbort: true
                }
            };

            pool = new mssql.ConnectionPool(config);
            await pool.connect();

            // Versión y Base activa
            const infoRes = await pool.request().query('SELECT @@VERSION AS version, DB_NAME() AS current_db');
            const version = (infoRes.recordset[0]?.version || 'SQL Server').split('\n')[0];
            const activeDatabase = infoRes.recordset[0]?.current_db || profileConfig.defaultDatabase;

            // Detectar bases en línea
            let availableDatabases: string[] = [];
            try {
                const dbRes = await pool.request().query(`
                    SELECT name 
                    FROM sys.databases 
                    WHERE state_desc = 'ONLINE' 
                      AND name NOT IN ('tempdb') 
                    ORDER BY name ASC
                `);
                availableDatabases = dbRes.recordset.map(r => r.name);
            } catch {
                availableDatabases = [activeDatabase];
            }

            await pool.close();
            const elapsed = Date.now() - start;

            return {
                success: true,
                message: `Conexión exitosa a ${profileConfig.server}:${profileConfig.port || 1433} (${activeDatabase})`,
                version,
                activeDatabase,
                responseTimeMs: elapsed,
                availableDatabases
            };
        } catch (err: any) {
            if (pool) {
                try { await pool.close(); } catch {}
            }
            const elapsed = Date.now() - start;
            return {
                success: false,
                message: err.message || 'Error desconocido al conectar con SQL Server',
                responseTimeMs: elapsed
            };
        }
    }
}
