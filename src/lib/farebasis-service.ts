import mssql from 'mssql';
import { getInternalDbPool } from './kax-db';
import { SQLProfilesService } from './sql-profiles-service';
import { SQLPoolManager } from './sql-pool-manager';

export interface FareBasisRule {
    id: number;
    airlineCode: string;
    airlineName: string;
    startPos: number;
    length: number;
    separator: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export class FareBasisService {
    /**
     * Lista todas las reglas de extracción de Fare Basis.
     */
    public static async getAllRules(isActive?: boolean, search?: string): Promise<FareBasisRule[]> {
        const pool = await getInternalDbPool();
        const req = pool.request();

        if (isActive !== undefined) {
            req.input('isActive', mssql.Bit, isActive ? 1 : 0);
        } else {
            req.input('isActive', mssql.Bit, null);
        }

        if (search && search.trim() !== '') {
            req.input('search', mssql.NVarChar(100), search.trim());
        } else {
            req.input('search', mssql.NVarChar(100), null);
        }

        const res = await req.execute('dbo.spKAX_FareBasisRuleListar');
        const rows = res.recordset || [];

        return rows.map(r => ({
            id: r.id,
            airlineCode: String(r.airlineCode || '').trim(),
            airlineName: String(r.airlineName || '').trim(),
            startPos: Number(r.startPos) || 1,
            length: Number(r.length) || 2,
            separator: String(r.separator || '/').trim() || '/',
            isActive: Boolean(r.isActive),
            createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
            updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : undefined
        }));
    }

    /**
     * Guarda o actualiza una regla de Fare Basis tanto en la base interna como en la base ERP destino.
     */
    public static async saveRule(rule: {
        id?: number;
        airlineCode: string;
        airlineName: string;
        startPos: number;
        length: number;
        separator?: string;
        isActive?: boolean;
    }): Promise<{ success: boolean; savedId: number }> {
        const pool = await getInternalDbPool();
        const req = pool.request();

        const cleanCode = (rule.airlineCode || '').trim();
        const cleanName = (rule.airlineName || '').trim();
        const startPos = Math.max(1, Number(rule.startPos) || 1);
        const length = Math.max(1, Number(rule.length) || 1);
        const separator = (rule.separator || '/').trim() || '/';
        const isActive = rule.isActive !== undefined ? Boolean(rule.isActive) : true;

        req.input('id', mssql.Int, rule.id || null);
        req.input('airlineCode', mssql.NVarChar(20), cleanCode);
        req.input('airlineName', mssql.NVarChar(150), cleanName);
        req.input('startPos', mssql.Int, startPos);
        req.input('length', mssql.Int, length);
        req.input('separator', mssql.NVarChar(10), separator);
        req.input('isActive', mssql.Bit, isActive ? 1 : 0);
        req.output('savedId', mssql.Int);

        const res = await req.execute('dbo.spKAX_FareBasisRuleGuardar');
        const savedId = res.output.savedId || (rule.id || 0);

        // Sincronización transparente con base de datos activa de Zeus ERP (si la tabla KAX_FareBasisRule existe allí)
        try {
            await this.syncRuleToTargetErp({
                airlineCode: cleanCode,
                airlineName: cleanName,
                startPos,
                length,
                separator,
                isActive
            });
        } catch (syncErr: any) {
            console.warn('[FARE_BASIS_SERVICE] Sincronización secundaria a Zeus ERP omitida o no requerida:', syncErr.message);
        }

        return { success: true, savedId };
    }

    /**
     * Elimina una regla por su ID.
     */
    public static async deleteRule(id: number): Promise<boolean> {
        const pool = await getInternalDbPool();
        const req = pool.request();
        req.input('id', mssql.Int, id);
        await req.execute('dbo.spKAX_FareBasisRuleEliminar');
        return true;
    }

    /**
     * Sincroniza la regla en la base de datos de producción configurada en el perfil activo de SQL Server.
     */
    private static async syncRuleToTargetErp(rule: {
        airlineCode: string;
        airlineName: string;
        startPos: number;
        length: number;
        separator: string;
        isActive: boolean;
    }) {
        const profiles = await SQLProfilesService.getAllProfiles();
        const activeProfile = profiles.find(p => p.isActive) || profiles[0];
        if (!activeProfile) return;

        let conn = null;
        try {
            conn = await SQLPoolManager.getConnection(activeProfile);
            const targetPool = conn.pool;

            // Verificar si KAX_FareBasisRule existe en el destino
            const checkTable = await targetPool.request().query(`
                SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'KAX_FareBasisRule'
            `);

            if (checkTable.recordset && checkTable.recordset.length > 0) {
                const upsertReq = targetPool.request();
                upsertReq.input('airlineCode', mssql.NVarChar(20), rule.airlineCode);
                upsertReq.input('airlineName', mssql.NVarChar(150), rule.airlineName);
                upsertReq.input('startPos', mssql.Int, rule.startPos);
                upsertReq.input('length', mssql.Int, rule.length);
                upsertReq.input('separator', mssql.NVarChar(10), rule.separator);
                upsertReq.input('isActive', mssql.Bit, rule.isActive ? 1 : 0);

                await upsertReq.query(`
                    IF EXISTS (SELECT 1 FROM dbo.[KAX_FareBasisRule] WHERE [airlineCode] = @airlineCode)
                    BEGIN
                        UPDATE dbo.[KAX_FareBasisRule]
                        SET [airlineName] = @airlineName,
                            [startPos] = @startPos,
                            [length] = @length,
                            [separator] = @separator,
                            [isActive] = @isActive,
                            [updatedAt] = SYSUTCDATETIME()
                        WHERE [airlineCode] = @airlineCode;
                    END
                    ELSE
                    BEGIN
                        INSERT INTO dbo.[KAX_FareBasisRule] (
                            [airlineCode], [airlineName], [startPos], [length], [separator], [isActive]
                        )
                        VALUES (@airlineCode, @airlineName, @startPos, @length, @separator, @isActive);
                    END
                `);
            }
        } finally {
            if (conn && conn.pool) {
                try { await conn.pool.close(); } catch {}
            }
        }
    }

    /**
     * Función universal en TypeScript para cálculo de FarebasisReal en memoria.
     * Aplica la extracción individual a cada segmento de la ruta tarifaria separado por el delimitador.
     */
    public static computeFarebasisReal(
        fareBasisOriginal: string | null | undefined,
        airlineCodeOrDoc: string | null | undefined,
        rules: FareBasisRule[]
    ): string | null {
        if (!fareBasisOriginal || !fareBasisOriginal.trim()) {
            return fareBasisOriginal ?? null;
        }

        const cleanFb = fareBasisOriginal.trim();
        if (!rules || rules.length === 0) {
            return cleanFb;
        }

        const cleanIdentifier = (airlineCodeOrDoc || '').trim().toUpperCase();
        const prefix3 = cleanIdentifier.length >= 3 ? cleanIdentifier.substring(0, 3) : cleanIdentifier;

        // Búsqueda de regla activa
        const matched = rules.find(r => {
            if (!r.isActive) return false;
            const code = (r.airlineCode || '').trim().toUpperCase();
            const name = (r.airlineName || '').trim().toUpperCase();
            return (
                code === cleanIdentifier ||
                code === prefix3 ||
                (cleanIdentifier.length >= 2 && cleanIdentifier.includes(code)) ||
                (name && cleanIdentifier.includes(name))
            );
        });

        // Comportamiento predeterminado: si no existe regla activa, conservar Fare Basis original
        if (!matched) {
            return cleanFb;
        }

        const sep = matched.separator || '/';
        const startPos = Math.max(1, matched.startPos || 1);
        const length = Math.max(1, matched.length || 2);

        const segments = cleanFb.split(sep);
        const transformedSegments = segments.map(seg => {
            if (!seg) return '';
            const startIdx = startPos - 1; // 1-indexed to 0-indexed
            if (startIdx >= seg.length) return '';
            return seg.substring(startIdx, startIdx + length);
        });

        return transformedSegments.join(sep);
    }
}
