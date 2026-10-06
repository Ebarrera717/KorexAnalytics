import { NextResponse, NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // 1. Rutas públicas excluidas de bloqueo
    if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/licencia-expirada') ||
        pathname.startsWith('/api/auth/login') ||
        pathname.startsWith('/api/auth/logout') ||
        pathname.startsWith('/api/license') ||
        pathname.startsWith('/_next') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // 2. Verificación de Licenciamiento en Edge Runtime
    const licExpCookie = req.cookies.get('kax_lic_exp')?.value;
    let isLicenseBlocked = false;

    if (licExpCookie === 'EXPIRED' || licExpCookie === 'UNLICENSED') {
        isLicenseBlocked = true;
    } else if (licExpCookie) {
        const expDate = new Date(`${licExpCookie}T23:59:59.999Z`);
        if (isNaN(expDate.getTime()) || new Date() > expDate) {
            isLicenseBlocked = true;
        }
    }

    if (isLicenseBlocked) {
        if (pathname.startsWith('/api')) {
            return NextResponse.json(
                { message: 'La licencia de Korex Analytics ha expirado o no ha sido activada. Por favor active una clave de licencia válida.' },
                { status: 402 } // Payment Required
            );
        }
        return NextResponse.redirect(new URL('/licencia-expirada', req.url));
    }

    // 3. Verificación de Autenticación de Usuario (si REQUIRE_AUTH está activo o hay rutas protegidas de usuarios)
    const sessionCookie = req.cookies.get('kax_session')?.value;
    const requireAuth = process.env.KAX_REQUIRE_AUTH === 'true';

    if (requireAuth && !sessionCookie) {
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
        '/api/:path*'
    ],
};
