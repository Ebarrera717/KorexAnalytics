import { NextRequest, NextResponse } from 'next/server';
import { SQLProfilesService, SQLPoolManager } from '@/lib/korex-analytics';
import mssql from 'mssql';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    let pool: mssql.ConnectionPool | null = null;

    try {
        const { searchParams } = new URL(req.url);
        const type = (searchParams.get('type') || '').toLowerCase().trim();
        const search = (searchParams.get('search') || '').trim();
        const profileId = searchParams.get('profileId');
        const database = searchParams.get('database');

        if (!type) {
            return NextResponse.json({ message: 'El parámetro "type" es requerido.' }, { status: 400 });
        }

        let profile = null;
        if (profileId) {
            profile = await SQLProfilesService.getProfileById(Number(profileId));
        }
        if (!profile) {
            const all = await SQLProfilesService.getAllProfiles();
            profile = all.find(p => p.isActive) || all[0];
        }

        if (!profile) {
            return NextResponse.json({ message: 'No hay perfiles SQL Server configurados.' }, { status: 400 });
        }

        const targetDb = database || profile.defaultDatabase;
        const conn = await SQLPoolManager.getConnection(profile, targetDb);
        pool = conn.pool;

        const request = pool.request();
        let query = '';
        let searchClause = '';

        if (search) {
            request.input('search', mssql.VarChar, `%${search}%`);
        }

        switch (type) {
            case 'sucursales':
                searchClause = search ? 'WHERE cd_codigo LIKE @search OR ds_nombre LIKE @search' : '';
                query = `SELECT TOP 200 cd_codigo AS code, ds_nombre AS name FROM dbo.Sucursales ${searchClause} ORDER BY cd_codigo`;
                break;

            case 'implantes':
                searchClause = search ? 'WHERE cd_codigo LIKE @search OR ds_nombre LIKE @search' : '';
                query = `SELECT TOP 200 cd_codigo AS code, ds_nombre AS name FROM dbo.Implantes ${searchClause} ORDER BY cd_codigo`;
                break;

            case 'clientes':
                searchClause = search ? 'WHERE IDCLIENTE LIKE @search OR RAZONCIAL LIKE @search' : '';
                query = `SELECT TOP 200 IDCLIENTE AS code, RAZONCIAL AS name FROM dbo.CLIENTES ${searchClause} ORDER BY IDCLIENTE`;
                break;

            case 'vendedores':
                searchClause = search ? 'WHERE IDVENDE LIKE @search OR NOMBVENDE LIKE @search' : '';
                query = `SELECT TOP 200 IDVENDE AS code, NOMBVENDE AS name FROM dbo.MAEVENDE ${searchClause} ORDER BY IDVENDE`;
                break;

            case 'proveedores':
                searchClause = search ? 'WHERE IDPROVE LIKE @search OR RAZONCIAL LIKE @search' : '';
                query = `SELECT TOP 200 IDPROVE AS code, RAZONCIAL AS name FROM dbo.PROVEEDORES ${searchClause} ORDER BY IDPROVE`;
                break;

            case 'terceros':
                searchClause = search ? 'WHERE IDTERCERO LIKE @search OR NOMBRETER LIKE @search' : '';
                query = `SELECT TOP 200 IDTERCERO AS code, NOMBRETER AS name FROM dbo.Terceros ${searchClause} ORDER BY IDTERCERO`;
                break;

            case 'conceptos':
                searchClause = search ? 'WHERE cd_codigo LIKE @search OR ds_nombre LIKE @search' : '';
                query = `SELECT TOP 200 cd_codigo AS code, ds_nombre AS name FROM dbo.ConceptoFacturacion ${searchClause} ORDER BY cd_codigo`;
                break;

            case 'tiqueteadores':
                searchClause = search ? 'WHERE cd_codigo LIKE @search OR ds_nombre LIKE @search' : '';
                query = `SELECT TOP 200 cd_codigo AS code, ds_nombre AS name FROM dbo.Tiqueteadores ${searchClause} ORDER BY cd_codigo`;
                break;

            case 'segmentos':
                searchClause = search ? 'WHERE IDSEGMENTO LIKE @search OR DESSEGMENTO LIKE @search' : '';
                query = `SELECT TOP 200 IDSEGMENTO AS code, DESSEGMENTO AS name FROM dbo.Segmento ${searchClause} ORDER BY IDSEGMENTO`;
                break;

            case 'etapas':
                searchClause = search ? 'WHERE cd_codigo LIKE @search OR ds_nombre LIKE @search' : '';
                query = `SELECT TOP 200 cd_codigo AS code, ds_nombre AS name FROM dbo.Etapas ${searchClause} ORDER BY cd_codigo`;
                break;

            case 'tipoventa':
                searchClause = search ? 'WHERE cd_codigo LIKE @search OR ds_nombre LIKE @search' : '';
                query = `SELECT TOP 200 cd_codigo AS code, ds_nombre AS name FROM dbo.TipoVenta ${searchClause} ORDER BY cd_codigo`;
                break;

            case 'gruposempresariales':
                searchClause = search ? 'WHERE CodigoGrEmpresarial LIKE @search OR Nombre LIKE @search' : '';
                query = `SELECT TOP 200 CodigoGrEmpresarial AS code, Nombre AS name FROM dbo.GREmpresarial ${searchClause} ORDER BY CodigoGrEmpresarial`;
                break;

            case 'categorias':
                searchClause = search ? 'WHERE cd_codigo LIKE @search OR ds_nombre LIKE @search' : '';
                query = `SELECT TOP 200 cd_codigo AS code, ds_nombre AS name FROM dbo.Categorias ${searchClause} ORDER BY cd_codigo`;
                break;

            case 'cargosdesc':
                searchClause = search ? 'WHERE cd_codigo LIKE @search OR ds_nombre LIKE @search' : '';
                query = `SELECT TOP 200 cd_codigo AS code, ds_nombre AS name FROM dbo.CargosDesc ${searchClause} ORDER BY cd_codigo`;
                break;

            case 'ciudades':
            case 'aeropuertos':
                searchClause = search ? 'WHERE cd_Iata LIKE @search OR ds_nombre LIKE @search' : 'WHERE cd_Iata IS NOT NULL AND LEN(cd_Iata) = 3';
                query = `SELECT TOP 200 cd_Iata AS code, ds_nombre AS name FROM dbo.Ciudades ${searchClause} ORDER BY cd_Iata`;
                break;

            case 'paises':
                searchClause = search ? 'WHERE cd_codigo LIKE @search OR ds_nombre LIKE @search' : 'WHERE cd_codigo IS NOT NULL AND LTRIM(RTRIM(cd_codigo)) <> \'\'';
                query = `SELECT TOP 200 cd_codigo AS code, ds_nombre AS name FROM dbo.Paises ${searchClause} ORDER BY ds_nombre`;
                break;

            case 'farebasis':
                searchClause = search ? 'WHERE cd_farebasis LIKE @search' : 'WHERE cd_farebasis IS NOT NULL AND LTRIM(RTRIM(cd_farebasis)) <> \'\'';
                query = `SELECT DISTINCT TOP 200 cd_farebasis AS code, cd_farebasis AS name FROM dbo.Tiquetes_Itinerarios ${searchClause} ORDER BY cd_farebasis`;
                break;

            case 'farebasisreal':
                searchClause = search ? 'WHERE ti.cd_farebasis LIKE @search' : 'WHERE ti.cd_farebasis IS NOT NULL AND LTRIM(RTRIM(ti.cd_farebasis)) <> \'\'';
                query = `
                    IF OBJECT_ID('dbo.fnza_Get_TiqueteFarebasisReal', 'FN') IS NOT NULL
                    BEGIN
                        SELECT DISTINCT TOP 200 
                            dbo.fnza_Get_TiqueteFarebasisReal(ti.id_Tiquetes, ti.cd_farebasis, t.cd_tiquete) AS code,
                            dbo.fnza_Get_TiqueteFarebasisReal(ti.id_Tiquetes, ti.cd_farebasis, t.cd_tiquete) AS name
                        FROM dbo.Tiquetes_Itinerarios ti WITH(NOLOCK)
                        LEFT JOIN dbo.tiquetes t WITH(NOLOCK) ON t.id = ti.id_Tiquetes
                        ${searchClause}
                        ORDER BY code;
                    END
                    ELSE
                    BEGIN
                        SELECT DISTINCT TOP 200 cd_farebasis AS code, cd_farebasis AS name FROM dbo.Tiquetes_Itinerarios ti ${searchClause} ORDER BY cd_farebasis;
                    END
                `;
                break;

            case 'aerolineas':
                searchClause = search ? 'AND (e.cd_siglas LIKE @search OR e.cd_codigo LIKE @search OR e.ds_Alias LIKE @search OR p.RAZONCIAL LIKE @search)' : '';
                query = `
                    SELECT DISTINCT TOP 200 
                        COALESCE(NULLIF(LTRIM(RTRIM(e.cd_siglas)), ''), LTRIM(RTRIM(e.cd_codigo))) AS code,
                        ISNULL(NULLIF(LTRIM(RTRIM(e.ds_Alias)), ''), ISNULL(p.RAZONCIAL, e.cd_codigo)) AS name
                    FROM dbo.Entidades e WITH(NOLOCK)
                    LEFT JOIN dbo.PROVEEDORES p WITH(NOLOCK) ON p.IDPROVE = e.cd_proveedor
                    WHERE (e.bl_inactivo = 0 OR e.bl_inactivo IS NULL) ${searchClause}
                    ORDER BY code
                `;
                break;

            default:
                return NextResponse.json({ message: `Tipo de lookup desconocido: ${type}` }, { status: 400 });
        }

        const res = await request.query(query);
        const data = (res.recordset || []).map((row: any) => ({
            code: String(row.code || '').trim(),
            name: String(row.name || '').trim()
        }));

        return NextResponse.json(data);
    } catch (err: any) {
        console.error('[LOOKUP_API_ERROR]', err);
        return NextResponse.json({ message: err.message || 'Error al consultar datos de búsqueda en SQL Server' }, { status: 500 });
    } finally {
        if (pool) {
            try { await pool.close(); } catch {}
        }
    }
}
