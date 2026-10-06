const mssql = require('mssql');

async function updateProfiles() {
    const pool = new mssql.ConnectionPool({
        server: '127.0.0.1',
        port: 1433,
        user: 'zeusagencias',
        password: 'zzeusagencias',
        database: 'Korex_Analytics',
        options: { encrypt: false, trustServerCertificate: true }
    });
    await pool.connect();
    
    // Perfil 2 (Data Warehouse): agregar Zeusagencias_23 a allowedDatabases
    await pool.request()
        .input('allowed', mssql.NVarChar, JSON.stringify(['Zeusagencias_23', 'Korex_Pruebas', 'Korex_Analytics']))
        .query('UPDATE dbo.KAX_SQLConnectionProfile SET allowedDatabases = @allowed WHERE id = 2');

    // Perfil 3 (Servidor Principal Zeus ERP): apuntar a 127.0.0.1
    await pool.request()
        .input('server', mssql.NVarChar, '127.0.0.1')
        .input('allowed', mssql.NVarChar, JSON.stringify(['Zeusagencias_23']))
        .query('UPDATE dbo.KAX_SQLConnectionProfile SET server = @server, allowedDatabases = @allowed WHERE id = 3');

    const res = await pool.request().query('SELECT id, name, server, defaultDatabase, allowedDatabases FROM dbo.KAX_SQLConnectionProfile');
    console.log(JSON.stringify(res.recordset, null, 2));

    await pool.close();
}

updateProfiles().catch(console.error);
