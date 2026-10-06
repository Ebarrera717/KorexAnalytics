import { NextRequest, NextResponse } from 'next/server';
import { getStoredLicenseStatus, applyLicense, verifyLicenseKey } from '@/lib/kax-license';
import { AuditLogger } from '@/lib/audit-logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const licenseStatus = await getStoredLicenseStatus();

        const response = NextResponse.json({
            success: true,
            ...licenseStatus
        });

        // Sincronizar cookie de verificación de licencia para Edge Middleware
        if (licenseStatus.status === 'UNLICENSED' || !licenseStatus.isLicensed) {
            response.cookies.set('kax_lic_exp', 'UNLICENSED', {
                path: '/',
                httpOnly: false,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30
            });
        } else if (licenseStatus.isExpired) {
            response.cookies.set('kax_lic_exp', 'EXPIRED', {
                path: '/',
                httpOnly: false,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30
            });
        } else if (licenseStatus.expirationDate) {
            response.cookies.set('kax_lic_exp', licenseStatus.expirationDate, {
                path: '/',
                httpOnly: false,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 30
            });
        }

        return response;
    } catch (err: any) {
        console.error('[API_LICENSE] Error al consultar licencia:', err.message);
        return NextResponse.json(
            { success: false, message: 'Error al consultar estado de la licencia', error: err.message },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { licenseKey, clientName, nit } = body;

        if (!licenseKey || typeof licenseKey !== 'string') {
            return NextResponse.json(
                { success: false, message: 'La clave de licencia es requerida.' },
                { status: 400 }
            );
        }

        const result = await applyLicense(licenseKey, clientName, nit);

        if (!result.success) {
            await AuditLogger.log({
                action: 'LICENSE_ACTIVATION_FAILED',
                module: 'AUTH',
                ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
                details: { error: result.message, clientName, nit }
            });

            return NextResponse.json(
                { success: false, message: result.message },
                { status: 400 }
            );
        }

        await AuditLogger.log({
            action: 'LICENSE_ACTIVATION_SUCCESS',
            module: 'AUTH',
            ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
            details: { clientName: result.license?.client, expirationDate: result.license?.expirationDate }
        });

        const response = NextResponse.json({
            success: true,
            message: result.message,
            license: result.license
        });

        // Actualizar cookie con la fecha de expiración válida
        if (result.license?.expirationDate) {
            response.cookies.set('kax_lic_exp', result.license.expirationDate, {
                path: '/',
                httpOnly: false,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 365
            });
        }

        return response;
    } catch (err: any) {
        console.error('[API_LICENSE] Error al activar licencia:', err.message);
        return NextResponse.json(
            { success: false, message: 'Error al procesar activación de licencia', error: err.message },
            { status: 500 }
        );
    }
}
