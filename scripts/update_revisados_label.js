const mssql = require('mssql');

const config = {
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

async function main() {
    let pool;
    try {
        pool = await mssql.connect(config);
        console.log('Conectado a SQL Server Korex_Analytics');

        const res = await pool.request().query('SELECT id, name, spName, parametersConfig FROM dbo.KAX_ExecutionProcedure');
        for (const row of res.recordset) {
            if (!row.parametersConfig) continue;
            let params;
            try {
                params = JSON.parse(row.parametersConfig);
            } catch {
                continue;
            }

            let modified = false;
            for (const p of params) {
                if (p.name && p.name.toLowerCase() === 'mostrarsolorevisados') {
                    console.log(`[PROC ID ${row.id} - ${row.name}] Cambiando etiqueta de '${p.label}' a 'Mostrar revisados'`);
                    p.label = 'Mostrar revisados';
                    modified = true;
                }
            }

            if (modified) {
                const newJson = JSON.stringify(params, null, 2);
                await pool.request()
                    .input('id', mssql.Int, row.id)
                    .input('parametersConfig', mssql.NVarChar(mssql.MAX), newJson)
                    .query('UPDATE dbo.KAX_ExecutionProcedure SET parametersConfig = @parametersConfig, updatedAt = SYSUTCDATETIME() WHERE id = @id');
                console.log(`✓ Procedimiento ID ${row.id} (${row.name}) actualizado exitosamente.`);
            }
        }

        console.log('Actualización de etiquetas finalizada.');
    } catch (e) {
        console.error('Error al actualizar:', e);
    } finally {
        if (pool) await pool.close();
    }
}

main();
