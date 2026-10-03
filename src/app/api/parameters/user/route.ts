import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let userParamsStore: Record<number, Record<string, string>> = {
    1: {
        DefaultSQLProfileId: '1',
        DefaultDatabase: 'ZeusAgencias_23',
        MaxRecordsLimit: '5000',
        AutoExportFormat: 'EXCEL',
        ThemeMode: 'DARK'
    }
};

export async function GET(req: NextRequest) {
    const userId = Number(req.nextUrl.searchParams.get('userId') || 1);
    const params = userParamsStore[userId] || {};
    return NextResponse.json({ success: true, userId, parameters: params });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, parameters } = body;
        const uid = Number(userId || 1);

        userParamsStore[uid] = {
            ...(userParamsStore[uid] || {}),
            ...(parameters || {})
        };

        return NextResponse.json({ success: true, userId: uid, parameters: userParamsStore[uid] });
    } catch (err: any) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
