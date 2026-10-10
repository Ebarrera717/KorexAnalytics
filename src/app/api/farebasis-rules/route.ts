import { NextRequest, NextResponse } from 'next/server';
import { FareBasisService } from '@/lib/korex-analytics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const isActiveParam = searchParams.get('isActive');
        const search = searchParams.get('search') || undefined;

        let isActive: boolean | undefined = undefined;
        if (isActiveParam === 'true' || isActiveParam === '1') isActive = true;
        else if (isActiveParam === 'false' || isActiveParam === '0') isActive = false;

        const rules = await FareBasisService.getAllRules(isActive, search);
        return NextResponse.json({ success: true, count: rules.length, rules });
    } catch (err: any) {
        console.error('[API_FAREBASIS_GET_ERROR]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, airlineCode, airlineName, startPos, length, separator, isActive } = body;

        if (!airlineCode || !airlineName) {
            return NextResponse.json(
                { success: false, message: 'Código y Nombre de la Aerolínea son requeridos.' },
                { status: 400 }
            );
        }

        const result = await FareBasisService.saveRule({
            id: id ? Number(id) : undefined,
            airlineCode: String(airlineCode).trim(),
            airlineName: String(airlineName).trim(),
            startPos: Number(startPos) || 1,
            length: Number(length) || 2,
            separator: separator || '/',
            isActive: isActive !== undefined ? Boolean(isActive) : true
        });

        return NextResponse.json({ success: true, savedId: result.savedId });
    } catch (err: any) {
        console.error('[API_FAREBASIS_POST_ERROR]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, message: 'El parámetro "id" es requerido.' }, { status: 400 });
        }

        await FareBasisService.deleteRule(Number(id));
        return NextResponse.json({ success: true, deletedId: Number(id) });
    } catch (err: any) {
        console.error('[API_FAREBASIS_DELETE_ERROR]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
