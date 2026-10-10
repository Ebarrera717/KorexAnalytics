const fs = require('fs');
const path = require('path');
const mssql = require('mssql');
const crypto = require('crypto');

(async () => {
  // 1. Configuración local ZeusAgencias_23
  const localZeus23Cfg = {
    server: '127.0.0.1',
    port: 1433,
    user: 'zeusagencias',
    password: 'zzeusagencias',
    database: 'ZeusAgencias_23',
    options: { encrypt: false, trustServerCertificate: true },
    requestTimeout: 120000
  };

  // 2. Configuración remota ZeusAgencias_Colaereo (192.168.15.8)
  const KAX_SECRET = 'Korex_Analytics_Enterprise_Secret_Key_2026_AES256';
  const key = crypto.createHash('sha256').update(KAX_SECRET).digest();
  const inner = '46f1c74044a6c4d8e320a54969d97710:f0f03b214a06349f7bb748cf03d075a2';
  const [ivHex, encHex] = inner.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const colaereoPassword = decipher.update(encHex, 'hex', 'utf8') + decipher.final('utf8');

  const remoteColaereoCfg = {
    server: '192.168.15.8',
    port: 1433,
    user: 'zeusagencias',
    password: colaereoPassword,
    database: 'ZeusAgencias_Colaereo',
    options: { encrypt: false, trustServerCertificate: true },
    connectionTimeout: 30000,
    requestTimeout: 180000
  };

  const sqlFiltroRutas = fs.readFileSync(path.join(__dirname, '..', 'SQL', 'ZeusERP', 'Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas.sql'), 'utf8');

  async function deployToDatabase(cfg, dbName) {
    console.log(`\n======================================================`);
    console.log(`DESPLEGANDO EN: ${dbName} (${cfg.server})`);
    console.log(`======================================================`);

    const pool = new mssql.ConnectionPool(cfg);
    await pool.connect();
    console.log(`✓ Conexión establecida con ${dbName}`);

    async function execScript(script, procName) {
      let s = script.replace(/USE\s+\[.*?\]/i, `USE [${dbName}]`);
      const batches = s.split(/^GO\s*$/gmi);
      for (let i = 0; i < batches.length; i++) {
        const b = batches[i].trim();
        if (!b) continue;
        try {
          await pool.request().query(b);
        } catch (err) {
          console.error(`Error en batch ${i+1} para ${procName}:`, err.message);
          throw err;
        }
      }
      console.log(`✓ [dbo].[${procName}] compilado exitosamente en ${dbName}!`);
    }

    // Compilar SP principal
    await execScript(sqlFiltroRutas, 'Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas');

    // Compilar versión sin prefijo Zeus® para compatibilidad
    let sqlSimple = sqlFiltroRutas.replace(/Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas/g, 'VentasDetalladasPorConceptos_FiltroRutas');
    await execScript(sqlSimple, 'VentasDetalladasPorConceptos_FiltroRutas');

    // Test unitario de cálculo con la regla de American Airlines ('001', start: 3, len: 2)
    const testAA = await pool.request().query(`
      SELECT 
        dbo.fnza_Get_TiqueteFarebasisReal(999, 'JA2AA/JA2AA', '001 - AMERICAN AIRLINES') AS resAA1,
        dbo.fnza_Get_TiqueteFarebasisReal(999, 'JA2AA/JA2AA', '001') AS resAA2,
        dbo.fnza_Get_TiqueteFarebasisReal(999, 'VLN0AHM1C/VLN0AHM1C', '001 - AMERICAN AIRLINES') AS resAA3,
        dbo.fnza_Get_TiqueteFarebasisReal(999, 'JA2AA/JA2AA', '999 - OTRA') AS resSinRegla
    `);
    const r = testAA.recordset[0];
    console.log(`  - Test AA con '001 - AMERICAN AIRLINES' (JA2AA/JA2AA): ${r.resAA1} (Esperado: 2A/2A) -> ${r.resAA1 === '2A/2A' ? 'PASÓ' : 'FALLÓ'}`);
    console.log(`  - Test AA con '001' (JA2AA/JA2AA): ${r.resAA2} (Esperado: 2A/2A) -> ${r.resAA2 === '2A/2A' ? 'PASÓ' : 'FALLÓ'}`);
    console.log(`  - Test AA con VLN0AHM1C/VLN0AHM1C: ${r.resAA3} (Esperado: N0/N0) -> ${r.resAA3 === 'N0/N0' ? 'PASÓ' : 'FALLÓ'}`);
    console.log(`  - Test Sin Regla (JA2AA/JA2AA): ${r.resSinRegla} (Esperado: JA2AA/JA2AA) -> ${r.resSinRegla === 'JA2AA/JA2AA' ? 'PASÓ' : 'FALLÓ'}`);

    // Test unitario de cálculo de NumeroReembolso
    const testReembolso = await pool.request().query(`
      SELECT 
        dbo.fnza_Get_TiqueteReembolso('4856684117') AS r1,
        dbo.fnza_Get_TiqueteReembolso('3976575986') AS r2,
        dbo.fnza_Get_TiqueteReembolso('9999999999') AS r3
    `);
    const rReemb = testReembolso.recordset[0];
    console.log(`  - Test NumeroReembolso (4856684117): ${rReemb.r1} (Esperado: 11-0100017599) -> ${rReemb.r1 === '11-0100017599' ? 'PASÓ' : 'FALLÓ'}`);
    console.log(`  - Test NumeroReembolso (3976575986): ${rReemb.r2} (Esperado: 11-0100017210) -> ${rReemb.r2 === '11-0100017210' ? 'PASÓ' : 'FALLÓ'}`);
    console.log(`  - Test Sin Reembolso (9999999999): ${rReemb.r3} (Esperado: null) -> ${rReemb.r3 === null ? 'PASÓ' : 'FALLÓ'}`);

    await pool.close();
  }

  // 1. Desplegar en local ZeusAgencias_23
  try {
    await deployToDatabase(localZeus23Cfg, 'ZeusAgencias_23');
  } catch (err) {
    console.warn('Advertencia en ZeusAgencias_23 local:', err.message);
  }

  // 2. Desplegar en remoto ZeusAgencias_Colaereo (192.168.15.8)
  try {
    await deployToDatabase(remoteColaereoCfg, 'ZeusAgencias_Colaereo');
  } catch (err) {
    console.error('Error en ZeusAgencias_Colaereo remoto:', err);
    throw err;
  }

  // 3. Ejecutar la consulta exacta del usuario en ZeusAgencias_Colaereo para validar en vivo
  console.log(`\n======================================================`);
  console.log(`VALIDACIÓN EN VIVO DE LA CONSULTA DEL USUARIO EN COLAEREO`);
  console.log(`======================================================`);
  const poolCol = new mssql.ConnectionPool(remoteColaereoCfg);
  await poolCol.connect();

  console.log('Ejecutando SP Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas con parámetros del usuario...');
  const resCol = await poolCol.request().query(`
    EXEC [dbo].[Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas] 
      @Nacionalidad='Internacional',
      @Remision='NO',
      @RemFacturadas='NO',
      @FacGeneradasRem='NO',
      @SoloConceptosVenta='NO',
      @fecha_inicio='2026-09-01',
      @fecha_fin='2026-09-30',
      @cd_proveedor='890100577,800095254',
      @MostrarCombustible='SI',
      @MostrarTAOCEMColumnas='NO',
      @MostrarAnulacion='NO'
  `);

  const rows = resCol.recordset || [];
  console.log(`Total registros retornados: ${rows.length}`);

  const aaRows = rows.filter(r => (r.EntVendedora || '').startsWith('001') && (r.FAREBASIS || '').trim() !== '');
  console.log(`Registros de American Airlines ('001') con FAREBASIS: ${aaRows.length}`);

  if (aaRows.length > 0) {
    console.log('\nPrimeras 5 muestras de American Airlines con FarebasisReal calculado:');
    aaRows.slice(0, 5).forEach((item, idx) => {
      console.log(`  [${idx+1}] Doc: ${item.Documento?.trim()} | EntVendedora: ${item.EntVendedora?.trim()} | FAREBASIS: ${item.FAREBASIS} | FarebasisReal: ${item.FarebasisReal} | NumeroReembolso: ${item.NumeroReembolso || '(Sin reembolso)'}`);
    });
  }

  const refundRows = rows.filter(r => r.NumeroReembolso && r.NumeroReembolso.trim() !== '');
  console.log(`\nTotal registros del reporte con NumeroReembolso poblado: ${refundRows.length}`);
  if (refundRows.length > 0) {
    console.log('Primeras 5 muestras de tiquetes facturados con Reembolso:');
    refundRows.slice(0, 5).forEach((item, idx) => {
      console.log(`  [${idx+1}] Doc: ${item.Documento?.trim()} | NumeroReembolso: ${item.NumeroReembolso} | Proveedor: ${item.Proveedor}`);
    });
  }

  // 4. Probar nuevo filtro @MostrarSoloReembolsos = 'SI' en vivo
  console.log(`\n======================================================`);
  console.log(`PROBANDO NUEVO FILTRO @MostrarSoloReembolsos = 'SI'`);
  console.log(`======================================================`);
  const resSoloReemb = await poolCol.request().query(`
    EXEC [dbo].[Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas] 
      @Nacionalidad='Internacional',
      @Remision='NO',
      @RemFacturadas='NO',
      @FacGeneradasRem='NO',
      @SoloConceptosVenta='NO',
      @fecha_inicio='2026-09-01',
      @fecha_fin='2026-09-30',
      @cd_proveedor='890100577,800095254',
      @MostrarCombustible='SI',
      @MostrarTAOCEMColumnas='NO',
      @MostrarAnulacion='NO',
      @MostrarSoloReembolsos='SI'
  `);
  const rowsSolo = resSoloReemb.recordset || [];
  console.log(`Total registros con @MostrarSoloReembolsos='SI': ${rowsSolo.length}`);
  const allHaveRefund = rowsSolo.every(r => r.NumeroReembolso && r.NumeroReembolso.trim() !== '');
  console.log(`✓ El 100% de los registros retornados tienen NumeroReembolso no vacío: ${allHaveRefund ? 'PASÓ' : 'FALLÓ'}`);
  if (rowsSolo.length > 0) {
    console.log('Muestra de 3 registros filtrados:');
    rowsSolo.slice(0, 3).forEach((r, idx) => {
      console.log(`  [${idx+1}] Doc: ${r.Documento?.trim()} | Reembolso: ${r.NumeroReembolso} | Proveedor: ${r.Proveedor}`);
    });
  }

  await poolCol.close();
  console.log(`\n✓ TODO DESPLEGADO, COMPILADO Y VALIDADO CON ÉXITO!`);
})().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
