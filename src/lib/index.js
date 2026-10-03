const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mssql = require('mssql');

const KAX_SECRET = process.env.KAX_SECRET_KEY || 'Korex_Analytics_Enterprise_Secret_Key_2026_AES256';

function getDerivedKey(secret) {
    const keyString = secret || KAX_SECRET;
    return crypto.createHash('sha256').update(keyString).digest();
}

/**
 * Encripta contraseñas de bases de datos utilizando AES-256-CBC.
 */
function encryptDatabasePassword(plainText) {
    if (!plainText || typeof plainText !== 'string') return plainText;
    const trimmed = plainText.trim();
    if (trimmed === '' || trimmed.startsWith('ENC(')) return plainText;

    try {
        const key = getDerivedKey();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(plainText, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `ENC(${iv.toString('hex')}:${encrypted})`;
    } catch (err) {
        console.error('[KAX_SECURITY] Error al encriptar contraseña:', err.message);
        return plainText;
    }
}

/**
 * Desencripta tokens ENC(...) a texto plano.
 */
function decryptDatabasePassword(cipherText) {
    if (!cipherText || typeof cipherText !== 'string') return cipherText;
    const trimmed = cipherText.trim();
    if (!trimmed.startsWith('ENC(') || !trimmed.endsWith(')')) return cipherText;

    try {
        const inner = trimmed.slice(4, -1).trim();
        const parts = inner.split(':');
        if (parts.length !== 2) return cipherText;

        const [ivHex, encHex] = parts;
        const key = getDerivedKey();
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.warn('[KAX_SECURITY] Error al desencriptar token, retornando original:', err.message);
        return cipherText;
    }
}

async function hashUserPassword(password) {
    return await bcrypt.hash(password, 10);
}

async function verifyUserPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

function sanitizePayload(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const clean = Array.isArray(obj) ? [] : {};
    for (const [k, v] of Object.entries(obj)) {
        const lower = k.toLowerCase();
        if (lower.includes('password') || lower.includes('clave') || lower.includes('secret') || lower.includes('token')) {
            clean[k] = '***MASKED***';
        } else if (v && typeof v === 'object') {
            clean[k] = sanitizePayload(v);
        } else {
            clean[k] = v;
        }
    }
    return clean;
}

class AuditLogger {
    static async log(event) {
        const timestamp = new Date().toISOString();
        const safeDetails = event.details ? sanitizePayload(event.details) : {};
        const logEntry = {
            timestamp,
            userId: event.userId || null,
            userName: event.userName || 'SYSTEM',
            action: event.action,
            module: event.module,
            ipAddress: event.ipAddress || '127.0.0.1',
            userAgent: event.userAgent || 'KAX-Client',
            details: safeDetails
        };
        console.log(`[KAX_AUDIT][${event.module}] ${event.action} by ${logEntry.userName} (${logEntry.ipAddress})`);
    }

    static generateTraceId() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase();
        return `TRC-${yyyy}${mm}${dd}-${randomHex}`;
    }
}

class SQLPoolManager {
    static async getConnection(profile, targetDatabase) {
        const dbToUse = (targetDatabase || profile.defaultDatabase || '').trim();

        if (!dbToUse) {
            throw new Error(`[KAX_SQL_POOL] Error: No se ha especificado una base de datos válida para el perfil "${profile.name}".`);
        }

        if (profile.allowedDatabases && profile.allowedDatabases.length > 0) {
            const allowedSet = new Set(profile.allowedDatabases.map(d => d.trim().toLowerCase()));
            if (!allowedSet.has(dbToUse.toLowerCase())) {
                throw new Error(`[KAX_SQL_POOL] Error de Seguridad: La base de datos "${dbToUse}" no está autorizada en el perfil "${profile.name}".`);
            }
        }

        const password = profile.plainPassword || (profile.encryptedPassword ? decryptDatabasePassword(profile.encryptedPassword) : '');
        const host = (profile.server || '127.0.0.1').trim();
        const port = profile.port || 1433;

        const config = {
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

        const pool = new mssql.ConnectionPool(config);
        await pool.connect();
        const checkRes = await pool.request().query('SELECT DB_NAME() AS current_db');
        const connectedDb = checkRes.recordset[0]?.current_db;

        if (connectedDb && connectedDb.toLowerCase() !== dbToUse.toLowerCase()) {
            await pool.close();
            throw new Error(`[KAX_SQL_POOL] Descalce Crítico: Se solicitó "${dbToUse}" pero la conexión se abrió en "${connectedDb}". Conexión abortada.`);
        }

        return { pool, activeDatabase: connectedDb || dbToUse };
    }

    static async testConnection(profile) {
        let pool = null;
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
        } catch (err) {
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

class ExecutionRunner {
    static async run(req) {
        const traceId = AuditLogger.generateTraceId();
        const startTime = Date.now();
        let pool = null;
        let activeDatabase = '';

        try {
            const conn = await SQLPoolManager.getConnection(req.profile, req.targetDatabase);
            pool = conn.pool;
            activeDatabase = conn.activeDatabase;

            const metaReq = pool.request();
            metaReq.input('spName', mssql.VarChar, req.spName);
            const sysParamsRes = await metaReq.query(`
                SELECT p.name AS param_name
                FROM sys.parameters p
                WHERE p.object_id = OBJECT_ID(@spName)
                   OR p.object_id = OBJECT_ID('dbo.' + REPLACE(REPLACE(@spName, 'dbo.', ''), '[', ''))
            `);

            const validParamSet = new Set();
            if (sysParamsRes.recordset && sysParamsRes.recordset.length > 0) {
                sysParamsRes.recordset.forEach((r) => {
                    const clean = (r.param_name || '').replace(/^@/, '').toLowerCase();
                    validParamSet.add(clean);
                });
            }

            const execReq = pool.request();
            execReq.timeout = (req.profile.requestTimeout || 180) * 1000;

            if (req.parameters && typeof req.parameters === 'object') {
                Object.keys(req.parameters).forEach((key) => {
                    const lower = key.toLowerCase();
                    if (validParamSet.size > 0 && !validParamSet.has(lower)) {
                        return;
                    }
                    let val = req.parameters[key];
                    if (val === undefined || val === null) {
                        val = null;
                    } else if (typeof val === 'string') {
                        val = val.trim();
                        if (val === '') val = null;
                    }
                    execReq.input(key, mssql.VarChar(mssql.MAX), val);
                });
            }

            const result = await execReq.execute(req.spName);
            const recordset = result.recordset || [];
            const elapsedTime = Date.now() - startTime;
            const columns = recordset.length > 0 ? Object.keys(recordset[0]) : [];

            await AuditLogger.log({
                userId: req.userId,
                userName: req.userName,
                action: 'EXECUTE_SP_SUCCESS',
                module: 'EXECUTIONS',
                ipAddress: req.ipAddress,
                userAgent: req.userAgent,
                details: {
                    traceId,
                    spName: req.spName,
                    server: req.profile.server,
                    database: activeDatabase,
                    recordCount: recordset.length,
                    durationMs: elapsedTime,
                    parameters: sanitizePayload(req.parameters)
                }
            });

            await pool.close();

            return {
                success: true,
                traceId,
                spName: req.spName,
                targetDatabase: activeDatabase,
                serverHost: req.profile.server,
                recordCount: recordset.length,
                elapsedTimeMs: elapsedTime,
                columns,
                data: recordset
            };
        } catch (err) {
            const elapsedTime = Date.now() - startTime;
            if (pool) {
                try { await pool.close(); } catch (_) {}
            }

            await AuditLogger.log({
                userId: req.userId,
                userName: req.userName,
                action: 'EXECUTE_SP_ERROR',
                module: 'EXECUTIONS',
                ipAddress: req.ipAddress,
                userAgent: req.userAgent,
                details: {
                    traceId,
                    spName: req.spName,
                    server: req.profile.server,
                    database: activeDatabase || req.targetDatabase,
                    durationMs: elapsedTime,
                    errorMessage: err.message,
                    parameters: sanitizePayload(req.parameters)
                }
            });

            return {
                success: false,
                traceId,
                spName: req.spName,
                targetDatabase: activeDatabase || req.targetDatabase || 'UNKNOWN',
                serverHost: req.profile.server,
                recordCount: 0,
                elapsedTimeMs: elapsedTime,
                columns: [],
                data: [],
                message: err.message || 'Error durante la ejecución del procedimiento analítico.',
                errorDetails: err.originalError?.message || err.code || ''
            };
        }
    }
}

module.exports = {
    encryptDatabasePassword,
    decryptDatabasePassword,
    hashUserPassword,
    verifyUserPassword,
    sanitizePayload,
    AuditLogger,
    SQLPoolManager,
    ExecutionRunner
};
