import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let presetsStore: any[] = [];

export async function GET(req: NextRequest) {
    const procedureId = req.nextUrl.searchParams.get('procedureId');
    if (procedureId) {
        const filtered = presetsStore.filter(p => p.procedureId === Number(procedureId));
        return NextResponse.json(filtered);
    }
    return NextResponse.json(presetsStore);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, procedureId, name, description, filterValues, columnConfigs, selectedTotals } = body;

        if (!name || !procedureId) {
            return NextResponse.json({ success: false, message: 'Nombre y Procedimiento son obligatorios.' }, { status: 400 });
        }

        if (id) {
            const idx = presetsStore.findIndex(p => p.id === Number(id));
            if (idx >= 0) {
                presetsStore[idx] = {
                    ...presetsStore[idx],
                    name,
                    description,
                    filterValues: filterValues || {},
                    columnConfigs: columnConfigs || [],
                    selectedTotals: selectedTotals || []
                };
                return NextResponse.json({ success: true, preset: presetsStore[idx] });
            }
        }

        const newId = presetsStore.length > 0 ? Math.max(...presetsStore.map(p => p.id)) + 1 : 1;
        const newPreset = {
            id: newId,
            procedureId: Number(procedureId),
            name,
            description,
            filterValues: filterValues || {},
            columnConfigs: columnConfigs || [],
            selectedTotals: selectedTotals || []
        };
        presetsStore.push(newPreset);
        return NextResponse.json({ success: true, preset: newPreset });
    } catch (err: any) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
