import { NextRequest, NextResponse } from 'next/server';
import mssql from 'mssql';
import { executeInternalProcedure } from '@/lib/kax-db';
import { hashUserPassword } from '@/lib/security';
import { AuditLogger } from '@/lib/audit-logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const usersResult = await executeInternalProcedure('dbo.spKAX_UserListar', {});
        const rolesResult = await executeInternalProcedure('dbo.spKAX_RoleListar', {});

        const users = (usersResult.recordset || []).map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            roleId: u.roleId,
            roleName: u.roleName,
            isActive: Boolean(u.isActive),
            lastLoginAt: u.lastLoginAt,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt
        }));

        const roles = (rolesResult.recordset || []).map(r => ({
            id: r.id,
            name: r.name,
            description: r.description,
            permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions,
            isActive: Boolean(r.isActive)
        }));

        return NextResponse.json({
            success: true,
            users,
            roles
        });
    } catch (err: any) {
        console.error('[API_USERS] Error al listar usuarios y roles:', err.message);
        return NextResponse.json(
            { success: false, message: 'Error al obtener usuarios', error: err.message },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, name, email, password, roleId, isActive } = body;

        if (!name || !email || !roleId) {
            return NextResponse.json(
                { success: false, message: 'Nombre, email y rol son obligatorios.' },
                { status: 400 }
            );
        }

        let passwordHash: string | null = null;
        if (password && password.trim().length > 0) {
            passwordHash = await hashUserPassword(password.trim());
        }

        const result = await executeInternalProcedure(
            'dbo.spKAX_UserGuardar',
            {
                id: { type: mssql.Int, value: id ? parseInt(id, 10) : null },
                name: { type: mssql.NVarChar(150), value: name.trim() },
                email: { type: mssql.NVarChar(255), value: email.trim().toLowerCase() },
                passwordHash: { type: mssql.NVarChar(255), value: passwordHash },
                roleId: { type: mssql.Int, value: parseInt(roleId, 10) },
                isActive: { type: mssql.Bit, value: isActive !== undefined ? (isActive ? 1 : 0) : 1 }
            },
            {
                savedId: mssql.Int
            }
        );

        const savedId = result.output.savedId || id;

        await AuditLogger.log({
            action: id ? 'USER_UPDATED' : 'USER_CREATED',
            module: 'USERS',
            ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
            details: { userId: savedId, email, roleId }
        });

        return NextResponse.json({
            success: true,
            message: id ? 'Usuario actualizado exitosamente.' : 'Usuario creado exitosamente.',
            savedId
        });
    } catch (err: any) {
        console.error('[API_USERS] Error al guardar usuario:', err.message);
        return NextResponse.json(
            { success: false, message: 'Error al registrar usuario', error: err.message },
            { status: 500 }
        );
    }
}
