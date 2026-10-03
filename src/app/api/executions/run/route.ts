import { NextRequest, NextResponse } from 'next/server';
import { ExecutionRunner, decryptDatabasePassword } from '@/lib/korex-analytics';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Hasta 5 minutos para SPs analíticos

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { profile, targetDatabase, spName, parameters, userId, userName } = body;

        if (!profile || !spName) {
            return NextResponse.json({ success: false, message: 'Perfil SQL y Stored Procedure son obligatorios.' }, { status: 400 });
        }

        const runnerReq = {
            profile: {
                ...profile,
                encryptedPassword: profile.encryptedPassword
            },
            targetDatabase: targetDatabase || profile.defaultDatabase,
            spName,
            parameters: parameters || {},
            userId: userId || 1,
            userName: userName || 'Admin',
            ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
            userAgent: req.headers.get('user-agent') || 'Korex-Analytics-Web'
        };

        const result = await ExecutionRunner.run(runnerReq);
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
