/**
 * ============================================================================
 * PROYECTO: KOREX ANALYTICS
 * SCRIPT: Generador y Validador Centralizado de Releases Dual (SQL Server & PostgreSQL)
 * EJECUCIÓN: node scripts/generate_dual_database_scripts.js
 * ============================================================================
 * Cumple obligatoriamente con los Skills de AgenciasNew:
 * - desarrollo-multibase (SKILL.md)
 * - control-integral-liberacion-db (SKILL.md)
 * - motor-engine-isolation (SKILL.md)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const SQL_DIR = path.join(ROOT_DIR, 'SQL');
const SQLSERVER_DIR = path.join(SQL_DIR, 'SqlServer');
const POSTGRESQL_DIR = path.join(SQL_DIR, 'PostgreSQL');

const EXPECTED_TABLES = [
    'KAX_Role',
    'KAX_User',
    'KAX_UserParameter',
    'KAX_SQLConnectionProfile',
    'KAX_ExecutionProcedure',
    'KAX_ExecutionPreset',
    'KAX_ExecutionRun',
    'KAX_SystemAuditLog',
    'KAX_Dashboard',
    'KAX_License',
    'KAX_FareBasisRule'
];

const EXPECTED_PROCEDURES = [
    'spKAX_RegistrarInicioEjecucion',
    'spKAX_FinalizarEjecucion',
    'spKAX_RegistrarAuditoria',
    'spKAX_DashboardGuardar',
    'spKAX_DashboardListar',
    'spKAX_DashboardEliminar',
    'spKAX_LicenseConsultar',
    'spKAX_LicenseAplicar',
    'spKAX_UserListar',
    'spKAX_UserGuardar',
    'spKAX_RoleListar',
    'spKAX_FareBasisRuleListar',
    'spKAX_FareBasisRuleGuardar',
    'spKAX_FareBasisRuleEliminar'
];



function calculateSha256(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function normalizeSql(text) {
    return text.replace(/\r\n/g, '\n').trim();
}

console.log('============================================================================');
console.log('    KOREX ANALYTICS - GENERADOR Y VALIDADOR DUAL (SQL SERVER + POSTGRES)    ');
console.log('============================================================================\n');

// 1. GENERACIÓN SQL SERVER
console.log('[PASO 1] Compilando Master Release para Microsoft SQL Server...');
const sqlServerFiles = [
    '01_CreateDatabase.sql',
    '02_Tables.sql',
    '03_InitialData.sql',
    '04_StoredProcedures.sql'
];

let sqlServerConsolidated = `/*\n============================================================================\n` +
    `PROYECTO: KOREX ANALYTICS\n` +
    `RELEASE: SQL SERVER (T-SQL) COMPLETO Y AUTÓNOMO\n` +
    `GENERADO: ${new Date().toISOString()}\n` +
    `============================================================================\n*/\n\n`;

const sqlServerManifest = {
    engine: 'SQLSERVER',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    expectedTablesCount: EXPECTED_TABLES.length,
    expectedProceduresCount: EXPECTED_PROCEDURES.length,
    files: [],
    tables: [],
    procedures: []
};

sqlServerFiles.forEach(fileName => {
    const filePath = path.join(SQLSERVER_DIR, fileName);
    if (!fs.existsSync(filePath)) {
        console.error(`[ERROR FATAL] Archivo requerido no encontrado: ${filePath}`);
        process.exit(1);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const hash = calculateSha256(content);
    sqlServerManifest.files.push({ file: fileName, sha256: hash, bytes: content.length });
    sqlServerConsolidated += `\n-- >>> INICIO ARCHIVO: ${fileName} <<<\n` + content + `\nGO\n`;
});

const sqlServerOutputPath = path.join(SQLSERVER_DIR, 'Korex_Analytics_SQLServer_Completo.sql');
fs.writeFileSync(sqlServerOutputPath, sqlServerConsolidated, 'utf8');
console.log(`  [OK] Script consolidado generado: ${sqlServerOutputPath} (${sqlServerConsolidated.length} bytes)`);

// 2. GENERACIÓN POSTGRESQL
console.log('\n[PASO 2] Compilando Master Release para PostgreSQL...');
const postgresFiles = [
    '01_CreateDatabase.sql',
    '02_Tables.sql',
    '03_InitialData.sql',
    '04_StoredProcedures.sql'
];

let postgresConsolidated = `/*\n============================================================================\n` +
    `PROYECTO: KOREX ANALYTICS\n` +
    `RELEASE: POSTGRESQL (PL/pgSQL) COMPLETO Y AUTÓNOMO\n` +
    `GENERADO: ${new Date().toISOString()}\n` +
    `============================================================================\n*/\n\n`;

const postgresManifest = {
    engine: 'POSTGRESQL',
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    expectedTablesCount: EXPECTED_TABLES.length,
    expectedProceduresCount: EXPECTED_PROCEDURES.length,
    files: [],
    tables: [],
    procedures: []
};

postgresFiles.forEach(fileName => {
    const filePath = path.join(POSTGRESQL_DIR, fileName);
    if (!fs.existsSync(filePath)) {
        console.error(`[ERROR FATAL] Archivo requerido no encontrado: ${filePath}`);
        process.exit(1);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const hash = calculateSha256(content);
    postgresManifest.files.push({ file: fileName, sha256: hash, bytes: content.length });
    postgresConsolidated += `\n-- >>> INICIO ARCHIVO: ${fileName} <<<\n` + content + `\n`;
});

const postgresOutputPath = path.join(POSTGRESQL_DIR, 'Korex_Analytics_PostgreSQL_Completo.sql');
fs.writeFileSync(postgresOutputPath, postgresConsolidated, 'utf8');
console.log(`  [OK] Script consolidado generado: ${postgresOutputPath} (${postgresConsolidated.length} bytes)`);

// 3. AUDITORÍA DE PARIDAD MULTIBASE (SQL SERVER vs POSTGRESQL)
console.log('\n[PASO 3] Validando Paridad de Estructura entre Motores...');
let parityErrors = 0;

EXPECTED_TABLES.forEach(tbl => {
    const inSqlServer = sqlServerConsolidated.includes(tbl);
    const inPostgres = postgresConsolidated.includes(`"${tbl}"`) || postgresConsolidated.includes(tbl);

    if (inSqlServer && inPostgres) {
        console.log(`  [PARIDAD OK] Tabla: ${tbl}`);
        sqlServerManifest.tables.push(tbl);
        postgresManifest.tables.push(tbl);
    } else {
        parityErrors++;
        console.error(`  [ERROR PARIDAD] Tabla ${tbl} - SQL Server: ${inSqlServer ? 'SÍ' : 'NO'}, PostgreSQL: ${inPostgres ? 'SÍ' : 'NO'}`);
    }
});

EXPECTED_PROCEDURES.forEach(proc => {
    const inSqlServer = sqlServerConsolidated.includes(proc);
    const inPostgres = postgresConsolidated.toLowerCase().includes(proc.toLowerCase());

    if (inSqlServer && inPostgres) {
        console.log(`  [PARIDAD OK] Procedimiento / Función: ${proc}`);
        sqlServerManifest.procedures.push(proc);
        postgresManifest.procedures.push(proc);
    } else {
        parityErrors++;
        console.error(`  [ERROR PARIDAD] SP ${proc} - SQL Server: ${inSqlServer ? 'SÍ' : 'NO'}, PostgreSQL: ${inPostgres ? 'SÍ' : 'NO'}`);
    }
});

if (parityErrors > 0) {
    console.error(`\n[FALLO] Se detectaron ${parityErrors} discrepancias de paridad entre motores.`);
    process.exit(1);
}

// 4. GENERACIÓN DE MANIFIESTOS CRIPTOGRÁFICOS
console.log('\n[PASO 4] Generando Manifiestos de Release Criptográficos SHA-256...');
sqlServerManifest.masterSha256 = calculateSha256(sqlServerConsolidated);
postgresManifest.masterSha256 = calculateSha256(postgresConsolidated);

const sqlServerManifestPath = path.join(SQL_DIR, 'manifest-sqlserver.json');
const postgresManifestPath = path.join(SQL_DIR, 'manifest-postgresql.json');

fs.writeFileSync(sqlServerManifestPath, JSON.stringify(sqlServerManifest, null, 2), 'utf8');
fs.writeFileSync(postgresManifestPath, JSON.stringify(postgresManifest, null, 2), 'utf8');

console.log(`  [OK] Manifiesto SQL Server: ${sqlServerManifestPath}`);
console.log(`  [OK] Manifiesto PostgreSQL: ${postgresManifestPath}`);

console.log('\n============================================================================');
console.log('>>> GENERACIÓN DUAL COMPLETADA AL 100% SIN ERRORES');
console.log(`    Total Tablas Conciliadas: ${EXPECTED_TABLES.length} / ${EXPECTED_TABLES.length}`);
console.log(`    Total Procedimientos Conciliados: ${EXPECTED_PROCEDURES.length} / ${EXPECTED_PROCEDURES.length}`);
console.log('============================================================================');
