import { NextRequest, NextResponse } from 'next/server';
import { SQLProfilesService, SQLPoolManager } from '@/lib/korex-analytics';
import mssql from 'mssql';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    let pool: mssql.ConnectionPool | null = null;

    try {
        const { searchParams } = new URL(req.url);
        let spName = (searchParams.get('spName') || '').trim();
        const profileId = searchParams.get('profileId');
        const database = searchParams.get('database');

        if (!spName) {
            return NextResponse.json({ message: 'El parámetro "spName" es requerido.' }, { status: 400 });
        }

        // Obtener el perfil de conexión SQL Server
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
        request.input('spName', mssql.NVarChar, spName);

        const query = `
            SELECT 
                p.name AS param_name,
                t.name AS type_name,
                p.max_length,
                p.is_output
            FROM sys.parameters p
            JOIN sys.types t ON p.user_type_id = t.user_type_id
            WHERE p.object_id = OBJECT_ID(@spName)
               OR p.object_id = OBJECT_ID('dbo.' + REPLACE(REPLACE(@spName, 'dbo.', ''), '[', ''))
               OR p.object_id = OBJECT_ID('[dbo].[' + REPLACE(REPLACE(REPLACE(@spName, 'dbo.', ''), '[', ''), ']', '') + ']')
               OR p.object_id = (
                   SELECT TOP 1 pr.object_id 
                   FROM sys.procedures pr 
                   WHERE pr.name = @spName 
                      OR pr.name = REPLACE(REPLACE(REPLACE(@spName, 'dbo.', ''), '[', ''), ']', '')
               )
            ORDER BY p.parameter_id
        `;

        const result = await request.query(query);
        const recordset = result.recordset || [];

        if (recordset.length === 0) {
            return NextResponse.json({
                success: false,
                message: `No se encontraron parámetros en SQL Server para "${spName}". Verifica que el procedimiento exista en la base "${targetDb}".`
            }, { status: 404 });
        }

        const knownLookups: Record<string, string> = {
            cd_sucursal: 'sucursales',
            cd_implante: 'implantes',
            cd_cliente: 'clientes',
            cd_vendedor: 'vendedores',
            cd_proveedor: 'proveedores',
            cd_tercero: 'terceros',
            grupo_empresarial: 'gruposempresariales',
            cd_conceptofacturacion: 'conceptos',
            cd_tiqueteador: 'tiqueteadores',
            id_segmento: 'segmentos',
            ds_etapascotizacion: 'etapas',
            ds_tipoventa: 'tipoventa',
            ds_categorias: 'categorias',
            ds_cargosdescadicional: 'cargosdesc',
            ds_impretadicional: 'impret',
            ds_conceptosadicional: 'conceptos',
            ds_conceptosunificados: 'conceptos',
            cd_ciudadorigen: 'ciudades',
            cd_segundaciudad: 'ciudades',
            cd_ciudaditinerario: 'ciudades',
            cd_paisorigen: 'paises',
            cd_paisdestino: 'paises',
            cd_paisitinerario: 'paises',
            cd_farebasis: 'farebasis'
        };

        const selectFields = [
            'nacionalidad',
            'remision',
            'remfacturadas',
            'facgeneradasrem',
            'soloconceptosventa',
            'nomostrarfeeocultos',
            'mostrarcombustible',
            'mostrartaocemcolumnas',
            'mostraranulacion',
            'porfechadocumento',
            'mostrarsolorevisados',
            'revisado'
        ];

        const formattedParams = recordset.map((row: any) => {
            const rawName = (row.param_name || '').replace(/^@/, '');
            const lowerName = rawName.toLowerCase();
            const typeName = (row.type_name || '').toLowerCase();

            // 1. Etiqueta amigable
            let label = rawName
                .replace(/_/g, ' ')
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/^cd /, 'Código ')
                .replace(/^ds /, 'Descripción ')
                .replace(/^id /, 'ID ');

            if (lowerName === 'fecha_salida_inicio') label = 'Fecha Salida (Desde)';
            else if (lowerName === 'fecha_salida_fin') label = 'Fecha Salida (Hasta)';
            else if (lowerName === 'fecha_llegada_inicio') label = 'Fecha Llegada (Desde)';
            else if (lowerName === 'fecha_llegada_fin') label = 'Fecha Llegada (Hasta)';
            else if (lowerName === 'cd_paisorigen') label = 'País Origen';
            else if (lowerName === 'cd_paisdestino') label = 'País Destino';
            else if (lowerName === 'cd_paisitinerario') label = 'País en Itinerario';
            else if (lowerName === 'cd_farebasis') label = 'Fare Basis';
            else if (lowerName === 'mostrarsolorevisados' || lowerName === 'revisado') label = 'Solo Revisados';
            else {
                label = label.charAt(0).toUpperCase() + label.slice(1);
            }

            // 2. Detección de tipos
            let type: 'text' | 'date' | 'select' | 'number' = 'text';
            let options: { label: string; value: string }[] | undefined = undefined;
            let defaultValue = '';

            if (typeName.includes('date') || typeName.includes('time') || lowerName.includes('fecha') || lowerName.startsWith('dt_')) {
                type = 'date';
                if (lowerName.includes('salida') || lowerName.includes('llegada')) {
                    // Fechas de vuelo opcionales: no pre-poblar para no restringir vuelos futuros por defecto
                    defaultValue = '';
                } else if (lowerName.includes('inicio') || lowerName.includes('start') || lowerName.includes('desde') || lowerName.includes('dt_desde')) {
                    defaultValue = 'FIRST_DAY_OF_MONTH';
                } else if (lowerName.includes('fin') || lowerName.includes('end') || lowerName.includes('hasta') || lowerName.includes('dt_hasta')) {
                    defaultValue = 'TODAY';
                }
            } else if (selectFields.some((f) => lowerName.includes(f))) {
                type = 'select';
                if (lowerName === 'nacionalidad') {
                    options = [
                        { label: 'Todos / Ambas', value: '' },
                        { label: 'Nacional', value: 'Nacional' },
                        { label: 'Internacional', value: 'Internacional' }
                    ];
                } else {
                    options = [
                        { label: 'Seleccionar...', value: '' },
                        { label: 'Sí', value: 'SI' },
                        { label: 'No', value: 'NO' }
                    ];
                    defaultValue = lowerName === 'mostrarcombustible' ? 'SI' : 'NO';
                }
            } else if (typeName.includes('int') || typeName.includes('decimal') || typeName.includes('numeric') || typeName.includes('float')) {
                type = 'number';
            }

            // 3. Lookups
            const lookupType = knownLookups[lowerName] || undefined;

            // 4. Secciones
            let section = 'Filtros Generales';
            if (type === 'date' || lowerName.includes('fech') || lowerName.startsWith('dt_')) {
                section = 'Fechas';
            } else if (lowerName.includes('ciudad') || lowerName.includes('ruta') || lowerName.includes('itinerario') || lowerName.includes('origen') || lowerName.includes('destino') || lowerName.includes('pais') || lowerName.includes('farebasis')) {
                section = 'Rutas & Itinerarios';
            } else if (lowerName.includes('remision') || lowerName.includes('concepto') || lowerName.includes('factura') || lowerName.includes('cargo') || lowerName.includes('impuesto')) {
                section = 'Documentos & Conceptos';
            } else if (lowerName.includes('mostrar') || lowerName.includes('categoria') || lowerName.includes('variable') || lowerName.includes('etapa') || lowerName.includes('venta') || lowerName.includes('revisado')) {
                section = 'Opciones de Reporte';
            }

            return {
                name: rawName,
                label,
                type,
                lookupType,
                section,
                defaultValue,
                options,
                required: false
            };
        });

        return NextResponse.json({
            success: true,
            spName,
            count: formattedParams.length,
            parameters: formattedParams
        });
    } catch (err: any) {
        console.error('[DETECT_PARAMS_ERROR]', err);
        return NextResponse.json({
            success: false,
            message: err.message || 'Error al conectar con SQL Server para detectar los parámetros.'
        }, { status: 500 });
    } finally {
        if (pool) {
            try { await pool.close(); } catch {}
        }
    }
}
