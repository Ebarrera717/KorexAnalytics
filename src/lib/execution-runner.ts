import mssql from 'mssql';
import { SQLPoolManager, SQLProfileConfig } from './sql-pool-manager';
import { AuditLogger } from './audit-logger';
import { sanitizePayload } from './security';

export interface ExecutionRequest {
    profile: SQLProfileConfig;
    targetDatabase?: string;
    procedureId?: number;
    spName: string;
    parameters: Record<string, any>;
    userId: number;
    userName: string;
    ipAddress?: string;
    userAgent?: string;
}

export interface ExecutionResult {
    success: boolean;
    traceId: string;
    spName: string;
    targetDatabase: string;
    serverHost: string;
    recordCount: number;
    elapsedTimeMs: number;
    columns: string[];
    data: any[];
    message?: string;
    errorDetails?: string;
}

/**
 * Motor central de Ejecución de Procedimientos Almacenados de Korex Analytics.
 */
export class ExecutionRunner {
    /**
     * Ejecuta un procedimiento almacenado contra la base de datos SQL Server configurada con trazabilidad completa.
     */
    public static async run(req: ExecutionRequest): Promise<ExecutionResult> {
        const traceId = AuditLogger.generateTraceId();
        const startTime = Date.now();
        let pool: mssql.ConnectionPool | null = null;
        let activeDatabase = '';

        console.log(`[KAX_EXECUTION][${traceId}] Iniciando ejecución de SP "${req.spName}" en perfil "${req.profile.name}"`);

        try {
            // 1. Obtener conexión y verificar base de datos activa
            const conn = await SQLPoolManager.getConnection(req.profile, req.targetDatabase);
            pool = conn.pool;
            activeDatabase = conn.activeDatabase;

            // 2. Inspeccionar sys.parameters para filtrar parámetros válidos
            const metaReq = pool.request();
            metaReq.input('spName', mssql.NVarChar, req.spName);
            const sysParamsRes = await metaReq.query(`
                SELECT p.name AS param_name
                FROM sys.parameters p
                WHERE p.object_id = OBJECT_ID(@spName)
                   OR p.object_id = OBJECT_ID('dbo.' + REPLACE(REPLACE(@spName, 'dbo.', ''), '[', ''))
                   OR p.object_id = OBJECT_ID('[dbo].[' + REPLACE(REPLACE(REPLACE(@spName, 'dbo.', ''), '[', ''), ']', '') + ']')
                   OR p.object_id = (
                       SELECT TOP 1 pr.object_id 
                       FROM sys.procedures pr 
                       WHERE pr.name = @spName 
                          OR pr.name = REPLACE(REPLACE(REPLACE(@spName, 'dbo.', ''), '[', ''), ']', '')
                   )
            `);

            const validParamSet = new Set<string>();
            if (sysParamsRes.recordset && sysParamsRes.recordset.length > 0) {
                sysParamsRes.recordset.forEach((r: any) => {
                    const clean = (r.param_name || '').replace(/^@/, '').toLowerCase();
                    validParamSet.add(clean);
                });
            }

            // 3. Preparar la ejecución con parámetros tipados
            const execReq = pool.request();
            (execReq as any).timeout = (req.profile.requestTimeout || 180) * 1000;

            if (req.parameters && typeof req.parameters === 'object') {
                Object.keys(req.parameters).forEach((key) => {
                    const lower = key.toLowerCase();
                    if (validParamSet.size > 0 && !validParamSet.has(lower)) {
                        console.warn(`[KAX_EXECUTION][${traceId}] Omitiendo parámetro "@${key}" inexistente en ${req.spName}`);
                        return;
                    }

                    let val = req.parameters[key];
                    if (val === undefined || val === null) {
                        val = null;
                    } else if (typeof val === 'string') {
                        val = val.trim();
                        if (val === '') val = null;
                    }
                    execReq.input(key, mssql.VarChar(mssql.MAX), val);
                });
            }

            // 4. Ejecutar el Stored Procedure de forma segura delimitando identificadores
            const rawSpClean = req.spName.replace(/^dbo\./, '').replace(/^\[dbo\]\./, '').replace(/^\[/, '').replace(/\]$/, '');
            const safeQualifiedName = `[dbo].[${rawSpClean}]`;
            const result = await execReq.execute(safeQualifiedName);
            let finalData: any[] = (result.recordset as any[]) || [];

            // 4.1 Garantía universal de columna y cálculo dinámico de FarebasisReal
            if (finalData.length > 0) {
                const hasFarebasisCol = Object.keys(finalData[0]).some(k => k.toUpperCase() === 'FAREBASIS');
                const hasFarebasisRealCol = Object.keys(finalData[0]).some(k => k.toLowerCase() === 'farebasisreal');

                if (hasFarebasisCol) {
                    let activeRules: any[] = [];
                    try {
                        const { FareBasisService } = await import('./farebasis-service');
                        activeRules = await FareBasisService.getAllRules(true);
                    } catch (_) {}

                    const { FareBasisService } = await import('./farebasis-service');
                    finalData = finalData.map((row: any) => {
                        const fbOriginal = row.FAREBASIS ?? row.FareBasis ?? row.farebasis;
                        const airlineIdent = (row.EntVendedora ? String(row.EntVendedora).trim().substring(0, 3) : '') ||
                                             row.cd_EntVend ||
                                             row.Aerolinea ||
                                             row.Documento ||
                                             row.cd_aero_siglas;

                        const calculated = FareBasisService.computeFarebasisReal(
                            fbOriginal,
                            airlineIdent,
                            activeRules
                        );

                        const finalVal = (row.FarebasisReal && row.FarebasisReal !== fbOriginal)
                            ? row.FarebasisReal
                            : (calculated ?? row.FarebasisReal ?? fbOriginal);

                        return { ...row, FarebasisReal: finalVal };
                    });
                }

                // 4.2 Filtrado de respaldo en memoria si se solicitó cd_FarebasisReal
                const paramKey = Object.keys(req.parameters || {}).find(k => k.toLowerCase() === 'cd_farebasisreal' || k.toLowerCase() === 'farebasisreal');
                const filterVal = paramKey ? String(req.parameters[paramKey] || '').trim().toUpperCase() : '';
                if (filterVal && filterVal !== 'TODOS' && filterVal !== 'ALL' && filterVal !== '0') {
                    const targets = filterVal.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
                    if (targets.length > 0) {
                        finalData = finalData.filter((row: any) => {
                            const fbr = String(row.FarebasisReal || '').trim().toUpperCase();
                            return targets.some(target => fbr.includes(target));
                        });
                    }
                }

                // 4.3 Filtrado de respaldo en memoria si se solicitó MostrarSoloReembolsos
                const reembParamKey = Object.keys(req.parameters || {}).find(k =>
                    k.toLowerCase() === 'mostrarsoloreembolsos' ||
                    k.toLowerCase() === 'soloreembolsos' ||
                    k.toLowerCase() === 'conreembolso'
                );
                if (reembParamKey) {
                    const rVal = String(req.parameters[reembParamKey] || '').trim().toUpperCase();
                    if (rVal === 'SI' || rVal === '1' || rVal === 'TRUE') {
                        finalData = finalData.filter((row: any) => {
                            const nr = row.NumeroReembolso ?? row.numeroReembolso ?? row.numeroreembolso;
                            return nr !== undefined && nr !== null && String(nr).trim() !== '';
                        });
                    } else if (rVal === 'NO' || rVal === '0' || rVal === 'FALSE') {
                        finalData = finalData.filter((row: any) => {
                            const nr = row.NumeroReembolso ?? row.numeroReembolso ?? row.numeroreembolso;
                            return nr === undefined || nr === null || String(nr).trim() === '';
                        });
                    }
                }
            }

            const elapsedTime = Date.now() - startTime;
            const columns = finalData.length > 0 ? Object.keys(finalData[0]) : [];

            // 5. Auditoría de éxito
            await AuditLogger.log({
                userId: req.userId,
                userName: req.userName,
                action: 'EXECUTE_SP_SUCCESS',
                module: 'EXECUTIONS',
                ipAddress: req.ipAddress,
                userAgent: req.userAgent,
                details: {
                    traceId,
                    spName: req.spName,
                    server: req.profile.server,
                    database: activeDatabase,
                    recordCount: finalData.length,
                    durationMs: elapsedTime,
                    parameters: sanitizePayload(req.parameters)
                }
            });

            await pool.close();

            return {
                success: true,
                traceId,
                spName: req.spName,
                targetDatabase: activeDatabase,
                serverHost: req.profile.server,
                recordCount: finalData.length,
                elapsedTimeMs: elapsedTime,
                columns,
                data: finalData
            };
        } catch (err: any) {
            const elapsedTime = Date.now() - startTime;
            console.error(`[KAX_EXECUTION][${traceId}] Error al ejecutar "${req.spName}":`, err.message);

            if (pool) {
                try { await pool.close(); } catch (_) {}
            }

            // Auditoría de error
            await AuditLogger.log({
                userId: req.userId,
                userName: req.userName,
                action: 'EXECUTE_SP_ERROR',
                module: 'EXECUTIONS',
                ipAddress: req.ipAddress,
                userAgent: req.userAgent,
                details: {
                    traceId,
                    spName: req.spName,
                    server: req.profile.server,
                    database: activeDatabase || req.targetDatabase,
                    durationMs: elapsedTime,
                    errorMessage: err.message,
                    errorDetails: err.code || err.originalError?.message || '',
                    parameters: sanitizePayload(req.parameters)
                }
            });

            return {
                success: false,
                traceId,
                spName: req.spName,
                targetDatabase: activeDatabase || req.targetDatabase || 'UNKNOWN',
                serverHost: req.profile.server,
                recordCount: 0,
                elapsedTimeMs: elapsedTime,
                columns: [],
                data: [],
                message: err.message || 'Error durante la ejecución del procedimiento analítico.',
                errorDetails: err.originalError?.message || err.code || ''
            };
        }
    }
}
