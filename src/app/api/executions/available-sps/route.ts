import { NextRequest, NextResponse } from 'next/server';
import { SQLProfilesService, SQLPoolManager } from '@/lib/korex-analytics';
import mssql from 'mssql';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    let pool: mssql.ConnectionPool | null = null;

    try {
        const { searchParams } = new URL(req.url);
        const profileId = searchParams.get('profileId');
        const database = searchParams.get('database');

        let profile = null;
        if (profileId) {
            profile = await SQLProfilesService.getProfileById(Number(profileId));
        }
        if (!profile) {
            const all = await SQLProfilesService.getAllProfiles();
            profile = all.find(p => p.isActive) || all[0];
        }

        if (!profile) {
            return NextResponse.json({ success: false, message: 'No hay perfiles configurados.' }, { status: 400 });
        }

        const targetDb = database || profile.defaultDatabase;
        const conn = await SQLPoolManager.getConnection(profile, targetDb);
        pool = conn.pool;

        const res = await pool.request().query(`
            SELECT ROUTINE_NAME AS name 
            FROM INFORMATION_SCHEMA.ROUTINES 
            WHERE ROUTINE_TYPE = 'PROCEDURE' 
            ORDER BY ROUTINE_NAME ASC
        `);

        const procedures = res.recordset.map((r: any) => r.name);
        return NextResponse.json({ success: true, database: targetDb, procedures });
    } catch (err: any) {
        console.error('[AVAILABLE_SPS_ERROR]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    } finally {
        if (pool) {
            try { await pool.close(); } catch {}
        }
    }
}
