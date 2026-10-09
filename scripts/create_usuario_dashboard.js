const mssql = require('mssql');

async function createUsuarioDashboard() {
    const config = {
        server: process.env.KAX_INTERNAL_DB_SERVER || '127.0.0.1',
        port: parseInt(process.env.KAX_INTERNAL_DB_PORT || '1433', 10),
        database: process.env.KAX_INTERNAL_DB_NAME || 'Korex_Analytics',
        user: process.env.KAX_INTERNAL_DB_USER || 'zeusagencias',
        password: process.env.KAX_INTERNAL_DB_PASSWORD || 'zzeusagencias',
        options: { encrypt: false, trustServerCertificate: true }
    };

    console.log('Conectando a Korex_Analytics para registrar el nuevo Tablero por Usuario...');
    const pool = await new mssql.ConnectionPool(config).connect();

    const procedureId = 7; // Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas
    const name = 'Ventas y Facturación por Usuario';
    const description = 'Tablero analítico agrupado por Usuario (cantidad de facturas y valor total) y Usuario / Tipo de Servicio';

    const layoutConfig = {
        filterCategoryCol: 'Usuario',
        categoryColumn: 'Usuario'
    };

    const widgetsConfig = [
        {
            id: 'kpi_total_facturas_usr',
            title: 'Total Facturas / Transacciones',
            type: 'kpi',
            aggregation: 'COUNT',
            metricColumn: 'factura',
            width: 'quarter',
            colorPalette: 'cyan'
        },
        {
            id: 'kpi_valor_total_usr',
            title: 'Valor Total Facturación',
            type: 'kpi',
            aggregation: 'SUM',
            metricColumn: 'Total',
            width: 'quarter',
            colorPalette: 'emerald'
        },
        {
            id: 'kpi_total_tarifa_usr',
            title: 'Sumatoria Tarifa',
            type: 'kpi',
            aggregation: 'SUM',
            metricColumn: 'Tarifa',
            width: 'quarter',
            colorPalette: 'amber'
        },
        {
            id: 'kpi_total_iva_usr',
            title: 'Impuestos e IVA',
            type: 'kpi',
            aggregation: 'SUM',
            metricColumn: 'Iva',
            width: 'quarter',
            colorPalette: 'violet'
        },
        {
            id: 'pivot_usuario_facturas',
            title: 'Facturación y Cantidad de Facturas por Usuario',
            type: 'pivot_table',
            dimensionColumn: 'Usuario',
            metricColumn: 'Total',
            aggregation: 'SUM',
            width: 'half',
            sortBy: 'metric',
            sortOrder: 'desc',
            topN: 0
        },
        {
            id: 'pivot_usuario_tiposervicio',
            title: 'Usuario y Tipo de Servicio (Valor y Cantidad)',
            type: 'pivot_table',
            dimensionColumn: 'Usuario / TipoServicio',
            metricColumn: 'Total',
            aggregation: 'SUM',
            width: 'half',
            sortBy: 'metric',
            sortOrder: 'desc',
            topN: 0
        },
        {
            id: 'pivot_tiposervicio_total',
            title: 'Total por Tipo de Servicio y Valor Total',
            type: 'pivot_table',
            dimensionColumn: 'TipoServicio',
            metricColumn: 'Total',
            aggregation: 'SUM',
            width: 'half',
            sortBy: 'metric',
            sortOrder: 'desc',
            topN: 0
        },
        {
            id: 'bar_usuario_ventas',
            title: 'Participación de Facturación por Usuario',
            type: 'bar',
            dimensionColumn: 'Usuario',
            metricColumn: 'Total',
            aggregation: 'SUM',
            width: 'half',
            colorPalette: 'cyan',
            sortBy: 'metric',
            sortOrder: 'desc',
            topN: 15
        }
    ];

    // 1. Guardar en dbo.KAX_Dashboard
    const req = pool.request();
    req.input('procedureId', mssql.Int, procedureId);
    req.input('userId', mssql.Int, 1);
    req.input('name', mssql.NVarChar(150), name);
    req.input('description', mssql.NVarChar(255), description);
    req.input('layoutConfig', mssql.NVarChar(mssql.MAX), JSON.stringify(layoutConfig));
    req.input('widgetsConfig', mssql.NVarChar(mssql.MAX), JSON.stringify(widgetsConfig));
    req.input('isDefault', mssql.Bit, 0);

    // Verificar si ya existe en KAX_Dashboard
    const existCheck = await pool.request()
        .input('procedureId', mssql.Int, procedureId)
        .input('name', mssql.NVarChar(150), name)
        .query('SELECT id FROM dbo.KAX_Dashboard WHERE procedureId = @procedureId AND name = @name');

    let savedId = null;
    if (existCheck.recordset.length > 0) {
        savedId = existCheck.recordset[0].id;
        await pool.request()
            .input('id', mssql.Int, savedId)
            .input('description', mssql.NVarChar(255), description)
            .input('layoutConfig', mssql.NVarChar(mssql.MAX), JSON.stringify(layoutConfig))
            .input('widgetsConfig', mssql.NVarChar(mssql.MAX), JSON.stringify(widgetsConfig))
            .query(`
                UPDATE dbo.KAX_Dashboard
                SET description = @description,
                    layoutConfig = @layoutConfig,
                    widgetsConfig = @widgetsConfig,
                    updatedAt = SYSUTCDATETIME()
                WHERE id = @id
            `);
        console.log(`✓ Tablero "${name}" actualizado en dbo.KAX_Dashboard con ID ${savedId}`);
    } else {
        const insertRes = await pool.request()
            .input('procedureId', mssql.Int, procedureId)
            .input('userId', mssql.Int, 1)
            .input('name', mssql.NVarChar(150), name)
            .input('description', mssql.NVarChar(255), description)
            .input('layoutConfig', mssql.NVarChar(mssql.MAX), JSON.stringify(layoutConfig))
            .input('widgetsConfig', mssql.NVarChar(mssql.MAX), JSON.stringify(widgetsConfig))
            .query(`
                INSERT INTO dbo.KAX_Dashboard (
                    procedureId, userId, name, description, layoutConfig, widgetsConfig, isDefault, createdAt, updatedAt
                )
                OUTPUT INSERTED.id
                VALUES (
                    @procedureId, @userId, @name, @description, @layoutConfig, @widgetsConfig, 0, SYSUTCDATETIME(), SYSUTCDATETIME()
                )
            `);
        savedId = insertRes.recordset[0]?.id;
        console.log(`✓ Tablero "${name}" creado en dbo.KAX_Dashboard con ID ${savedId}`);
    }

    const dashboardObj = {
        id: savedId,
        procedureId,
        userId: 1,
        name,
        description,
        layoutConfig,
        widgetsConfig,
        isDefault: false
    };

    // 2. Propagar a todas las plantillas (presets) de procedureId = 7 (Consolidado, Consolidado1, etc.)
    const presetsRes = await pool.request()
        .input('procId', mssql.Int, procedureId)
        .query('SELECT id, name, dashboardsConfig FROM dbo.KAX_ExecutionPreset WHERE procedureId = @procId');

    for (const pRow of presetsRes.recordset) {
        let currentList = [];
        if (pRow.dashboardsConfig) {
            try { currentList = JSON.parse(pRow.dashboardsConfig) || []; } catch {}
        }

        const existingIdx = currentList.findIndex(d => d.id === savedId || d.name.toLowerCase() === name.toLowerCase());
        if (existingIdx >= 0) {
            currentList[existingIdx] = { ...currentList[existingIdx], ...dashboardObj, id: currentList[existingIdx].id || savedId };
        } else {
            currentList.push(dashboardObj);
        }

        await pool.request()
            .input('pId', mssql.Int, pRow.id)
            .input('dashConfig', mssql.NVarChar(mssql.MAX), JSON.stringify(currentList))
            .query('UPDATE dbo.KAX_ExecutionPreset SET dashboardsConfig = @dashConfig, updatedAt = SYSUTCDATETIME() WHERE id = @pId');

        console.log(`✓ Tablero propagado a Plantilla ID ${pRow.id} ("${pRow.name}") [Total tableros: ${currentList.length}]`);
    }

    console.log('\n--- REGISTRO DEL TABLERO COMPLETADO CON ÉXITO ---');
    await pool.close();
}

createUsuarioDashboard().catch(err => {
    console.error('Error registrando tablero:', err);
    process.exit(1);
});
