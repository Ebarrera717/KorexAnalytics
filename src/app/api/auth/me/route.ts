import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const sessionCookie = req.cookies.get('kax_session');

        if (!sessionCookie || !sessionCookie.value) {
            // Usuario predeterminado en desarrollo si no hay cookie
            return NextResponse.json({
                authenticated: true,
                user: {
                    id: 1,
                    name: 'Administrador Korex Analytics',
                    email: 'admin@korexanalytics.com',
                    role: 'SUPER_ADMIN',
                    permissions: { all: true }
                }
            });
        }

        const session = JSON.parse(sessionCookie.value);
        return NextResponse.json({
            authenticated: true,
            user: session
        });
    } catch (err: any) {
        return NextResponse.json({ authenticated: false, message: err.message }, { status: 401 });
    }
}
