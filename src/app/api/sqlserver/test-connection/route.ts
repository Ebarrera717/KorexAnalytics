import { NextRequest, NextResponse } from 'next/server';
import { SQLProfilesService } from '@/lib/korex-analytics';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, server, instance, port, defaultDatabase, username, password, encrypt, trustServerCertificate } = body;

        const result = await SQLProfilesService.testConnection({
            id: id ? Number(id) : undefined,
            server,
            instance,
            port: port ? Number(port) : undefined,
            defaultDatabase,
            username,
            password,
            encrypt,
            trustServerCertificate
        });

        return NextResponse.json(result);
    } catch (err: any) {
        console.error('[API_TEST_CONNECTION_ERROR]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
