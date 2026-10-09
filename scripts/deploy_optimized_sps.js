const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mssql = require('mssql');

const KAX_SECRET = 'Korex_Analytics_Enterprise_Secret_Key_2026_AES256';
const key = crypto.createHash('sha256').update(KAX_SECRET).digest();
const inner = '46f1c74044a6c4d8e320a54969d97710:f0f03b214a06349f7bb748cf03d075a2';
const [ivHex, encHex] = inner.split(':');
const iv = Buffer.from(ivHex, 'hex');
const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
const colaereoPassword = decipher.update(encHex, 'hex', 'utf8') + decipher.final('utf8');

// Load SQL file contents
const sqlFiltroRutas = fs.readFileSync(path.join(__dirname, '..', 'SQL', 'ZeusERP', 'Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas.sql'), 'utf8');
const sqlFareBasis = fs.readFileSync(path.join(__dirname, '..', 'SQL', 'ZeusERP', 'farebasis.txt'), 'utf8');

async function deployToServer(serverConfig, label) {
  console.log(`\n======================================================`);
  console.log(`DESPLEGANDO EN: ${label} (${serverConfig.server} / ${serverConfig.database})`);
  console.log(`======================================================`);

  const pool = new mssql.ConnectionPool(serverConfig);
  await pool.connect();

  async function execScript(script, procName) {
    // Replace USE statement with the target DB
    let s = script.replace(/USE\s+\[.*?\]/i, `USE [${serverConfig.database}]`);
    const batches = s.split(/^GO\s*$/gmi);
    for (let i = 0; i < batches.length; i++) {
      const b = batches[i].trim();
      if (!b) continue;
      try {
        await pool.request().query(b);
      } catch (err) {
        console.error(`Error in ${procName} batch ${i+1}:`, err.message);
        throw err;
      }
    }
    console.log(`✓ [dbo].[${procName}] compilado exitosamente en ${label}!`);
  }

  // 1. Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas
  await execScript(sqlFiltroRutas, 'Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas');

  // 2. VentasDetalladasPorConceptos_FiltroRutas
  let sqlSimple = sqlFiltroRutas.replace(
    /IF OBJECT_ID\('\[dbo\]\.\[.*?\]', 'P'\) IS NOT NULL[\s\S]*?CREATE PROCEDURE \[dbo\]\.\[.*?\]/i,
    `IF OBJECT_ID('[dbo].[VentasDetalladasPorConceptos_FiltroRutas]', 'P') IS NOT NULL
    DROP PROCEDURE [dbo].[VentasDetalladasPorConceptos_FiltroRutas]
GO

CREATE PROCEDURE [dbo].[VentasDetalladasPorConceptos_FiltroRutas]`
  );
  await execScript(sqlSimple, 'VentasDetalladasPorConceptos_FiltroRutas');

  // 3. Zeus®spze_VentasFareBasis
  await execScript(sqlFareBasis, 'Zeus®spze_VentasFareBasis');

  // Verificar parámetros detectados
  const paramsRes = await pool.request().query(`
    SELECT p.name AS param_name, t.name AS type_name
    FROM sys.parameters p
    JOIN sys.types t ON p.user_type_id = t.user_type_id
    WHERE p.object_id = OBJECT_ID('dbo.Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas')
    ORDER BY p.parameter_id
  `);
  console.log(`\nParámetros activos en dbo.Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas (${paramsRes.recordset.length}):`);
  paramsRes.recordset.filter(p => p.param_name.includes('salida') || p.param_name.includes('llegada') || p.param_name.includes('Ciudad')).forEach(p => {
    console.log(`  - ${p.param_name} (${p.type_name})`);
  });

  await pool.close();
}

async function runBenchmark(serverConfig) {
  console.log(`\n======================================================`);
  console.log(`PROBANDO TIEMPO DE RESPUESTA EN SERVIDOR COLAEREO`);
  console.log(`======================================================`);

  const pool = new mssql.ConnectionPool({
    ...serverConfig,
    requestTimeout: 180000
  });
  await pool.connect();

  console.log('1. Ejecutando sin filtros de vuelo (Rango general)...');
  const t0 = Date.now();
  const res1 = await pool.request().query(`
    EXEC [dbo].[Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas]
      @fecha_inicio = '2026-10-01',
      @fecha_fin = '2026-10-06';
  `);
  const d0 = Date.now() - t0;
  console.log(`-> Filas retornadas: ${res1.recordset ? res1.recordset.length : 0} en ${d0} ms`);
  if (res1.recordset && res1.recordset.length > 0) {
    console.log('Ejemplo de fila retornada:');
    console.log('  Documento:', res1.recordset[0].Documento);
    console.log('  Servicio:', res1.recordset[0].Servicio);
    console.log('  Vuelo:', res1.recordset[0].Vuelo);
    console.log('  Aerolinea:', res1.recordset[0].Aerolinea);
    console.log('  CombinacionAerolinea:', res1.recordset[0].CombinacionAerolinea);
    console.log('  Revisado:', res1.recordset[0].Revisado);
    console.log('  FAREBASIS:', res1.recordset[0].FAREBASIS);
  }

  // Muestra de ordenamiento por aerolínea
  const conAero = (res1.recordset || []).filter(r => r.Aerolinea && r.Aerolinea.trim() !== '');
  console.log(`\n-> Registros con Aerolinea poblada: ${conAero.length}`);
  const mismas = conAero.filter(r => r.CombinacionAerolinea === 'Misma Aerolínea');
  const combinadas = conAero.filter(r => r.CombinacionAerolinea === 'Combinada');
  console.log(`  - Misma Aerolínea (salen primero): ${mismas.length}`);
  console.log(`  - Combinadas (salen después): ${combinadas.length}`);
  if (mismas.length > 0) {
    console.log('  Muestra PRIMEROS (Misma Aerolínea):');
    mismas.slice(0, 3).forEach((v, idx) => {
      console.log(`    [${idx+1}] Doc: ${v.Documento} | Aerolinea: ${v.Aerolinea} | Vuelo: ${v.Vuelo} | Tipo: ${v.CombinacionAerolinea}`);
    });
  }
  if (combinadas.length > 0) {
    console.log('  Muestra DESPUÉS (Combinadas):');
    combinadas.slice(0, 3).forEach((v, idx) => {
      console.log(`    [${idx+1}] Doc: ${v.Documento} | Aerolinea: ${v.Aerolinea} | Vuelo: ${v.Vuelo} | Tipo: ${v.CombinacionAerolinea}`);
    });
  }

  console.log('\n2. Probando filtro de Fare Basis (@cd_FareBasis)...');
  const tFb = Date.now();
  const resFb = await pool.request().query(`
    EXEC [dbo].[Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas]
      @fecha_inicio = '2026-10-01',
      @fecha_fin = '2026-10-06',
      @cd_FareBasis = 'HAAAOZ2S,KESB2BRQ';
  `);
  const dFb = Date.now() - tFb;
  console.log(`-> Filas con Fare Basis filtrado: ${resFb.recordset ? resFb.recordset.length : 0} en ${dFb} ms`);

  console.log('\n3. Probando filtro de Solo Revisados (@MostrarSoloRevisados = "SI")...');
  const tRev = Date.now();
  const resRev = await pool.request().query(`
    EXEC [dbo].[Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas]
      @fecha_inicio = '2026-10-01',
      @fecha_fin = '2026-10-06',
      @MostrarSoloRevisados = 'SI';
  `);
  const dRev = Date.now() - tRev;
  console.log(`-> Filas con Solo Revisados = SI: ${resRev.recordset ? resRev.recordset.length : 0} en ${dRev} ms`);
  if (resRev.recordset && resRev.recordset.length > 0) {
    console.log(`  Muestra Revisado: Doc ${resRev.recordset[0].Documento} -> Revisado: ${resRev.recordset[0].Revisado}`);
  }

  console.log('\n4. Probando filtro País Origen (@cd_PaisOrigen = "CO")...');
  const tPo = Date.now();
  const resPo = await pool.request().query(`
    EXEC [dbo].[Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas]
      @fecha_inicio = '2026-10-01',
      @fecha_fin = '2026-10-06',
      @cd_PaisOrigen = 'CO';
  `);
  const dPo = Date.now() - tPo;
  console.log(`-> Filas con País Origen CO: ${resPo.recordset ? resPo.recordset.length : 0} en ${dPo} ms`);

  console.log('\n5. Probando filtro País Itinerario (@cd_PaisItinerario = "ES")...');
  const tPi = Date.now();
  const resPi = await pool.request().query(`
    EXEC [dbo].[Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas]
      @fecha_inicio = '2026-10-01',
      @fecha_fin = '2026-10-06',
      @cd_PaisItinerario = 'ES';
  `);
  const dPi = Date.now() - tPi;
  console.log(`-> Filas con País Itinerario ES: ${resPi.recordset ? resPi.recordset.length : 0} en ${dPi} ms`);
  if (resPi.recordset && resPi.recordset.length > 0) {
    console.log(`  Muestra ES: Doc ${resPi.recordset[0].Documento} | Ruta: ${resPi.recordset[0].Servicio}`);
  }

  await pool.close();
}

async function main() {
  const colaereoCfg = {
    server: '192.168.15.8',
    port: 1433,
    user: 'zeusagencias',
    password: colaereoPassword,
    database: 'ZeusAgencias_Colaereo',
    options: { encrypt: false, trustServerCertificate: true }
  };

  const localZeus23Cfg = {
    server: '127.0.0.1',
    port: 1433,
    user: 'zeusagencias',
    password: 'zzeusagencias',
    database: 'ZeusAgencias_23',
    options: { encrypt: false, trustServerCertificate: true }
  };

  // Desplegar en ambos servidores
  await deployToServer(colaereoCfg, 'Servidor Colaereo (192.168.15.8)');
  await deployToServer(localZeus23Cfg, 'Servidor Local ZeusAgencias_23 (127.0.0.1)');

  // Probar rendimiento
  await runBenchmark(colaereoCfg);
  
  console.log('\n¡Despliegue y validación de optimización completados con éxito al 100%!');
}

main().catch(err => {
  console.error('Error durante el despliegue:', err);
  process.exit(1);
});
