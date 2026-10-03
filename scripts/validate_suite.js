/**
 * ============================================================================
 * PROYECTO: KOREX ANALYTICS
 * SCRIPT: Suite Integral de Validación del Proyecto Autónomo
 * EJECUCIÓN: node scripts/validate_suite.js
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
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

console.log('============================================================================');
console.log('         SUITE INTEGRAL DE VALIDACIÓN - PROYECTO KOREX ANALYTICS           ');
console.log('============================================================================\n');

// 1. CONFIGURACIÓN Y ENTORNO
console.log('[CAPA 1] Verificando Archivos de Configuración y Entorno...');
const CONFIG_FILES = ['package.json', 'tsconfig.json', 'next.config.mjs', 'postcss.config.mjs', '.env', '.env.example', 'iniciar.bat', 'IniciarBaseDatos.bat'];
CONFIG_FILES.forEach(f => {
    const fullPath = path.join(ROOT_DIR, f);
    assertCheck(`Archivo ${f} existe`, fs.existsSync(fullPath));
});

// 2. SCRIPTS SQL Y BASE DE DATOS
console.log('\n[CAPA 2] Verificando Scripts SQL y DDL en SQL/...');
const SQL_FILES = ['01_CreateDatabase.sql', '02_Tables.sql', '03_InitialData.sql', '04_StoredProcedures.sql'];
SQL_FILES.forEach(f => {
    const fullPath = path.join(ROOT_DIR, 'SQL', f);
    assertCheck(`Script SQL/${f} presente`, fs.existsSync(fullPath));
});

// 3. DOCUMENTACIÓN FASE 0
console.log('\n[CAPA 3] Verificando Entregables Oficiales de Fase 0 en docs/...');
const DOCS_FILES = [
    'PROMPT_MAESTRO_KOREX_ANALYTICS.md',
    'ANALISIS_FASE_0.md',
    'ARQUITECTURA.md',
    'SEGURIDAD.md',
    'USUARIOS.md',
    'PARAMETROS_USUARIOS.md',
    'SQL_SERVER.md',
    'EJECUCIONES.md',
    'BASE_DATOS.md',
    'PRUEBAS.md',
    'MATRIZ_DEPENDENCIAS.md',
    'MATRIZ_RIESGOS.md',
    'IDENTIDAD_VISUAL.md'
];
DOCS_FILES.forEach(f => {
    const fullPath = path.join(ROOT_DIR, 'docs', f);
    assertCheck(`Documento docs/${f} presente`, fs.existsSync(fullPath));
});

// 4. FRONTEND Y VISTAS
console.log('\n[CAPA 4] Verificando Vistas y Rutas de Frontend en src/app/...');
const APP_VIEWS = [
    'src/app/layout.tsx',
    'src/app/page.tsx',
    'src/app/globals.css',
    'src/app/login/page.tsx',
    'src/app/executions/page.tsx',
    'src/app/sqlserver/page.tsx',
    'src/app/parameters/page.tsx',
    'src/app/history/page.tsx'
];
APP_VIEWS.forEach(f => {
    const fullPath = path.join(ROOT_DIR, f);
    assertCheck(`Vista ${f} presente`, fs.existsSync(fullPath));
});

// 5. APIS DE BACKEND
console.log('\n[CAPA 5] Verificando Endpoints de API en src/app/api/...');
const API_ROUTES = [
    'src/app/api/auth/login/route.ts',
    'src/app/api/auth/me/route.ts',
    'src/app/api/auth/logout/route.ts',
    'src/app/api/sqlserver/profiles/route.ts',
    'src/app/api/sqlserver/test-connection/route.ts',
    'src/app/api/executions/procedures/route.ts',
    'src/app/api/executions/run/route.ts',
    'src/app/api/executions/presets/route.ts',
    'src/app/api/parameters/user/route.ts'
];
API_ROUTES.forEach(f => {
    const fullPath = path.join(ROOT_DIR, f);
    assertCheck(`API ${f} presente`, fs.existsSync(fullPath));
});

// 6. MOTORES Y SERVICIOS EN LIB
console.log('\n[CAPA 6] Verificando Motores de Seguridad y SQL en src/lib/...');
const LIB_FILES = ['security.ts', 'sql-pool-manager.ts', 'execution-runner.ts', 'audit-logger.ts', 'index.js'];
LIB_FILES.forEach(f => {
    const fullPath = path.join(ROOT_DIR, 'src', 'lib', f);
    assertCheck(`Librería src/lib/${f} presente`, fs.existsSync(fullPath));
});

console.log('\n============================================================================');
console.log(`RESULTADOS TOTALES: ${passedChecks} APROBADOS, ${failedChecks} FALLIDOS (TOTAL: ${totalChecks})`);
console.log('============================================================================\n');

if (failedChecks > 0) {
    process.exit(1);
} else {
    console.log('>>> PROYECTO KOREX ANALYTICS 100% ESTRUCTURADO, LISTO PARA INICIAR.');
    process.exit(0);
}
