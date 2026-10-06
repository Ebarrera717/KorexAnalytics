const mssql = require('mssql');

async function testSp() {
    const pool = new mssql.ConnectionPool({
        server: '127.0.0.1',
        port: 1433,
        user: 'zeusagencias',
        password: 'zzeusagencias',
        database: 'ZeusAgencias_23',
        options: { encrypt: false, trustServerCertificate: true }
    });
    await pool.connect();
    
    console.log('1. Probando req.execute con nombre entre corchetes:');
    try {
        const req1 = pool.request();
        await req1.execute('[dbo].[Zeus®spze_VentasDetalladasPorConceptos]');
        console.log('-> req.execute funcionó');
    } catch (e) {
        console.log('-> req.execute falló:', e.message);
    }

    console.log('2. Probando req.execute directo sin corchetes:');
    try {
        const req2 = pool.request();
        await req2.execute('dbo.Zeus®spze_VentasDetalladasPorConceptos');
        console.log('-> req.execute sin corchetes funcionó');
    } catch (e) {
        console.log('-> req.execute sin corchetes falló:', e.message);
    }

    console.log('3. Probando con query SQL dinamica EXEC:');
    try {
        const req3 = pool.request();
        const res3 = await req3.query('EXEC [dbo].[Zeus®spze_VentasDetalladasPorConceptos]');
        console.log('-> req.query EXEC funcionó');
    } catch (e) {
        console.log('-> req.query EXEC falló:', e.message);
    }

    await pool.close();
}

testSp().catch(console.error);
