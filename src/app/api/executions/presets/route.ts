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

export async function GET(req: NextRequest) {
    let pool: mssql.ConnectionPool | null = null;
    try {
        const { searchParams } = new URL(req.url);
        const procedureId = searchParams.get('procedureId');

        if (!procedureId) {
            return NextResponse.json({ message: 'El parámetro "procedureId" es requerido.' }, { status: 400 });
        }

        pool = await getInternalPool();
        const res = await pool.request()
            .input('procedureId', mssql.Int, Number(procedureId))
            .query(`
                SELECT id, procedureId, name, description, filterValues, filterConfig, columnConfigs, selectedTotals
                FROM dbo.KAX_ExecutionPreset
                WHERE procedureId = @procedureId
                ORDER BY name ASC
            `);

        await pool.close();

        const presets = res.recordset.map(row => ({
            id: row.id,
            procedureId: row.procedureId,
            name: row.name,
            description: row.description,
            filterValues: typeof row.filterValues === 'string' ? JSON.parse(row.filterValues) : (row.filterValues || {}),
            filterConfig: typeof row.filterConfig === 'string' ? JSON.parse(row.filterConfig) : (row.filterConfig || {}),
            columnConfigs: typeof row.columnConfigs === 'string' ? JSON.parse(row.columnConfigs) : (row.columnConfigs || []),
            selectedTotals: typeof row.selectedTotals === 'string' ? JSON.parse(row.selectedTotals) : (row.selectedTotals || [])
        }));

        return NextResponse.json(presets);
    } catch (err: any) {
        if (pool) {
            try { await pool.close(); } catch {}
        }
        console.error('[API_PRESETS_GET_ERROR]', err);
        return NextResponse.json({ message: 'Error al obtener plantillas guardadas', error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    let pool: mssql.ConnectionPool | null = null;
    try {
        const body = await req.json();
        const { id, name, procedureId, description, filterValues, filterConfig, columnConfigs, selectedTotals, userId } = body;

        if (!name || !procedureId) {
            return NextResponse.json({ message: 'El nombre y el ID del procedimiento son requeridos.' }, { status: 400 });
        }

        pool = await getInternalPool();

        // Obtener un usuario válido para la FK (por defecto el admin con ID 1)
        const userRes = await pool.request().query('SELECT TOP 1 id FROM dbo.KAX_User ORDER BY id ASC');
        const validUserId = userId || userRes.recordset[0]?.id || 1;

        const fVal = JSON.stringify(filterValues || {});
        const fCfg = JSON.stringify(filterConfig || {});
        const cCfg = JSON.stringify(columnConfigs || []);
        const sTot = JSON.stringify(selectedTotals || []);

        if (id) {
            await pool.request()
                .input('id', mssql.Int, Number(id))
                .input('name', mssql.NVarChar, name)
                .input('description', mssql.NVarChar, description || '')
                .input('filterValues', mssql.NVarChar, fVal)
                .input('filterConfig', mssql.NVarChar, fCfg)
                .input('columnConfigs', mssql.NVarChar, cCfg)
                .input('selectedTotals', mssql.NVarChar, sTot)
                .query(`
                    UPDATE dbo.KAX_ExecutionPreset
                    SET name = @name,
                        description = @description,
                        filterValues = @filterValues,
                        filterConfig = @filterConfig,
                        columnConfigs = @columnConfigs,
                        selectedTotals = @selectedTotals,
                        updatedAt = SYSUTCDATETIME()
                    WHERE id = @id
                `);

            await pool.close();
            return NextResponse.json({ id: Number(id), name, procedureId, description, filterValues, filterConfig, columnConfigs, selectedTotals });
        } else {
            const insertRes = await pool.request()
                .input('procedureId', mssql.Int, Number(procedureId))
                .input('userId', mssql.Int, Number(validUserId))
                .input('name', mssql.NVarChar, name)
                .input('description', mssql.NVarChar, description || '')
                .input('filterValues', mssql.NVarChar, fVal)
                .input('filterConfig', mssql.NVarChar, fCfg)
                .input('columnConfigs', mssql.NVarChar, cCfg)
                .input('selectedTotals', mssql.NVarChar, sTot)
                .query(`
                    INSERT INTO dbo.KAX_ExecutionPreset (
                        procedureId, userId, name, description, filterValues, filterConfig,
                        columnConfigs, selectedTotals, createdAt, updatedAt
                    )
                    OUTPUT INSERTED.id
                    VALUES (
                        @procedureId, @userId, @name, @description, @filterValues, @filterConfig,
                        @columnConfigs, @selectedTotals, SYSUTCDATETIME(), SYSUTCDATETIME()
                    )
                `);

            const newId = insertRes.recordset[0]?.id;
            await pool.close();
            return NextResponse.json({ id: newId, name, procedureId, description, filterValues, filterConfig, columnConfigs, selectedTotals });
        }
    } catch (err: any) {
        if (pool) {
            try { await pool.close(); } catch {}
        }
        console.error('[API_PRESETS_POST_ERROR]', err);
        return NextResponse.json({ message: 'Error al guardar plantilla', error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    let pool: mssql.ConnectionPool | null = null;
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ message: 'El parámetro "id" es requerido.' }, { status: 400 });
        }

        pool = await getInternalPool();
        await pool.request()
            .input('id', mssql.Int, Number(id))
            .query('DELETE FROM dbo.KAX_ExecutionPreset WHERE id = @id');

        await pool.close();
        return NextResponse.json({ success: true, id: Number(id) });
    } catch (err: any) {
        if (pool) {
            try { await pool.close(); } catch {}
        }
        console.error('[API_PRESETS_DELETE_ERROR]', err);
        return NextResponse.json({ message: 'Error al eliminar plantilla', error: err.message }, { status: 500 });
    }
}
