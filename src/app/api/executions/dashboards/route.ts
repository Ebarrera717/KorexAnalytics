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
 * GET: Obtener tableros para un procedimiento dado invocando spKAX_DashboardListar
 */
export async function GET(req: NextRequest) {
    let pool: mssql.ConnectionPool | null = null;
    try {
        const { searchParams } = new URL(req.url);
        const procedureId = searchParams.get('procedureId');
        const userId = searchParams.get('userId');

        if (!procedureId) {
            return NextResponse.json({ message: 'El parámetro "procedureId" es requerido.' }, { status: 400 });
        }

        pool = await getInternalPool();
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
 * POST: Guardar o actualizar un tablero mediante spKAX_DashboardGuardar
 */
export async function POST(req: NextRequest) {
    let pool: mssql.ConnectionPool | null = null;
    try {
        const body = await req.json();
        const { id, procedureId, userId, name, description, layoutConfig, widgetsConfig, isDefault } = body;

        if (!name || !procedureId) {
            return NextResponse.json({ message: 'El nombre y el ID del procedimiento son requeridos.' }, { status: 400 });
        }

        pool = await getInternalPool();

        // Validar usuario
        const userRes = await pool.request().query('SELECT TOP 1 id FROM dbo.KAX_User ORDER BY id ASC');
        const validUserId = userId || userRes.recordset[0]?.id || 1;

        const layoutStr = layoutConfig ? JSON.stringify(layoutConfig) : null;
        const widgetsStr = JSON.stringify(widgetsConfig || []);

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

        const execRes = await request.execute('dbo.spKAX_DashboardGuardar');
        const savedId = execRes.output.savedId || id;

        await pool.close();

        return NextResponse.json({
            id: savedId,
            procedureId: Number(procedureId),
            userId: Number(validUserId),
            name,
            description,
            layoutConfig,
            widgetsConfig,
            isDefault: Boolean(isDefault)
        });
    } catch (err: any) {
        if (pool) {
            try { await pool.close(); } catch {}
        }
        console.error('[API_DASHBOARDS_POST_ERROR]', err);
        return NextResponse.json({ message: 'Error al guardar tablero analítico', error: err.message }, { status: 500 });
    }
}

/**
 * DELETE: Eliminar un tablero mediante spKAX_DashboardEliminar
 */
export async function DELETE(req: NextRequest) {
    let pool: mssql.ConnectionPool | null = null;
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const userId = searchParams.get('userId');

        if (!id) {
            return NextResponse.json({ message: 'El parámetro "id" es requerido.' }, { status: 400 });
        }

        pool = await getInternalPool();
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
