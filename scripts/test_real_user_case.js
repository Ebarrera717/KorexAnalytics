const mssql = require('mssql');
const crypto = require('crypto');

async function testUserQuery() {
  const KAX_SECRET = 'Korex_Analytics_Enterprise_Secret_Key_2026_AES256';
  const key = crypto.createHash('sha256').update(KAX_SECRET).digest();
  const inner = '46f1c74044a6c4d8e320a54969d97710:f0f03b214a06349f7bb748cf03d075a2';
  const [ivHex, encHex] = inner.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const colaereoPassword = decipher.update(encHex, 'hex', 'utf8') + decipher.final('utf8');

  const poolRem = new mssql.ConnectionPool({
    user: 'zeusagencias',
    password: colaereoPassword,
    server: '192.168.15.8',
    port: 1433,
    database: 'ZeusAgencias_Colaereo',
    options: { encrypt: false, trustServerCertificate: true },
    requestTimeout: 180000
  });

  await poolRem.connect();
  console.log('Conectado a Colaereo.');

  // Ejecutar el SP con TOP 10 o consultar Facturas
  const res = await poolRem.request().query(`
    SELECT TOP 10 
      F.Documento,
      F.cd_EntVend,
      F.ds_EntVend,
      tkt.id AS tkt_id,
      dbo.fnza_Get_TiqueteFareBasis(tkt.id) AS FAREBASIS
    FROM dbo.fnza_FacturacionMejorada(2, 1, 0, 0, 0, '20260901', '20260905', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '890100577,800095254') AS F
    LEFT JOIN dbo.tiquetes tkt WITH(NOLOCK) ON tkt.cd_tiquete = F.Documento AND tkt.id_fac_factura = F.id
    WHERE F.cd_EntVend = '001' AND dbo.fnza_Get_TiqueteFareBasis(tkt.id) IS NOT NULL
  `);

  console.log('Muestra de tiquetes de American Airlines (cd_EntVend = 001):');
  for (const r of res.recordset) {
    console.log(`Doc: ${r.Documento} | cd_EntVend: ${r.cd_EntVend} | FAREBASIS: ${r.FAREBASIS}`);
  }

  await poolRem.close();
}

testUserQuery().catch(console.error);
