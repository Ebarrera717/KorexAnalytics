const sql = require('mssql');
const fs = require('fs');
const path = require('path');

async function run() {
  const config = {
    server: '127.0.0.1',
    port: 1433,
    user: 'zeusagencias',
    password: 'zzeusagencias',
    database: 'Korex_Analytics',
    options: { encrypt: false, trustServerCertificate: true }
  };
  const pool = await sql.connect(config);
  console.log('Connected to Korex_Analytics');

  // Read SQL/SqlServer/02_Tables.sql and 04_StoredProcedures.sql
  const tablesSql = fs.readFileSync(path.join(__dirname, '..', 'SQL', 'SqlServer', '02_Tables.sql'), 'utf8');
  const spsSql = fs.readFileSync(path.join(__dirname, '..', 'SQL', 'SqlServer', '04_StoredProcedures.sql'), 'utf8');

  // Execute tables batches
  const tableBatches = tablesSql.split(/^\s*GO\s*$/gim);
  for (const batch of tableBatches) {
    const trimmed = batch.trim();
    if (trimmed) {
      await pool.request().query(trimmed);
    }
  }
  console.log('Tables updated in SQL Server');

  // Execute procedures batches
  const spBatches = spsSql.split(/^\s*GO\s*$/gim);
  for (const batch of spBatches) {
    const trimmed = batch.trim();
    if (trimmed) {
      await pool.request().query(trimmed);
    }
  }
  console.log('Stored procedures updated in SQL Server');

  await pool.close();
  console.log('Done!');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
