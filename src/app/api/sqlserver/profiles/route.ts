import { NextRequest, NextResponse } from 'next/server';
import { SQLProfilesService, sanitizePayload } from '@/lib/korex-analytics';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const profiles = await SQLProfilesService.getAllProfiles();
        return NextResponse.json(sanitizePayload(profiles));
    } catch (err: any) {
        console.error('[API_PROFILES_GET_ERROR]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            id,
            name,
            server,
            instance,
            port,
            defaultDatabase,
            allowedDatabases,
            username,
            password,
            encrypt,
            trustServerCertificate,
            connectionTimeout,
            requestTimeout,
            isActive
        } = body;

        if (!name || !server || !defaultDatabase || !username) {
            return NextResponse.json(
                { success: false, message: 'Nombre, Servidor, Base de Datos y Usuario son obligatorios.' },
                { status: 400 }
            );
        }

        const saved = await SQLProfilesService.saveProfile({
            id: id ? Number(id) : undefined,
            name,
            server,
            instance: instance || '',
            port: Number(port) || 1433,
            defaultDatabase,
            allowedDatabases,
            username,
            password,
            encrypt,
            trustServerCertificate,
            connectionTimeout,
            requestTimeout,
            isActive: isActive !== undefined ? isActive : true
        });

        return NextResponse.json({ success: true, profile: sanitizePayload(saved) });
    } catch (err: any) {
        console.error('[API_PROFILES_POST_ERROR]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const url = new URL(req.url);
        let id = url.searchParams.get('id');
        if (!id) {
            const body = await req.json().catch(() => ({}));
            id = body.id;
        }

        if (!id) {
            return NextResponse.json({ success: false, message: 'ID de perfil es requerido para eliminar.' }, { status: 400 });
        }

        const deleted = await SQLProfilesService.deleteProfile(Number(id));
        return NextResponse.json({ success: deleted });
    } catch (err: any) {
        console.error('[API_PROFILES_DELETE_ERROR]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
