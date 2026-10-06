import mssql from 'mssql';

let internalPool: mssql.ConnectionPool | null = null;

export async function getInternalDbPool(): Promise<mssql.ConnectionPool> {
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

export async function executeInternalProcedure(
    spName: string,
    inputs: Record<string, { type: any; value: any }>,
    outputs: Record<string, any> = {}
): Promise<{ recordset: any[]; recordsets: any; output: Record<string, any> }> {
    const pool = await getInternalDbPool();
    const req = pool.request();

    for (const [name, def] of Object.entries(inputs)) {
        req.input(name, def.type, def.value);
    }

    for (const [name, type] of Object.entries(outputs)) {
        req.output(name, type);
    }

    const result = await req.execute(spName);
    return {
        recordset: (result.recordset as any[]) || [],
        recordsets: (result.recordsets as any) || [],
        output: result.output || {}
    };
}
