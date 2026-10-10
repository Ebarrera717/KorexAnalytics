const mssql = require('mssql');
const { Client: PgClient } = require('pg');

async function runAcceptanceTests() {
  console.log('============================================================================');
  console.log('       SUITE DE PRUEBAS DE ACEPTACIÓN INTEGRAL: FARE BASIS REAL');
  console.log('============================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(desc, condition, details = '') {
    if (condition) {
      console.log(`  [OK] ${desc} ${details ? '(' + details + ')' : ''}`);
      passed++;
    } else {
      console.error(`  [FALLO] ${desc} ${details ? '(' + details + ')' : ''}`);
      failed++;
    }
  }

  // 1. Conexión a SQL Server Korex_Analytics y ZeusAgencias_23
  const poolInternal = new mssql.ConnectionPool({
    user: 'zeusagencias',
    password: 'zzeusagencias',
    server: '127.0.0.1',
    port: 1433,
    database: 'Korex_Analytics',
    options: { encrypt: false, trustServerCertificate: true }
  });
  await poolInternal.connect();

  const poolZeus = new mssql.ConnectionPool({
    user: 'zeusagencias',
    password: 'zzeusagencias',
    server: '127.0.0.1',
    port: 1433,
    database: 'ZeusAgencias_23',
    options: { encrypt: false, trustServerCertificate: true }
  });
  await poolZeus.connect();

  console.log('[ESCENARIO 1] Configuración de American Airlines (001, pos 3, long 2)');
  const resRule = await poolInternal.request().query(`
    SELECT airlineCode, airlineName, startPos, length, separator, isActive
    FROM dbo.KAX_FareBasisRule
    WHERE airlineCode = '001'
  `);
  const rule001 = resRule.recordset[0];
  assert('Regla de American Airlines existe en BD interna', !!rule001);
  assert('Posición inicial es 3', rule001 && rule001.startPos === 3);
  assert('Longitud de extracción es 2', rule001 && rule001.length === 2);
  assert('Separador por defecto es "/"', rule001 && rule001.separator === '/');
  assert('Regla está activa', rule001 && rule001.isActive === true);

  console.log('\n[ESCENARIO 2] Generación de 2A/2A a partir de JA2AA/JA2AA (SQL Server)');
  const resSqlAA = await poolZeus.request().query(`
    SELECT dbo.fnza_Get_TiqueteFarebasisReal(999, 'JA2AA/JA2AA', '0011234567') AS calcAA;
  `);
  const valAA = resSqlAA.recordset[0]?.calcAA;
  assert('Extracción de JA2AA/JA2AA con pos 3 y len 2 retorna exactamente 2A/2A', valAA === '2A/2A', `Obtenido: "${valAA}"`);

  console.log('\n[ESCENARIO 3] Validación de Equivalencia con PostgreSQL');
  const pgClient = new PgClient({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'postgres'
  });
  let pgConnected = false;
  try {
    await pgClient.connect();
    pgConnected = true;
    const pgRes = await pgClient.query(`
      SELECT public.fnkax_calcularfarebasisreal('JA2AA/JA2AA', 3, 2, '/') AS val;
    `);
    const pgVal = pgRes.rows[0]?.val;
    assert('PostgreSQL fnkax_calcularfarebasisreal retorna exactamente 2A/2A', pgVal === '2A/2A', `Obtenido: "${pgVal}"`);
    assert('Paridad 100% entre T-SQL y PL/pgSQL', valAA === pgVal, `SQL Server: "${valAA}", Postgres: "${pgVal}"`);
  } catch (pgErr) {
    console.warn('PostgreSQL sandbox offline en esta máquina, omitiendo capa sandbox PG:', pgErr.message);
  } finally {
    if (pgConnected) await pgClient.end();
  }

  console.log('\n[ESCENARIO 4] Extracción Multi-Segmento Compleja');
  const resMulti = await poolZeus.request().query(`
    SELECT dbo.fnKAX_CalcularFarebasisReal('UNNN0ACN/XX52AA/ENNK6QCN/ZZ99', 1, 3, '/') AS resMulti;
  `);
  const valMulti = resMulti.recordset[0]?.resMulti;
  assert('Segmentos múltiples 4 tramos extraídos correctamente', valMulti === 'UNN/XX5/ENN/ZZ9', `Obtenido: "${valMulti}"`);

  console.log('\n[ESCENARIO 5] Ausencia de Configuración, Nulos y Segmentos Incompletos');
  const resFallback = await poolZeus.request().query(`
    SELECT 
      dbo.fnza_Get_TiqueteFarebasisReal(1, 'ORIGINAL_TEST/SEG2', '9999999999') AS sinRegla,
      dbo.fnza_Get_TiqueteFarebasisReal(1, NULL, '0011234567') AS conNulo,
      dbo.fnza_Get_TiqueteFarebasisReal(1, '', '0011234567') AS conVacio,
      dbo.fnKAX_CalcularFarebasisReal('J', 3, 2, '/') AS incompleto;
  `);
  const rowFall = resFallback.recordset[0];
  assert('Sin regla activa: conserva valor original (ORIGINAL_TEST/SEG2)', rowFall.sinRegla === 'ORIGINAL_TEST/SEG2');
  assert('Valor NULL se preserva como NULL', rowFall.conNulo === null);
  assert('Cadena vacía se preserva como vacía', rowFall.conVacio === '');
  assert('Segmento más corto que startPos no genera error', rowFall.incompleto === '');

  console.log('\n[ESCENARIO 6] Preservación de la Columna Original Fare Basis en el SP');
  const resSpTest = await poolZeus.request().query(`
    EXEC [dbo].[Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas]
      @fecha_inicio = '2026-10-01',
      @fecha_fin = '2026-10-02';
  `);
  const cols = resSpTest.recordset && resSpTest.recordset.length > 0 ? Object.keys(resSpTest.recordset[0]) : [];
  assert('Columna original FAREBASIS presente en el reporte', cols.includes('FAREBASIS'));
  assert('Nueva columna FarebasisReal presente en el reporte', cols.includes('FarebasisReal'));

  console.log('\n[ESCENARIO 7] Filtro por FarebasisReal en el SP');
  // Probar filtro con 'Todos' o NULL (no restringe)
  const resTodos = await poolZeus.request().query(`
    EXEC [dbo].[Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas]
      @fecha_inicio = '2026-10-01',
      @fecha_fin = '2026-10-02',
      @cd_FarebasisReal = 'Todos';
  `);
  const countTodos = resTodos.recordset?.length || 0;
  assert('Opción "Todos" no restringe registros y coincide con ejecución general', countTodos === (resSpTest.recordset?.length || 0));

  // Probar filtro con valor inexistente (debe retornar 0)
  const resInexistente = await poolZeus.request().query(`
    EXEC [dbo].[Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas]
      @fecha_inicio = '2026-10-01',
      @fecha_fin = '2026-10-02',
      @cd_FarebasisReal = 'VALOR_QUE_NO_EXISTE_999';
  `);
  assert('Filtro por valor no coincidente retorna 0 registros limpiamente', (resInexistente.recordset?.length || 0) === 0);

  console.log('\n[ESCENARIO 8] Modificación de Configuración en Vivo');
  // Cambiar regla temporalmente de American Airlines a startPos 1, len 2
  await poolInternal.request().query(`
    UPDATE dbo.KAX_FareBasisRule SET startPos = 1, length = 2 WHERE airlineCode = '001';
  `);
  // En ZeusAgencias_23 sincronizar
  await poolZeus.request().query(`
    UPDATE dbo.KAX_FareBasisRule SET startPos = 1, length = 2 WHERE airlineCode = '001';
  `);
  const resMod = await poolZeus.request().query(`
    SELECT dbo.fnza_Get_TiqueteFarebasisReal(999, 'JA2AA/JA2AA', '0011234567') AS calcMod;
  `);
  assert('Modificación de regla (pos 1, len 2) produce JA/JA en tiempo real', resMod.recordset[0]?.calcMod === 'JA/JA');

  // Restaurar regla oficial (pos 3, len 2)
  await poolInternal.request().query(`
    UPDATE dbo.KAX_FareBasisRule SET startPos = 3, length = 2 WHERE airlineCode = '001';
  `);
  await poolZeus.request().query(`
    UPDATE dbo.KAX_FareBasisRule SET startPos = 3, length = 2 WHERE airlineCode = '001';
  `);
  const resRestored = await poolZeus.request().query(`
    SELECT dbo.fnza_Get_TiqueteFarebasisReal(999, 'JA2AA/JA2AA', '0011234567') AS calcRestored;
  `);
  assert('Restauración a regla oficial (pos 3, len 2) produce 2A/2A', resRestored.recordset[0]?.calcRestored === '2A/2A');

  await poolInternal.close();
  await poolZeus.close();

  console.log('\n============================================================================');
  console.log(`RESULTADOS TOTALES: ${passed} APROBADOS, ${failed} FALLIDOS (TOTAL: ${passed + failed})`);
  console.log('============================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAcceptanceTests().catch(err => {
  console.error('Error durante pruebas:', err);
  process.exit(1);
});
