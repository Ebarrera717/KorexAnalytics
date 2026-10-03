/**
 * ============================================================================
 * PROYECTO: KOREX ANALYTICS
 * SCRIPT: Inicializador Autónomo de Base de Datos SQL Server
 * EJECUCIÓN: node scripts/init_database.js
 * ============================================================================
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mssql = require('mssql');

const SERVER = process.env.KAX_INTERNAL_DB_SERVER || '127.0.0.1';
const PORT = parseInt(process.env.KAX_INTERNAL_DB_PORT || '1433', 10);
const DB_NAME = process.env.KAX_INTERNAL_DB_NAME || 'Korex_Analytics';
const USER = process.env.KAX_INTERNAL_DB_USER || 'sa';
const PASSWORD = process.env.KAX_INTERNAL_DB_PASSWORD || '';

async function initializeDatabase() {
    console.log('============================================================================');
    console.log('         INICIALIZADOR DE BASE DE DATOS - KOREX ANALYTICS EN BLANCO         ');
    console.log('============================================================================\n');

    console.log(`[CONFIG] Servidor: ${SERVER}:${PORT}`);
    console.log(`[CONFIG] Base de Datos Objetivo: ${DB_NAME}`);
    console.log(`[CONFIG] Usuario: ${USER}\n`);

    // 1. Conexión a master para crear la base si no existe
    const masterConfig = {
        user: USER,
        password: PASSWORD,
        server: SERVER,
        database: 'master',
        port: PORT,
        options: {
            encrypt: false,
            trustServerCertificate: true,
            connectTimeout: 15000
        }
    };

    let masterPool = null;
    try {
        console.log('[PASO 1] Conectando a SQL Server (master)...');
        masterPool = new mssql.ConnectionPool(masterConfig);
        await masterPool.connect();
        console.log('  [OK] Conexión establecida con master.');

        const checkDbRes = await masterPool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = '${DB_NAME}')
            BEGIN
                CREATE DATABASE [${DB_NAME}] COLLATE SQL_Latin1_General_CP1_CI_AS;
                SELECT 'CREATED' AS [status];
            END
            ELSE
            BEGIN
                SELECT 'EXISTS' AS [status];
            END
        `);

        const status = checkDbRes.recordset[0]?.status;
        if (status === 'CREATED') {
            console.log(`  [OK] Base de datos [${DB_NAME}] creada exitosamente en blanco.`);
        } else {
            console.log(`  [OK] Base de datos [${DB_NAME}] ya existe.`);
        }
    } catch (err) {
        console.error('  [ERROR] Fallo al verificar/crear la base de datos:', err.message);
        process.exit(1);
    } finally {
        if (masterPool) await masterPool.close();
    }

    // 2. Conectar directamente a Korex_Analytics y aplicar Tablas, Datos y SPs
    const targetConfig = {
        ...masterConfig,
        database: DB_NAME
    };

    let targetPool = null;
    try {
        console.log(`\n[PASO 2] Conectando a [${DB_NAME}] para aplicar objetos...`);
        targetPool = new mssql.ConnectionPool(targetConfig);
        await targetPool.connect();
        console.log(`  [OK] Conectado a [${DB_NAME}].`);

        const sqlDir = path.join(__dirname, '..', 'SQL');

        // A. Tablas
        const tablesSqlPath = path.join(sqlDir, '02_Tables.sql');
        if (fs.existsSync(tablesSqlPath)) {
            console.log('\n[PASO 3] Creando tablas e índices nativos (02_Tables.sql)...');
            const tablesSql = fs.readFileSync(tablesSqlPath, 'utf8');
            await targetPool.request().batch(tablesSql);
            console.log('  [OK] Tablas e índices creados exitosamente.');
        }

        // B. Datos Iniciales
        const dataSqlPath = path.join(sqlDir, '03_InitialData.sql');
        if (fs.existsSync(dataSqlPath)) {
            console.log('\n[PASO 4] Sembrando roles y usuario administrador (03_InitialData.sql)...');
            const dataSql = fs.readFileSync(dataSqlPath, 'utf8');
            await targetPool.request().batch(dataSql);
            console.log('  [OK] Roles y usuario administrador inicial sembrados.');
        }

        // C. Stored Procedures
        const spsSqlPath = path.join(sqlDir, '04_StoredProcedures.sql');
        if (fs.existsSync(spsSqlPath)) {
            console.log('\n[PASO 5] Creando procedimientos almacenados (04_StoredProcedures.sql)...');
            const spsSql = fs.readFileSync(spsSqlPath, 'utf8');
            const batches = spsSql.split(/\bGO\b/i).map(b => b.trim()).filter(Boolean);
            for (const batch of batches) {
                await targetPool.request().batch(batch);
            }
            console.log('  [OK] Stored Procedures del sistema creados.');
        }

        console.log('\n============================================================================');
        console.log('>>> BASE DE DATOS KOREX ANALYTICS INICIALIZADA AL 100% CON ÉXITO');
        console.log('============================================================================\n');
    } catch (err) {
        console.error('  [ERROR] Fallo al aplicar estructura DDL:', err.message);
        process.exit(1);
    } finally {
        if (targetPool) await targetPool.close();
    }
}

initializeDatabase();
