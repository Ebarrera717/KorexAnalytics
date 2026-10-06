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

export async function GET() {
    let pool: mssql.ConnectionPool | null = null;
    try {
        pool = await getInternalPool();
        const res = await pool.request().query(`
            SELECT id, name, spName, description, category, parametersConfig, isActive
            FROM dbo.KAX_ExecutionProcedure
            ORDER BY name ASC
        `);

        // Si está vacía la tabla, sembramos procedimientos por defecto
        if (res.recordset.length === 0) {
            const defaultParams = JSON.stringify([
                { name: 'fechaInicial', label: 'Fecha Inicial', type: 'date', defaultValue: 'FIRST_DAY_OF_MONTH', required: true },
                { name: 'fechaFinal', label: 'Fecha Final', type: 'date', defaultValue: 'TODAY', required: true },
                { name: 'cd_cliente', label: 'Cliente', type: 'text', lookupType: 'clientes', required: false },
                { name: 'cd_vendedor', label: 'Vendedor', type: 'text', lookupType: 'vendedores', required: false },
                { name: 'cd_sucursal', label: 'Sucursal', type: 'text', lookupType: 'sucursales', required: false }
            ]);

            await pool.request()
                .input('name', mssql.NVarChar, 'Análisis de Ventas por Período')
                .input('spName', mssql.NVarChar, 'spAnalisisVentasPeriodo')
                .input('description', mssql.NVarChar, 'Reporte consolidado de ventas y movimientos por rango de fechas y sucursal.')
                .input('category', mssql.NVarChar, 'VENTAS')
                .input('parametersConfig', mssql.NVarChar, defaultParams)
                .query(`
                    INSERT INTO dbo.KAX_ExecutionProcedure (name, spName, description, category, parametersConfig, isActive)
                    VALUES (@name, @spName, @description, @category, @parametersConfig, 1)
                `);

            const reQuery = await pool.request().query(`
                SELECT id, name, spName, description, category, parametersConfig, isActive
                FROM dbo.KAX_ExecutionProcedure
                ORDER BY name ASC
            `);
            await pool.close();

            return NextResponse.json(reQuery.recordset.map(row => ({
                id: row.id,
                name: row.name,
                spName: row.spName,
                description: row.description,
                category: row.category,
                parameters: row.parametersConfig ? JSON.parse(row.parametersConfig) : []
            })));
        }

        await pool.close();

        const procedures = res.recordset.map(row => {
            let parsedParams = [];
            try {
                parsedParams = typeof row.parametersConfig === 'string'
                    ? JSON.parse(row.parametersConfig)
                    : (row.parametersConfig || []);
            } catch {
                parsedParams = [];
            }

            return {
                id: row.id,
                name: row.name,
                spName: row.spName,
                description: row.description,
                category: row.category || 'ANALYTICS',
                parameters: parsedParams
            };
        });

        return NextResponse.json(procedures);
    } catch (err: any) {
        if (pool) {
            try { await pool.close(); } catch {}
        }
        console.error('[API_PROCEDURES_GET_ERROR]', err);
        return NextResponse.json({ message: 'Error al obtener procedimientos', error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    let pool: mssql.ConnectionPool | null = null;
    try {
        const body = await req.json();
        const { id, name, spName, description, category, parameters } = body;

        if (!name || !spName) {
            return NextResponse.json({ message: 'El nombre y el nombre de Stored Procedure son requeridos.' }, { status: 400 });
        }

        pool = await getInternalPool();
        const paramsJson = JSON.stringify(parameters || []);

        if (id) {
            await pool.request()
                .input('id', mssql.Int, Number(id))
                .input('name', mssql.NVarChar, name)
                .input('spName', mssql.NVarChar, spName)
                .input('description', mssql.NVarChar, description || '')
                .input('category', mssql.NVarChar, category || 'ANALYTICS')
                .input('parametersConfig', mssql.NVarChar, paramsJson)
                .query(`
                    UPDATE dbo.KAX_ExecutionProcedure
                    SET name = @name,
                        spName = @spName,
                        description = @description,
                        category = @category,
                        parametersConfig = @parametersConfig,
                        updatedAt = SYSUTCDATETIME()
                    WHERE id = @id
                `);

            await pool.close();
            return NextResponse.json({ id: Number(id), name, spName, description, category, parameters: parameters || [] });
        } else {
            const insertRes = await pool.request()
                .input('name', mssql.NVarChar, name)
                .input('spName', mssql.NVarChar, spName)
                .input('description', mssql.NVarChar, description || '')
                .input('category', mssql.NVarChar, category || 'ANALYTICS')
                .input('parametersConfig', mssql.NVarChar, paramsJson)
                .query(`
                    INSERT INTO dbo.KAX_ExecutionProcedure (name, spName, description, category, parametersConfig, isActive)
                    OUTPUT INSERTED.id
                    VALUES (@name, @spName, @description, @category, @parametersConfig, 1)
                `);

            const newId = insertRes.recordset[0]?.id;
            await pool.close();
            return NextResponse.json({ id: newId, name, spName, description, category, parameters: parameters || [] });
        }
    } catch (err: any) {
        if (pool) {
            try { await pool.close(); } catch {}
        }
        console.error('[API_PROCEDURES_POST_ERROR]', err);
        return NextResponse.json({ message: 'Error al guardar procedimiento', error: err.message }, { status: 500 });
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
            .query('DELETE FROM dbo.KAX_ExecutionProcedure WHERE id = @id');

        await pool.close();
        return NextResponse.json({ success: true, id: Number(id) });
    } catch (err: any) {
        if (pool) {
            try { await pool.close(); } catch {}
        }
        console.error('[API_PROCEDURES_DELETE_ERROR]', err);
        return NextResponse.json({ message: 'Error al eliminar procedimiento', error: err.message }, { status: 500 });
    }
}
