const mssql = require('mssql');

(async () => {
  console.log('--- 1. VERIFICANDO BASE INTERNA Korex_Analytics ---');
  const poolInternal = new mssql.ConnectionPool({
    user: 'zeusagencias',
    password: 'zzeusagencias',
    server: '127.0.0.1',
    port: 1433,
    database: 'Korex_Analytics',
    options: { encrypt: false, trustServerCertificate: true }
  });
  await poolInternal.connect();
  const res1 = await poolInternal.request().query('SELECT COUNT(*) AS totalReglas FROM dbo.KAX_FareBasisRule');
  console.log('Korex_Analytics -> KAX_FareBasisRule registros:', res1.recordset[0].totalReglas);

  const res1b = await poolInternal.request().query(
    "SELECT name FROM sys.procedures WHERE name IN ('spKAX_FareBasisRuleListar', 'spKAX_FareBasisRuleGuardar', 'spKAX_FareBasisRuleEliminar')"
  );
  console.log('Korex_Analytics -> Procedimientos CRUD:', res1b.recordset.map(r => r.name));
  await poolInternal.close();

  console.log('\n--- 2. VERIFICANDO BASE ERP ZeusAgencias_23 ---');
  const poolZeus = new mssql.ConnectionPool({
    user: 'zeusagencias',
    password: 'zzeusagencias',
    server: '127.0.0.1',
    port: 1433,
    database: 'ZeusAgencias_23',
    options: { encrypt: false, trustServerCertificate: true }
  });
  await poolZeus.connect();
  const res2 = await poolZeus.request().query('SELECT COUNT(*) AS totalReglas FROM dbo.KAX_FareBasisRule');
  console.log('ZeusAgencias_23 -> KAX_FareBasisRule registros:', res2.recordset[0].totalReglas);

  const res2b = await poolZeus.request().query(
    "SELECT name, type_desc FROM sys.objects WHERE name IN ('fnKAX_CalcularFarebasisReal', 'fnza_Get_TiqueteFarebasisReal', 'Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas', 'VentasDetalladasPorConceptos_FiltroRutas')"
  );
  console.log('ZeusAgencias_23 -> Objetos activos:', res2b.recordset);

  const res2c = await poolZeus.request().query(
    "SELECT p.name, t.name AS tipo FROM sys.parameters p JOIN sys.types t ON p.user_type_id = t.user_type_id WHERE p.object_id = OBJECT_ID('dbo.Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas') AND (p.name LIKE '%Farebasis%' OR p.name LIKE '%FareBasis%')"
  );
  console.log('ZeusAgencias_23 -> Parámetros Farebasis en SP:', res2c.recordset);
  await poolZeus.close();

  console.log('\n--- 3. VERIFICANDO SERVIDOR REMOTO COLAEREO (192.168.15.8) ---');
  try {
    const crypto = require('crypto');
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
      connectionTimeout: 3000
    });
    await poolRem.connect();
    console.log('Servidor Remoto Colaereo -> Conectado exitosamente');

    // Desplegar también si hiciera falta
    const fs = require('fs');
    const path = require('path');
    const sqlFiltroRutas = fs.readFileSync(path.join(__dirname, '..', 'SQL', 'ZeusERP', 'Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas.sql'), 'utf8');
    let s = sqlFiltroRutas.replace(/USE\s+\[.*?\]/i, 'USE [ZeusAgencias_Colaereo]');
    const batches = s.split(/^GO\s*$/gmi);
    for (let b of batches) {
      if (b.trim()) await poolRem.request().query(b.trim());
    }
    let sqlSimple = s.replace(/Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas/g, 'VentasDetalladasPorConceptos_FiltroRutas');
    for (let b of sqlSimple.split(/^GO\s*$/gmi)) {
      if (b.trim()) await poolRem.request().query(b.trim());
    }
    console.log('Servidor Remoto Colaereo -> Procedimientos y funciones sincronizados al 100%');
    await poolRem.close();
  } catch (remErr) {
    console.log('Servidor Remoto Colaereo:', remErr.message);
  }

  console.log('\n--- VERIFICACIÓN COMPLETADA ---');
})();
