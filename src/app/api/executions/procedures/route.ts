import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let proceduresStore = [
    {
        id: 1,
        name: 'Análisis de Ventas por Período',
        spName: 'spAnalisisVentasPeriodo',
        description: 'Reporte consolidado de ventas y movimientos por rango de fechas y sucursal.',
        category: 'VENTAS',
        parameters: [
            { name: 'fechaInicial', label: 'Fecha Inicial', type: 'date', required: true },
            { name: 'fechaFinal', label: 'Fecha Final', type: 'date', required: true },
            { name: 'idCliente', label: 'ID Cliente (Opcional)', type: 'text', required: false }
        ]
    },
    {
        id: 2,
        name: 'Kardex y Movimientos de Inventario',
        spName: 'spKardexMovimientos',
        description: 'Detalle de entradas, salidas y saldos por artículo y bodega.',
        category: 'INVENTARIOS',
        parameters: [
            { name: 'fechaDesde', label: 'Desde', type: 'date', required: true },
            { name: 'fechaHasta', label: 'Hasta', type: 'date', required: true },
            { name: 'codigoArticulo', label: 'Código Artículo', type: 'text', required: false }
        ]
    },
    {
        id: 3,
        name: 'Estado de Cartera y Saldos Pendientes',
        spName: 'spCarteraSaldosPendientes',
        description: 'Análisis de vencimientos de cuentas por cobrar y edades de cartera.',
        category: 'FINANCIERO',
        parameters: [
            { name: 'fechaCorte', label: 'Fecha de Corte', type: 'date', required: true },
            { name: 'diasVencimiento', label: 'Días Mínimos de Vencimiento', type: 'number', defaultValue: '30', required: false }
        ]
    }
];

export async function GET() {
    return NextResponse.json(proceduresStore);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, name, spName, description, category, parameters } = body;

        if (!name || !spName) {
            return NextResponse.json({ success: false, message: 'Nombre y SP son obligatorios.' }, { status: 400 });
        }

        if (id) {
            const idx = proceduresStore.findIndex(p => p.id === Number(id));
            if (idx >= 0) {
                proceduresStore[idx] = {
                    ...proceduresStore[idx],
                    name,
                    spName,
                    description,
                    category: category || 'ANALYTICS',
                    parameters: parameters || []
                };
                return NextResponse.json({ success: true, procedure: proceduresStore[idx] });
            }
        }

        const newId = proceduresStore.length > 0 ? Math.max(...proceduresStore.map(p => p.id)) + 1 : 1;
        const newProc = {
            id: newId,
            name,
            spName,
            description,
            category: category || 'ANALYTICS',
            parameters: parameters || []
        };
        proceduresStore.push(newProc);
        return NextResponse.json({ success: true, procedure: newProc });
    } catch (err: any) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
