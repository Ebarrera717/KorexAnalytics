import { NextRequest, NextResponse } from 'next/server';
import { verifyUserPassword } from '@/lib/korex-analytics';
import { AuditLogger } from '@/lib/korex-analytics';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ success: false, message: 'Email y contraseña son requeridos.' }, { status: 400 });
        }

        // Mock/Seed user lookup (en producción consulta dbo.KAX_User)
        // Credencial por defecto del Administrador: admin@korexanalytics.com / Admin2026!*
        const validEmail = 'admin@korexanalytics.com';
        const validHash = '$2a$10$wT0lVl.7yJdCgUfF3E6C4.jN7B8jL3V9B4v0Tq1mB9i7W4f5L6J7y';

        let isValid = false;
        if (email.toLowerCase().trim() === validEmail) {
            isValid = await verifyUserPassword(password, validHash);
        }

        if (!isValid) {
            await AuditLogger.log({
                action: 'LOGIN_FAILED',
                module: 'AUTH',
                ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
                details: { email }
            });
            return NextResponse.json({ success: false, message: 'Credenciales inválidas o usuario inactivo.' }, { status: 401 });
        }

        const user = {
            id: 1,
            name: 'Administrador Korex Analytics',
            email: validEmail,
            role: 'SUPER_ADMIN',
            permissions: { all: true }
        };

        await AuditLogger.log({
            userId: user.id,
            userName: user.name,
            action: 'LOGIN_SUCCESS',
            module: 'AUTH',
            ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
            details: { email: user.email, role: user.role }
        });

        const response = NextResponse.json({
            success: true,
            message: 'Autenticación exitosa',
            user
        });

        // Configurar cookie de sesión segura HttpOnly
        response.cookies.set('kax_session', JSON.stringify({ userId: user.id, email: user.email, role: user.role }), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 8, // 8 horas
            path: '/'
        });

        return response;
    } catch (err: any) {
        console.error('[KAX_AUTH_LOGIN] Error:', err);
        return NextResponse.json({ success: false, message: 'Error interno en autenticación', error: err.message }, { status: 500 });
    }
}
