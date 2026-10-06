const fs = require('fs');
const path = require('path');
const mssql = require('mssql');

// We start from the original Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas.sql (or base)
// Let's get the original FiltroRutas content with git show HEAD:SQL/ZeusERP/Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas.sql
const { execSync } = require('child_process');
const originalFiltroRutas = execSync('git show HEAD:"SQL/ZeusERP/Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas.sql"', { encoding: 'utf8' }).replace(/\r\n/g, '\n');

let content = originalFiltroRutas;

// 1. Variable declaration: Declare @FAREBASIS VARCHAR(MAX)
content = content.replace(
  'Declare @ds_feeocultos VARCHAR(MAX)',
  'Declare @ds_feeocultos VARCHAR(MAX)\n\tDeclare @FAREBASIS VARCHAR(MAX)'
);

// 2. Intermediate projection before FROM(
content = content.replace(
  '\t\t,DivPol_cliente\n\t\t,Especialista\n\tFROM(\t \n\t\tSELECT \n\t\t\tF.Tipo',
  '\t\t,DivPol_cliente\n\t\t,Especialista\n\t\t,FAREBASIS\n\tFROM(\t \n\t\tSELECT \n\t\t\tF.Tipo'
);

// 3. Subquery 1 (Facturas: fnza_FacturacionMejorada)
content = content.replace(
  '\t\t\t ,Especialista = ES.ds_nombre\n\t\t\t FROM dbo.fnza_FacturacionMejorada(',
  '\t\t\t ,Especialista = ES.ds_nombre\n\t\t\t ,FAREBASIS = rtrim(convert(VARCHAR(20),dbo.fnza_Get_TiqueteFareBasis(tkt.id)))\n\t\t\t FROM dbo.fnza_FacturacionMejorada('
);

// 4. Subquery 2 (Remisiones: fnza_RemisionMejorada)
content = content.replace(
  '\t\t\t ,Especialista = ES.ds_nombre\n\t\tFROM dbo.fnza_RemisionMejorada(',
  '\t\t\t ,Especialista = ES.ds_nombre\n\t\t\t ,FAREBASIS = convert(varchar(20),dbo.fnza_Get_TiqueteFareBasis(tkt.id))\n\t\tFROM dbo.fnza_RemisionMejorada('
);

// 5. Subquery 3 (Cotizaciones: Cotizacion CT)
content = content.replace(
  '\t\t\t  ,Especialista = ES.ds_nombre\n\t\t\tFROM dbo.Cotizacion CT ',
  '\t\t\t  ,Especialista = ES.ds_nombre\n\t\t\t  ,FAREBASIS = \'\'1\'\'\n\t\t\tFROM dbo.Cotizacion CT '
);

// 6. Subquery 4 (Notas / Otros: fnza_NotaCreditoParcial)
content = content.replace(
  '\t\t\t  ,Especialista = ES.ds_nombre\n\t\tFROM dbo.fnza_NotaCreditoParcial(',
  '\t\t\t  ,Especialista = ES.ds_nombre\n\t\t\t  ,FAREBASIS = convert(varchar,dbo.fnza_Get_TiqueteFareBasis(tkt.id))\n\t\tFROM dbo.fnza_NotaCreditoParcial('
);

// 7. Outer final SELECT projection
content = content.replace(
  '\t\t,Especialista \n\t\tORDER BY  ',
  '\t\t,Especialista \n\t\t,FAREBASIS\n\t\tORDER BY  '
);

// Verify that all 7 replacements succeeded
const fbChecks = [
  'Declare @FAREBASIS VARCHAR(MAX)',
  ',DivPol_cliente\n\t\t,Especialista\n\t\t,FAREBASIS\n\tFROM(',
  ',FAREBASIS = rtrim(convert(VARCHAR(20),dbo.fnza_Get_TiqueteFareBasis(tkt.id)))',
  ',FAREBASIS = convert(varchar(20),dbo.fnza_Get_TiqueteFareBasis(tkt.id))',
  ",FAREBASIS = ''1''",
  ',FAREBASIS = convert(varchar,dbo.fnza_Get_TiqueteFareBasis(tkt.id))',
  ',Especialista \n\t\t,FAREBASIS\n\t\tORDER BY'
];

fbChecks.forEach((c, idx) => {
  const found = content.includes(c);
  console.log(`Replacement ${idx + 1}: ${found ? '✓ OK' : '✗ FAILED'}`);
  if (!found) throw new Error(`Replacement ${idx + 1} failed!`);
});

// Helper to generate procedure given name and db
function makeProc(procName, dbName = 'ZeusAgencias_23') {
  let sql = content;
  sql = sql.replace(/USE\s+\[.*?\]/i, `USE [${dbName}]`);
  
  const dropRegex = /IF OBJECT_ID\('\[dbo\]\.\[.*?\]', 'P'\) IS NOT NULL[\s\S]*?CREATE PROCEDURE \[dbo\]\.\[.*?\]/i;
  const header = `IF OBJECT_ID('[dbo].[${procName}]', 'P') IS NOT NULL
    DROP PROCEDURE [dbo].[${procName}]
GO

CREATE PROCEDURE [dbo].[${procName}]`;

  return sql.replace(dropRegex, header);
}

// Generate the 3 scripts
const sqlFiltroRutas = makeProc('Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas');
const sqlFiltroRutasSimple = makeProc('VentasDetalladasPorConceptos_FiltroRutas');
const sqlFareBasis = makeProc('Zeus®spze_VentasFareBasis');

// Save files in SQL/ZeusERP
fs.writeFileSync(
  path.join(__dirname, '..', 'SQL', 'ZeusERP', 'Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas.sql'),
  sqlFiltroRutas,
  'utf8'
);

fs.writeFileSync(
  path.join(__dirname, '..', 'SQL', 'ZeusERP', 'farebasis.txt'),
  sqlFareBasis,
  'utf8'
);

console.log('Files written to disk!');

async function deployAndVerify() {
  const pool = new mssql.ConnectionPool({
    server: '127.0.0.1',
    port: 1433,
    user: 'zeusagencias',
    password: 'zzeusagencias',
    database: 'ZeusAgencias_23',
    options: { encrypt: false, trustServerCertificate: true }
  });
  await pool.connect();

  async function execScript(script, name) {
    const batches = script.split(/^GO\s*$/gmi);
    for (let i = 0; i < batches.length; i++) {
      const b = batches[i].trim();
      if (!b) continue;
      await pool.request().query(b);
    }
    console.log(`✓ [dbo].[${name}] compiled cleanly in ZeusAgencias_23!`);
  }

  await execScript(sqlFiltroRutas, 'Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas');
  await execScript(sqlFiltroRutasSimple, 'VentasDetalladasPorConceptos_FiltroRutas');
  await execScript(sqlFareBasis, 'Zeus®spze_VentasFareBasis');

  // Verify objects and definitions in DB
  const res = await pool.request().query(`
    SELECT sp.name, sm.definition
    FROM sys.procedures sp
    INNER JOIN sys.sql_modules sm ON sm.object_id = sp.object_id
    WHERE sp.name IN (
      'Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas', 
      'VentasDetalladasPorConceptos_FiltroRutas', 
      'Zeus®spze_VentasFareBasis'
    )
    ORDER BY sp.name
  `);

  console.log('\n--- VERIFICATION IN DATABASE ZeusAgencias_23 ---');
  res.recordset.forEach(r => {
    const def = r.definition;
    console.log(`Procedure: [dbo].[${r.name}]`);
    console.log(`  Length: ${def.length} chars`);
    console.log(`  FAREBASIS occurrences in definition: ${(def.match(/FAREBASIS/gi) || []).length}`);
    console.log(`  Rutas filter occurrences in definition: ${(def.match(/CiudadOrigen|SegundaCiudad|CiudadItinerario/gi) || []).length}`);
    console.log(`  Especialista occurrences in definition: ${(def.match(/Especialista/gi) || []).length}`);
  });

  await pool.close();
}

deployAndVerify().catch(err => {
  console.error('Deployment error:', err);
  process.exit(1);
});
