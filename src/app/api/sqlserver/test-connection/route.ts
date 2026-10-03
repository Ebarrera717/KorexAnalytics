import { NextRequest, NextResponse } from 'next/server';
import { SQLPoolManager } from '@/lib/korex-analytics';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { server, instance, port, defaultDatabase, username, password } = body;

        const profileConfig = {
            id: 0,
            name: 'Prueba de Conexión',
            server: server || '127.0.0.1',
            instance: instance || '',
            port: Number(port) || 1433,
            defaultDatabase: defaultDatabase || 'master',
            username: username || 'sa',
            plainPassword: password || '',
            encrypt: false,
            trustServerCertificate: true,
            connectionTimeout: 10
        };

        const result = await SQLPoolManager.testConnection(profileConfig);
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
