const mssql = require('mssql');

async function test() {
    const pool = await mssql.connect({
        server: '127.0.0.1',
        database: 'Korex_Analytics',
        user: 'zeusagencias',
        password: 'zzeusagencias',
        options: { encrypt: false, trustServerCertificate: true }
    });

    const res = await pool.request().query('SELECT id, name, spName, description, category, isActive FROM dbo.KAX_ExecutionProcedure');
    console.table(res.recordset);

    await pool.close();
}

test();
