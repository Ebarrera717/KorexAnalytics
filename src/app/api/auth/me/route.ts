import { NextRequest, NextResponse } from 'next/server';
import mssql from 'mssql';
import { getInternalDbPool } from '@/lib/kax-db';
import { normalizeRolePermissions } from '@/lib/kax-permissions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const sessionCookie = req.cookies.get('kax_session')?.value;
        if (!sessionCookie) {
            return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
        }

        let sessionData: any = null;
        try {
            sessionData = JSON.parse(sessionCookie);
        } catch {
            return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
        }

        if (!sessionData?.userId) {
            return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
        }

        const pool = await getInternalDbPool();
        const result = await pool.request()
            .input('userId', mssql.Int, sessionData.userId)
            .query(`
                SELECT TOP 1 
                    u.[id], u.[name], u.[email], u.[roleId], u.[isActive],
                    r.[name] AS [roleName], r.[permissions] AS [rolePermissions]
                FROM dbo.[KAX_User] u
                INNER JOIN dbo.[KAX_Role] r ON r.[id] = u.[roleId]
                WHERE u.[id] = @userId AND u.[isActive] = 1
            `);

        const dbUser = result.recordset[0];
        if (!dbUser) {
            const resp = NextResponse.json({ authenticated: false, user: null }, { status: 401 });
            resp.cookies.delete('kax_session');
            return resp;
        }

        let rawPerms = dbUser.rolePermissions;
        if (typeof rawPerms === 'string') {
            try { rawPerms = JSON.parse(rawPerms); } catch {}
        }
        const permissions = normalizeRolePermissions(rawPerms, dbUser.roleName);

        return NextResponse.json({
            authenticated: true,
            user: {
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
                roleId: dbUser.roleId,
                role: dbUser.roleName,
                permissions
            }
        });
    } catch (err: any) {
        console.error('[API_AUTH_ME] Error validando sesión:', err.message);
        return NextResponse.json({ authenticated: false, user: null, error: err.message }, { status: 500 });
    }
}
