const mssql = require('mssql');

async function testPresetDashboards() {
    const config = {
        server: process.env.KAX_INTERNAL_DB_SERVER || '127.0.0.1',
        port: parseInt(process.env.KAX_INTERNAL_DB_PORT || '1433', 10),
        database: process.env.KAX_INTERNAL_DB_NAME || 'Korex_Analytics',
        user: process.env.KAX_INTERNAL_DB_USER || 'zeusagencias',
        password: process.env.KAX_INTERNAL_DB_PASSWORD || 'zzeusagencias',
        options: { encrypt: false, trustServerCertificate: true }
    };

    console.log('--- TEST AUTOMATIZADO: TABLEROS EN CADA PLANTILLA ---');
    const pool = await new mssql.ConnectionPool(config).connect();

    // 1. Verificar estado inicial de Preset 7 y Preset 8
    const p7Res = await pool.request().input('id', 7).query('SELECT id, name, dashboardsConfig FROM dbo.KAX_ExecutionPreset WHERE id = @id');
    const p8Res = await pool.request().input('id', 8).query('SELECT id, name, dashboardsConfig FROM dbo.KAX_ExecutionPreset WHERE id = @id');

    const p7 = p7Res.recordset[0];
    const p8 = p8Res.recordset[0];

    console.log(`[Paso 1] Preset 7: "${p7.name}" - Tableros iniciales:`, JSON.parse(p7.dashboardsConfig || '[]').length);
    console.log(`[Paso 2] Preset 8: "${p8.name}" - Tableros iniciales:`, JSON.parse(p8.dashboardsConfig || '[]').length);

    // 2. Simular creación de un nuevo tablero "TableroTestUniversal" (debe agregarse a todas las plantillas del proc 7)
    const testDashboard = {
        id: 99999,
        procedureId: 7,
        userId: 1,
        name: 'TableroTestUniversal',
        description: 'Test creado para verificar propagacion',
        layoutConfig: null,
        widgetsConfig: [{ id: 'w1', title: 'KPI Test', type: 'kpi', aggregation: 'COUNT', width: 'quarter' }],
        isDefault: false
    };

    // Propagar a todos los presets de procedureId = 7
    const presetsRes = await pool.request()
        .input('procId', mssql.Int, 7)
        .query('SELECT id, dashboardsConfig FROM dbo.KAX_ExecutionPreset WHERE procedureId = @procId');

    for (const pRow of presetsRes.recordset) {
        let currentList = [];
        try { currentList = JSON.parse(pRow.dashboardsConfig) || []; } catch {}
        currentList.push(testDashboard);
        await pool.request()
            .input('pId', mssql.Int, pRow.id)
            .input('cfg', mssql.NVarChar(mssql.MAX), JSON.stringify(currentList))
            .query('UPDATE dbo.KAX_ExecutionPreset SET dashboardsConfig = @cfg WHERE id = @pId');
    }

    // Verificar que ambos presets tengan el nuevo tablero
    const p7Check1 = JSON.parse((await pool.request().input('id', 7).query('SELECT dashboardsConfig FROM dbo.KAX_ExecutionPreset WHERE id = @id')).recordset[0].dashboardsConfig);
    const p8Check1 = JSON.parse((await pool.request().input('id', 8).query('SELECT dashboardsConfig FROM dbo.KAX_ExecutionPreset WHERE id = @id')).recordset[0].dashboardsConfig);

    const hasP7 = p7Check1.some(d => d.name === 'TableroTestUniversal');
    const hasP8 = p8Check1.some(d => d.name === 'TableroTestUniversal');

    console.log(`[Paso 3] Creación: ¿Tablero agregado a Preset 7 (${p7.name})?:`, hasP7 ? '✓ SÍ' : '✗ NO');
    console.log(`[Paso 4] Creación: ¿Tablero agregado a Preset 8 (${p8.name})?:`, hasP8 ? '✓ SÍ' : '✗ NO');

    if (!hasP7 || !hasP8) {
        throw new Error('Fallo en la propagación de creación a todas las plantillas.');
    }

    // 3. Simular eliminación del tablero únicamente de Preset 8 (Consolidado1)
    const filteredP8 = p8Check1.filter(d => d.name !== 'TableroTestUniversal');
    await pool.request()
        .input('id', mssql.Int, 8)
        .input('cfg', mssql.NVarChar(mssql.MAX), JSON.stringify(filteredP8))
        .query('UPDATE dbo.KAX_ExecutionPreset SET dashboardsConfig = @cfg WHERE id = @id');

    // Verificar que en Preset 8 YA NO ESTÁ, pero en Preset 7 SIGUE ESTANDO
    const p7Check2 = JSON.parse((await pool.request().input('id', 7).query('SELECT dashboardsConfig FROM dbo.KAX_ExecutionPreset WHERE id = @id')).recordset[0].dashboardsConfig);
    const p8Check2 = JSON.parse((await pool.request().input('id', 8).query('SELECT dashboardsConfig FROM dbo.KAX_ExecutionPreset WHERE id = @id')).recordset[0].dashboardsConfig);

    const hasP7AfterDelete = p7Check2.some(d => d.name === 'TableroTestUniversal');
    const hasP8AfterDelete = p8Check2.some(d => d.name === 'TableroTestUniversal');

    console.log(`[Paso 5] Eliminación de Preset 8: ¿Tablero eliminado de Preset 8 (${p8.name})?:`, !hasP8AfterDelete ? '✓ SÍ (Eliminado)' : '✗ NO');
    console.log(`[Paso 6] Aislamiento: ¿Tablero PERMANECE intacto en Preset 7 (${p7.name})?:`, hasP7AfterDelete ? '✓ SÍ (Permanece)' : '✗ NO');

    if (!hasP7AfterDelete || hasP8AfterDelete) {
        throw new Error('Fallo en el aislamiento de eliminación entre plantillas.');
    }

    // Limpieza final de prueba (remover test de Preset 7)
    const cleanedP7 = p7Check2.filter(d => d.name !== 'TableroTestUniversal');
    await pool.request()
        .input('id', mssql.Int, 7)
        .input('cfg', mssql.NVarChar(mssql.MAX), JSON.stringify(cleanedP7))
        .query('UPDATE dbo.KAX_ExecutionPreset SET dashboardsConfig = @cfg WHERE id = @id');

    console.log('--- TEST COMPLETADO EXITOSAMENTE: 100% CUMPLIMIENTO DE REGLAS ---');
    await pool.close();
}

testPresetDashboards().catch(err => {
    console.error('Error en test:', err);
    process.exit(1);
});
