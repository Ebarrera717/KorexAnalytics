import { NextRequest, NextResponse } from 'next/server';
import { encryptDatabasePassword, sanitizePayload } from '@/lib/korex-analytics';

export const dynamic = 'force-dynamic';

// Perfiles en memoria / mock inicial para operación inmediata
let profilesStore = [
    {
        id: 1,
        name: 'Producción Central (Zeus ERP)',
        server: '127.0.0.1',
        instance: '',
        port: 1433,
        defaultDatabase: 'ZeusAgencias_23',
        allowedDatabases: ['ZeusAgencias_23', 'ZeusContabilidad_23', 'Korex_pruebas'],
        username: 'sa',
        encryptedPassword: encryptDatabasePassword(''),
        encrypt: false,
        trustServerCertificate: true,
        connectionTimeout: 15,
        requestTimeout: 180,
        isActive: true
    },
    {
        id: 2,
        name: 'Data Warehouse & Analítica',
        server: '127.0.0.1',
        instance: '',
        port: 1433,
        defaultDatabase: 'Korex_pruebas',
        allowedDatabases: ['Korex_pruebas'],
        username: 'sa',
        encryptedPassword: encryptDatabasePassword(''),
        encrypt: false,
        trustServerCertificate: true,
        connectionTimeout: 15,
        requestTimeout: 180,
        isActive: true
    }
];

export async function GET() {
    return NextResponse.json(sanitizePayload(profilesStore));
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, name, server, instance, port, defaultDatabase, allowedDatabases, username, password, isActive } = body;

        if (!name || !server || !defaultDatabase || !username) {
            return NextResponse.json({ success: false, message: 'Nombre, Servidor, Base de Datos y Usuario son obligatorios.' }, { status: 400 });
        }

        if (id) {
            const idx = profilesStore.findIndex(p => p.id === Number(id));
            if (idx >= 0) {
                profilesStore[idx] = {
                    ...profilesStore[idx],
                    name,
                    server,
                    instance: instance || '',
                    port: Number(port) || 1433,
                    defaultDatabase,
                    allowedDatabases: Array.isArray(allowedDatabases) ? allowedDatabases : [defaultDatabase],
                    username,
                    encryptedPassword: password ? encryptDatabasePassword(password) : profilesStore[idx].encryptedPassword,
                    isActive: isActive !== undefined ? isActive : true
                };
                return NextResponse.json({ success: true, profile: sanitizePayload(profilesStore[idx]) });
            }
        }

        const newId = profilesStore.length > 0 ? Math.max(...profilesStore.map(p => p.id)) + 1 : 1;
        const newProfile = {
            id: newId,
            name,
            server,
            instance: instance || '',
            port: Number(port) || 1433,
            defaultDatabase,
            allowedDatabases: Array.isArray(allowedDatabases) ? allowedDatabases : [defaultDatabase],
            username,
            encryptedPassword: encryptDatabasePassword(password || ''),
            encrypt: false,
            trustServerCertificate: true,
            connectionTimeout: 15,
            requestTimeout: 180,
            isActive: true
        };

        profilesStore.push(newProfile);
        return NextResponse.json({ success: true, profile: sanitizePayload(newProfile) });
    } catch (err: any) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
