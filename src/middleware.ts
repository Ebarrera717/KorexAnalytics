import { NextResponse, NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // 1. Rutas públicas del sistema e infraestructura que NUNCA se bloquean
    if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/licencia-expirada') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/license') ||
        pathname.startsWith('/_next') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // 2. Verificación de Licenciamiento en Edge Runtime
    const licExpCookie = req.cookies.get('kax_lic_exp')?.value;

    let isLicenseBlocked = false;
    if (!licExpCookie || licExpCookie === 'EXPIRED' || licExpCookie === 'UNLICENSED') {
        isLicenseBlocked = true;
    } else {
        const expDate = new Date(`${licExpCookie}T23:59:59.999Z`);
        if (isNaN(expDate.getTime()) || new Date() > expDate) {
            isLicenseBlocked = true;
        }
    }

    // Si la licencia no está activa o expiró, bloquear acceso y dirigir a /licencia-expirada
    if (isLicenseBlocked) {
        if (pathname.startsWith('/api')) {
            return NextResponse.json(
                { message: 'La licencia de Korex Analytics ha expirado o no ha sido activada. Ingrese una clave válida en /licencia-expirada.' },
                { status: 402 } // Payment Required
            );
        }
        const redirectLic = NextResponse.redirect(new URL('/licencia-expirada', req.url));
        if (!licExpCookie) {
            redirectLic.cookies.set('kax_lic_exp', 'UNLICENSED', { path: '/' });
        }
        return redirectLic;
    }

    // 3. Verificación obligatoria de Sesión de Usuario (Autenticación requerida)
    const sessionCookie = req.cookies.get('kax_session')?.value;

    if (!sessionCookie) {
        if (pathname.startsWith('/api')) {
            return NextResponse.json({ message: 'No autorizado. Se requiere iniciar sesión.' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/',
        '/executions/:path*',
        '/sqlserver/:path*',
        '/parameters/:path*',
        '/history/:path*',
        '/users/:path*',
        '/login',
        '/api/:path*'
    ],
};
