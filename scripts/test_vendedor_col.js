const crypto = require('crypto');
const mssql = require('mssql');

const KAX_SECRET = 'Korex_Analytics_Enterprise_Secret_Key_2026_AES256';
const key = crypto.createHash('sha256').update(KAX_SECRET).digest();
const inner = '46f1c74044a6c4d8e320a54969d97710:f0f03b214a06349f7bb748cf03d075a2';
const [ivHex, encHex] = inner.split(':');
const iv = Buffer.from(ivHex, 'hex');
const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
const pass = decipher.update(encHex, 'hex', 'utf8') + decipher.final('utf8');

async function test() {
    console.log('Conectando a Servidor Colaereo (192.168.15.8)...');
    const pool = await new mssql.ConnectionPool({
        server: '192.168.15.8',
        database: 'ZeusAgencias_Colaereo',
        user: 'zeusagencias',
        password: pass,
        options: { encrypt: false, trustServerCertificate: true, connectTimeout: 30000 },
        requestTimeout: 120000
    }).connect();

    console.log('Conexión exitosa. Ejecutando procedimiento con fecha 2026-09-01...');
    const res = await pool.request()
        .input('fecha_inicio', mssql.SmallDateTime, new Date('2026-09-01'))
        .input('fecha_fin', mssql.SmallDateTime, new Date('2026-09-01'))
        .execute('[dbo].[Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas]');

    console.log(`✓ Registros retornados: ${res.recordset.length}`);
    if (res.recordset.length > 0) {
        const r = res.recordset[0];
        console.log('\n--- VERIFICACIÓN DE COLUMNAS DEL VENDEDOR ---');
        console.log('  Vendedor:                     ', r['Vendedor']);
        console.log('  Nombre Vendedor:              ', r['Nombre Vendedor']);
        console.log('  Identificacion del Vendedor:  ', r['Identificacion del Vendedor']);
        console.log('  Tel_vendedor:                 ', r['Tel_vendedor']);
        console.log('  Dir_vendedor:                 ', r['Dir_vendedor']);
        console.log('  Correo_vendedor:              ', r['Correo_vendedor']);

        const countConId = res.recordset.filter(row => row['Identificacion del Vendedor'] && String(row['Identificacion del Vendedor']).trim() !== '').length;
        console.log(`\nRegistros con Identificacion del Vendedor no vacía: ${countConId} de ${res.recordset.length}`);
    }

    await pool.close();
}

test().catch(err => {
    console.error('Error durante la prueba:', err);
    process.exit(1);
});
