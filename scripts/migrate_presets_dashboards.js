const mssql = require('mssql');

async function migrate() {
    const config = {
        server: process.env.KAX_INTERNAL_DB_SERVER || '127.0.0.1',
        port: parseInt(process.env.KAX_INTERNAL_DB_PORT || '1433', 10),
        database: process.env.KAX_INTERNAL_DB_NAME || 'Korex_Analytics',
        user: process.env.KAX_INTERNAL_DB_USER || 'zeusagencias',
        password: process.env.KAX_INTERNAL_DB_PASSWORD || 'zzeusagencias',
        options: { encrypt: false, trustServerCertificate: true }
    };
    
    console.log('Conectando a Korex_Analytics...');
    const pool = await new mssql.ConnectionPool(config).connect();
    
    // 1. Agregar columna dashboardsConfig si no existe
    await pool.request().query(`
        IF COL_LENGTH('dbo.KAX_ExecutionPreset', 'dashboardsConfig') IS NULL
        BEGIN
            ALTER TABLE dbo.KAX_ExecutionPreset ADD [dashboardsConfig] NVARCHAR(MAX) NULL;
            PRINT 'Columna dashboardsConfig agregada a dbo.KAX_ExecutionPreset';
        END
    `);
    console.log('Estructura de tabla KAX_ExecutionPreset verificada.');

    // 2. Sembrar presets existentes con los tableros actuales de KAX_Dashboard
    const presets = await pool.request().query('SELECT id, procedureId, name FROM dbo.KAX_ExecutionPreset');
    for (const preset of presets.recordset) {
        const dashRes = await pool.request()
            .input('procedureId', mssql.Int, preset.procedureId)
            .query(`
                SELECT id, procedureId, userId, name, description, layoutConfig, widgetsConfig, isDefault, createdAt, updatedAt
                FROM dbo.KAX_Dashboard
                WHERE procedureId = @procedureId
                ORDER BY id ASC
            `);
        
        if (dashRes.recordset.length > 0) {
            const dashboards = dashRes.recordset.map(row => ({
                id: row.id,
                procedureId: row.procedureId,
                userId: row.userId,
                name: row.name,
                description: row.description,
                layoutConfig: typeof row.layoutConfig === 'string' ? JSON.parse(row.layoutConfig) : (row.layoutConfig || null),
                widgetsConfig: typeof row.widgetsConfig === 'string' ? JSON.parse(row.widgetsConfig) : (row.widgetsConfig || []),
                isDefault: Boolean(row.isDefault),
                createdAt: row.createdAt,
                updatedAt: row.updatedAt
            }));
            
            await pool.request()
                .input('id', mssql.Int, preset.id)
                .input('dashConfig', mssql.NVarChar(mssql.MAX), JSON.stringify(dashboards))
                .query(`
                    UPDATE dbo.KAX_ExecutionPreset
                    SET dashboardsConfig = @dashConfig
                    WHERE id = @id AND (dashboardsConfig IS NULL OR dashboardsConfig = '')
                `);
            console.log(`Preset ${preset.id} (${preset.name}) sembrado con ${dashboards.length} tableros.`);
        }
    }

    console.log('Migración completada con éxito.');
    await pool.close();
}

migrate().catch(err => {
    console.error('Error en migración:', err);
    process.exit(1);
});
