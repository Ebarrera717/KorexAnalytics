const mssql = require('mssql');
const crypto = require('crypto');

async function testQuery() {
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
    connectionTimeout: 10000
  });

  await poolRem.connect();

  const query = `
    SELECT TOP 5 
      F.Documento,
      F.cd_EntVend,
      EV.cd_codigo AS ev_codigo,
      EV.ds_nombre AS ev_nombre,
      tkt.id AS tkt_id,
      tkt.cd_tiquete,
      dbo.fnza_Get_TiqueteFareBasis(tkt.id) AS raw_fb
    FROM dbo.fnza_FacturacionMejorada(2, 1, 0, 0, 0, '20260901', '20260905', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '890100577,800095254') AS F
    LEFT JOIN dbo.tiquetes tkt WITH(NOLOCK) ON tkt.cd_tiquete = F.Documento AND tkt.id_fac_factura = F.id
    LEFT JOIN Entidades EV WITH(NOLOCK) ON EV.cd_codigo = F.cd_EntVend
    WHERE F.cd_EntVend LIKE '%001%' OR EV.ds_nombre LIKE '%AMERICAN%'
  `;

  const res = await poolRem.request().query(query);
  console.log('Resultados de prueba:');
  console.log(res.recordset);

  await poolRem.close();
}

testQuery().catch(console.error);
