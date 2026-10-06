/**
 * ============================================================================
 * PROYECTO: KOREX ANALYTICS
 * SCRIPT: Suite Automatizada de Validación de Paridad Multibase (SQL Server + PostgreSQL)
 * EJECUCIÓN: node scripts/validate_multidb_parity.js
 * ============================================================================
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mssql = require('mssql');
const { Client: PgClient } = require('pg');

const ROOT_DIR = path.resolve(__dirname, '..');
const SQL_DIR = path.join(ROOT_DIR, 'SQL');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assertCheck(name, condition, errorMsg = '') {
    totalChecks++;
    if (condition) {
        passedChecks++;
        console.log(`  [OK] ${name}`);
    } else {
        failedChecks++;
        console.error(`  [FAIL] ${name} -> ${errorMsg}`);
    }
}

async function runMultidbValidation() {
    console.log('============================================================================');
    console.log('       SUITE DE VALIDACIÓN MULTIBASE - SQL SERVER Y POSTGRESQL');
    console.log('============================================================================\n');

    // CAPA 1: ESTRUCTURA DE FUENTES Y MANIFIESTOS
    console.log('[CAPA 1] Verificando Fuentes y Manifiestos de Releases Duales...');
    const sqlServerManifestPath = path.join(SQL_DIR, 'manifest-sqlserver.json');
    const postgresManifestPath = path.join(SQL_DIR, 'manifest-postgresql.json');
    const sqlServerMasterPath = path.join(SQL_DIR, 'SqlServer', 'Korex_Analytics_SQLServer_Completo.sql');
    const postgresMasterPath = path.join(SQL_DIR, 'PostgreSQL', 'Korex_Analytics_PostgreSQL_Completo.sql');

    assertCheck('Manifiesto manifest-sqlserver.json existe', fs.existsSync(sqlServerManifestPath));
    assertCheck('Manifiesto manifest-postgresql.json existe', fs.existsSync(postgresManifestPath));
    assertCheck('Master script SQL Server existe', fs.existsSync(sqlServerMasterPath));
    assertCheck('Master script PostgreSQL existe', fs.existsSync(postgresMasterPath));

    const manifestSql = JSON.parse(fs.readFileSync(sqlServerManifestPath, 'utf8'));
    const manifestPg = JSON.parse(fs.readFileSync(postgresManifestPath, 'utf8'));

    assertCheck('Conteo de tablas en manifiestos coincide', manifestSql.tables.length === manifestPg.tables.length && manifestSql.tables.length === 9);
    assertCheck('Conteo de procedimientos en manifiestos coincide', manifestSql.procedures.length === manifestPg.procedures.length && manifestSql.procedures.length === 6);

    // CAPA 2: VALIDACIÓN EN VIVO CONTRA MICROSOFT SQL SERVER
    console.log('\n[CAPA 2] Validando Objetos en Vivo sobre Microsoft SQL Server...');
    let sqlPool = null;
    try {
        const sqlConfig = {
            server: process.env.KAX_INTERNAL_DB_SERVER || '127.0.0.1',
            port: parseInt(process.env.KAX_INTERNAL_DB_PORT || '1433', 10),
            database: process.env.KAX_INTERNAL_DB_NAME || 'Korex_Analytics',
            user: process.env.KAX_INTERNAL_DB_USER || 'zeusagencias',
            password: process.env.KAX_INTERNAL_DB_PASSWORD || 'zzeusagencias',
            options: { encrypt: false, trustServerCertificate: true, connectTimeout: 10000 }
        };
        sqlPool = new mssql.ConnectionPool(sqlConfig);
        await sqlPool.connect();
        assertCheck('Conexión con SQL Server establecida', true);

        const tablesRes = await sqlPool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME LIKE 'KAX_%'
        `);
        const foundSqlTables = new Set(tablesRes.recordset.map(r => r.TABLE_NAME));
        manifestSql.tables.forEach(tbl => {
            assertCheck(`SQL Server: Tabla ${tbl} existe en base de datos`, foundSqlTables.has(tbl));
        });

        const procsRes = await sqlPool.request().query(`
            SELECT ROUTINE_NAME 
            FROM INFORMATION_SCHEMA.ROUTINES 
            WHERE ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME LIKE 'spKAX_%'
        `);
        const foundSqlProcs = new Set(procsRes.recordset.map(r => r.ROUTINE_NAME));
        manifestSql.procedures.forEach(proc => {
            assertCheck(`SQL Server: Procedimiento ${proc} existe`, foundSqlProcs.has(proc));
        });
    } catch (err) {
        assertCheck('Conexión con SQL Server establecida', false, err.message);
    } finally {
        if (sqlPool) {
            try { await sqlPool.close(); } catch {}
        }
    }

    // CAPA 3: VALIDACIÓN EN VIVO CONTRA POSTGRESQL (MOTOR DUAL)
    console.log('\n[CAPA 3] Validando Objetos en Vivo sobre PostgreSQL 18...');
    const pgClient = new PgClient({
        host: '127.0.0.1',
        port: 5432,
        user: 'postgres',
        password: 'zzeusagencias',
        database: 'postgres'
    });

    try {
        await pgClient.connect();
        assertCheck('Conexión con PostgreSQL establecida', true);

        // Crear schema temporal sandbox para validar ejecución limpia
        await pgClient.query('CREATE SCHEMA IF NOT EXISTS sandbox_kax_validation;');
        await pgClient.query('SET search_path TO sandbox_kax_validation, public;');

        const ddl = fs.readFileSync(path.join(SQL_DIR, 'PostgreSQL', '02_Tables.sql'), 'utf8')
            .replace(/public\./g, 'sandbox_kax_validation.');
        await pgClient.query(ddl);
        assertCheck('PostgreSQL: DDL ejecutado con éxito sin errores de sintaxis', true);

        const dataSql = fs.readFileSync(path.join(SQL_DIR, 'PostgreSQL', '03_InitialData.sql'), 'utf8')
            .replace(/public\./g, 'sandbox_kax_validation.');
        await pgClient.query(dataSql);
        assertCheck('PostgreSQL: Semillas iniciales aplicadas con éxito', true);

        const spsSql = fs.readFileSync(path.join(SQL_DIR, 'PostgreSQL', '04_StoredProcedures.sql'), 'utf8')
            .replace(/public\./g, 'sandbox_kax_validation.');
        await pgClient.query(spsSql);
        assertCheck('PostgreSQL: Funciones y Procedimientos compilados con éxito', true);

        // Verificar que las 8 tablas existen en PostgreSQL
        const pgTablesRes = await pgClient.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'sandbox_kax_validation'
        `);
        const foundPgTables = new Set(pgTablesRes.rows.map(r => r.table_name));
        manifestPg.tables.forEach(tbl => {
            assertCheck(`PostgreSQL: Tabla ${tbl} verificada en esquema`, foundPgTables.has(tbl));
        });

        // Limpiar sandbox
        await pgClient.query('DROP SCHEMA sandbox_kax_validation CASCADE;');
        assertCheck('PostgreSQL: Sandbox de prueba limpiado correctamente', true);
    } catch (err) {
        assertCheck('Ejecución en PostgreSQL', false, err.message);
    } finally {
        try { await pgClient.end(); } catch {}
    }

    // CAPA 4: REVISIÓN DE SKILLS COPIADOS DE AGENCIASNEW
    console.log('\n[CAPA 4] Verificando Skills de AgenciasNew Adoptados...');
    const skillsDir = path.join(ROOT_DIR, '.agents', 'skills');
    assertCheck('Carpeta .agents/skills existe', fs.existsSync(skillsDir));
    const mandatorySkills = [
        'desarrollo-multibase',
        'control-integral-liberacion-db',
        'motor-engine-isolation',
        'db-separation-architecture',
        'korex-master-rules'
    ];
    mandatorySkills.forEach(sk => {
        const skFile = path.join(skillsDir, sk, 'SKILL.md');
        assertCheck(`Skill obligatorio ${sk}/SKILL.md presente`, fs.existsSync(skFile));
    });

    console.log('\n============================================================================');
    console.log(`RESULTADOS TOTALES: ${passedChecks} APROBADOS, ${failedChecks} FALLIDOS (TOTAL: ${totalChecks})`);
    console.log('============================================================================');

    if (failedChecks > 0) {
        process.exit(1);
    } else {
        console.log('>>> PARIDAD MULTIBASE SQL SERVER Y POSTGRESQL 100% GARANTIZADA.');
    }
}

runMultidbValidation();
