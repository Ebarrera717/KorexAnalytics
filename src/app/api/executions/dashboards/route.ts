import { NextRequest, NextResponse } from 'next/server';
import mssql from 'mssql';

export const dynamic = 'force-dynamic';

async function getInternalPool(): Promise<mssql.ConnectionPool> {
    const config: mssql.config = {
        server: process.env.KAX_INTERNAL_DB_SERVER || '127.0.0.1',
        port: parseInt(process.env.KAX_INTERNAL_DB_PORT || '1433', 10),
        database: process.env.KAX_INTERNAL_DB_NAME || 'Korex_Analytics',
        user: process.env.KAX_INTERNAL_DB_USER || 'zeusagencias',
        password: process.env.KAX_INTERNAL_DB_PASSWORD || 'zzeusagencias',
        options: {
            encrypt: false,
            trustServerCertificate: true,
            connectTimeout: 10000
        }
    };
    const pool = new mssql.ConnectionPool(config);
    await pool.connect();
    return pool;
}

/**
 * GET: Obtener tableros para un procedimiento dado (o de una plantilla/preset específico)
 */
export async function GET(req: NextRequest) {
    let pool: mssql.ConnectionPool | null = null;
    try {
        const { searchParams } = new URL(req.url);
        const procedureId = searchParams.get('procedureId');
        const presetId = searchParams.get('presetId');
        const userId = searchParams.get('userId');

        if (!procedureId) {
            return NextResponse.json({ message: 'El parámetro "procedureId" es requerido.' }, { status: 400 });
        }

        pool = await getInternalPool();

        // Si se especificó una plantilla (presetId), consultar los tableros guardados en dicha plantilla
        if (presetId) {
            const presetRes = await pool.request()
                .input('presetId', mssql.Int, Number(presetId))
                .query(`SELECT id, dashboardsConfig FROM dbo.KAX_ExecutionPreset WHERE id = @presetId`);

            if (presetRes.recordset.length > 0) {
                const rawConfig = presetRes.recordset[0].dashboardsConfig;
                if (rawConfig && rawConfig.trim() !== '') {
                    try {
                        const parsed = JSON.parse(rawConfig);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            await pool.close();
                            return NextResponse.json(parsed);
                        }
                    } catch (e) {
                        console.warn('[API_DASHBOARDS] Error parseando dashboardsConfig del preset, cargando base:', e);
                    }
                }

                // Si la plantilla aún no tenía tableros sembrados, heredar del catálogo base KAX_Dashboard
                const baseRes = await pool.request()
                    .input('procedureId', mssql.Int, Number(procedureId))
                    .execute('dbo.spKAX_DashboardListar');

                const dashboards = baseRes.recordset.map(row => ({
                    id: row.id,
                    procedureId: row.procedureId,
                    userId: row.userId,
                    userName: row.userName,
                    name: row.name,
                    description: row.description,
                    layoutConfig: typeof row.layoutConfig === 'string' ? JSON.parse(row.layoutConfig) : (row.layoutConfig || null),
                    widgetsConfig: typeof row.widgetsConfig === 'string' ? JSON.parse(row.widgetsConfig) : (row.widgetsConfig || []),
                    isDefault: Boolean(row.isDefault),
                    createdAt: row.createdAt,
                    updatedAt: row.updatedAt
                }));

                // Guardar la siembra en la plantilla
                if (dashboards.length > 0) {
                    await pool.request()
                        .input('presetId', mssql.Int, Number(presetId))
                        .input('dashConfig', mssql.NVarChar(mssql.MAX), JSON.stringify(dashboards))
                        .query(`UPDATE dbo.KAX_ExecutionPreset SET dashboardsConfig = @dashConfig, updatedAt = SYSUTCDATETIME() WHERE id = @presetId`);
                }

                await pool.close();
                return NextResponse.json(dashboards);
            }
        }

        // Si no se especificó presetId, consultar del catálogo general KAX_Dashboard
        const request = pool.request();
        request.input('procedureId', mssql.Int, Number(procedureId));
        if (userId) {
            request.input('userId', mssql.Int, Number(userId));
        } else {
            request.input('userId', mssql.Int, null);
        }

        const res = await request.execute('dbo.spKAX_DashboardListar');
        await pool.close();

        const dashboards = res.recordset.map(row => ({
            id: row.id,
            procedureId: row.procedureId,
            userId: row.userId,
            userName: row.userName,
            name: row.name,
            description: row.description,
            layoutConfig: typeof row.layoutConfig === 'string' ? JSON.parse(row.layoutConfig) : (row.layoutConfig || null),
            widgetsConfig: typeof row.widgetsConfig === 'string' ? JSON.parse(row.widgetsConfig) : (row.widgetsConfig || []),
            isDefault: Boolean(row.isDefault),
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        }));

        return NextResponse.json(dashboards);
    } catch (err: any) {
        if (pool) {
            try { await pool.close(); } catch {}
        }
        console.error('[API_DASHBOARDS_GET_ERROR]', err);
        return NextResponse.json({ message: 'Error al obtener tableros analíticos', error: err.message }, { status: 500 });
    }
}

/**
 * POST: Guardar o actualizar un tablero
 * REGLA: Si se crea un nuevo tablero, se replica automáticamente a TODAS las plantillas del procedimiento.
 * Si se actualiza dentro de una plantilla, se actualiza en esa plantilla.
 */
export async function POST(req: NextRequest) {
    let pool: mssql.ConnectionPool | null = null;
    try {
        const body = await req.json();
        const { id, procedureId, presetId, userId, name, description, layoutConfig, widgetsConfig, isDefault } = body;

        if (!name || !procedureId) {
            return NextResponse.json({ message: 'El nombre y el ID del procedimiento son requeridos.' }, { status: 400 });
        }

        pool = await getInternalPool();

        // Validar usuario
        const userRes = await pool.request().query('SELECT TOP 1 id FROM dbo.KAX_User ORDER BY id ASC');
        const validUserId = userId || userRes.recordset[0]?.id || 1;

        const layoutStr = layoutConfig ? JSON.stringify(layoutConfig) : null;
        const widgetsStr = JSON.stringify(widgetsConfig || []);

        const isNew = !id;

        // 1. Guardar en dbo.KAX_Dashboard (catálogo base)
        const request = pool.request();
        request.input('id', mssql.Int, id ? Number(id) : null);
        request.input('procedureId', mssql.Int, Number(procedureId));
        request.input('userId', mssql.Int, Number(validUserId));
        request.input('name', mssql.NVarChar(150), name);
        request.input('description', mssql.NVarChar(255), description || null);
        request.input('layoutConfig', mssql.NVarChar(mssql.MAX), layoutStr);
        request.input('widgetsConfig', mssql.NVarChar(mssql.MAX), widgetsStr);
        request.input('isDefault', mssql.Bit, isDefault ? 1 : 0);
        request.output('savedId', mssql.Int);

        let savedId = id ? Number(id) : null;
        try {
            const execRes = await request.execute('dbo.spKAX_DashboardGuardar');
            savedId = execRes.output.savedId || savedId;
        } catch (e: any) {
            console.warn('[spKAX_DashboardGuardar warning]:', e.message);
        }

        if (!savedId) {
            savedId = Date.now();
        }

        const dashboardObj = {
            id: savedId,
            procedureId: Number(procedureId),
            userId: Number(validUserId),
            name,
            description: description || '',
            layoutConfig,
            widgetsConfig,
            isDefault: Boolean(isDefault)
        };

        // 2. REGLA: Si se crea un nuevo tablero, APLICARLO A TODAS LAS PLANTILLAS del procedimiento
        if (isNew) {
            const presetsRes = await pool.request()
                .input('procedureId', mssql.Int, Number(procedureId))
                .query(`SELECT id, dashboardsConfig FROM dbo.KAX_ExecutionPreset WHERE procedureId = @procedureId`);

            for (const pRow of presetsRes.recordset) {
                let currentList: any[] = [];
                if (pRow.dashboardsConfig) {
                    try {
                        currentList = JSON.parse(pRow.dashboardsConfig) || [];
                    } catch {}
                }

                // Si ya existe por nombre o ID, actualizarlo; si no, anexarlo
                const existingIdx = currentList.findIndex((d: any) => d.id === dashboardObj.id || d.name.toLowerCase() === dashboardObj.name.toLowerCase());
                if (existingIdx >= 0) {
                    currentList[existingIdx] = dashboardObj;
                } else {
                    currentList.push(dashboardObj);
                }

                await pool.request()
                    .input('pId', mssql.Int, pRow.id)
                    .input('dashConfig', mssql.NVarChar(mssql.MAX), JSON.stringify(currentList))
                    .query(`UPDATE dbo.KAX_ExecutionPreset SET dashboardsConfig = @dashConfig, updatedAt = SYSUTCDATETIME() WHERE id = @pId`);
            }
        } else if (presetId) {
            // Edición de un tablero existente dentro de una plantilla específica: actualizar en esa plantilla
            const pRes = await pool.request()
                .input('presetId', mssql.Int, Number(presetId))
                .query(`SELECT id, dashboardsConfig FROM dbo.KAX_ExecutionPreset WHERE id = @presetId`);

            if (pRes.recordset.length > 0) {
                let currentList: any[] = [];
                if (pRes.recordset[0].dashboardsConfig) {
                    try {
                        currentList = JSON.parse(pRes.recordset[0].dashboardsConfig) || [];
                    } catch {}
                }

                const existingIdx = currentList.findIndex((d: any) => d.id === Number(id) || d.name.toLowerCase() === name.toLowerCase());
                if (existingIdx >= 0) {
                    currentList[existingIdx] = { ...currentList[existingIdx], ...dashboardObj, id: currentList[existingIdx].id };
                } else {
                    currentList.push(dashboardObj);
                }

                await pool.request()
                    .input('presetId', mssql.Int, Number(presetId))
                    .input('dashConfig', mssql.NVarChar(mssql.MAX), JSON.stringify(currentList))
                    .query(`UPDATE dbo.KAX_ExecutionPreset SET dashboardsConfig = @dashConfig, updatedAt = SYSUTCDATETIME() WHERE id = @presetId`);
            }
        }

        await pool.close();
        return NextResponse.json(dashboardObj);
    } catch (err: any) {
        if (pool) {
            try { await pool.close(); } catch {}
        }
        console.error('[API_DASHBOARDS_POST_ERROR]', err);
        return NextResponse.json({ message: 'Error al guardar tablero analítico', error: err.message }, { status: 500 });
    }
}

/**
 * DELETE: Eliminar un tablero
 * REGLA: Si se elimina un tablero desde una plantilla (presetId), se elimina ÚNICAMENTE de esa plantilla y queda en las demás.
 */
export async function DELETE(req: NextRequest) {
    let pool: mssql.ConnectionPool | null = null;
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const presetId = searchParams.get('presetId');
        const userId = searchParams.get('userId');

        if (!id) {
            return NextResponse.json({ message: 'El parámetro "id" es requerido.' }, { status: 400 });
        }

        pool = await getInternalPool();

        // Si se provee presetId, se elimina ÚNICAMENTE de esa plantilla
        if (presetId) {
            const pRes = await pool.request()
                .input('presetId', mssql.Int, Number(presetId))
                .query(`SELECT id, dashboardsConfig FROM dbo.KAX_ExecutionPreset WHERE id = @presetId`);

            if (pRes.recordset.length > 0) {
                let currentList: any[] = [];
                if (pRes.recordset[0].dashboardsConfig) {
                    try {
                        currentList = JSON.parse(pRes.recordset[0].dashboardsConfig) || [];
                    } catch {}
                }

                // Filtrar el tablero eliminado solo de esta plantilla
                const filtered = currentList.filter((d: any) => d.id !== Number(id) && String(d.id) !== String(id));

                await pool.request()
                    .input('presetId', mssql.Int, Number(presetId))
                    .input('dashConfig', mssql.NVarChar(mssql.MAX), JSON.stringify(filtered))
                    .query(`UPDATE dbo.KAX_ExecutionPreset SET dashboardsConfig = @dashConfig, updatedAt = SYSUTCDATETIME() WHERE id = @presetId`);

                await pool.close();
                return NextResponse.json({
                    success: true,
                    id: Number(id),
                    presetId: Number(presetId),
                    message: 'Tablero eliminado únicamente de la plantilla activa'
                });
            }
        }

        // Si no hay presetId (ejecución global base), eliminar del catálogo KAX_Dashboard
        const request = pool.request();
        request.input('id', mssql.Int, Number(id));
        request.input('userId', mssql.Int, userId ? Number(userId) : null);

        await request.execute('dbo.spKAX_DashboardEliminar');
        await pool.close();

        return NextResponse.json({ success: true, id: Number(id) });
    } catch (err: any) {
        if (pool) {
            try { await pool.close(); } catch {}
        }
        console.error('[API_DASHBOARDS_DELETE_ERROR]', err);
        return NextResponse.json({ message: 'Error al eliminar tablero analítico', error: err.message }, { status: 500 });
    }
}
