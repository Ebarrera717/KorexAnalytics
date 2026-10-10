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
    const pool = await mssql.connect(config);
    console.log('Conectado a Korex_Analytics');

    // KAX_Dashboard
    const dashboardsRes = await pool.request().query('SELECT id, name, widgetsConfig FROM dbo.KAX_Dashboard');
    for (const d of dashboardsRes.recordset) {
        if (!d.widgetsConfig) continue;
        let configStr = d.widgetsConfig;
        let updated = false;

        // Reemplazar títulos que contengan variaciones de Tiquetes en KPIs o tablas
        if (/tiquete/i.test(configStr)) {
            configStr = configStr
                .replace(/Total Tiquetes/gi, 'Sumatoria Total')
                .replace(/Sumatoria de Tiquetes/gi, 'Sumatoria Total')
                .replace(/Sumatoria Tiquetes/gi, 'Sumatoria')
                .replace(/Part\. Tiquetes/gi, 'Participación')
                .replace(/tiquetes contabilizados/gi, 'registros evaluados');
            updated = true;
        }

        if (updated) {
            await pool.request()
                .input('id', mssql.Int, d.id)
                .input('cfg', mssql.NVarChar(mssql.MAX), configStr)
                .query('UPDATE dbo.KAX_Dashboard SET widgetsConfig = @cfg WHERE id = @id');
            console.log(`Actualizado Dashboard ${d.id}: ${d.name}`);
        }
    }

    console.log('Proceso de actualización de BD completado con éxito.');
    await pool.close();
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
