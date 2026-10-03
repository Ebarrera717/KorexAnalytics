import { sanitizePayload } from './security';

export interface AuditEvent {
    userId?: number;
    userName?: string;
    action: string;
    module: 'AUTH' | 'USERS' | 'SQLSERVER' | 'EXECUTIONS' | 'PARAMETERS';
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, any>;
}

/**
 * Servicio Centralizado de Auditoría y Trazabilidad para Korex Analytics.
 */
export class AuditLogger {
    /**
     * Registra un evento de auditoría sanitizado en consola y estructura para persistencia.
     */
    public static async log(event: AuditEvent): Promise<void> {
        const timestamp = new Date().toISOString();
        const safeDetails = event.details ? sanitizePayload(event.details) : {};

        const logEntry = {
            timestamp,
            userId: event.userId || null,
            userName: event.userName || 'SYSTEM',
            action: event.action,
            module: event.module,
            ipAddress: event.ipAddress || '127.0.0.1',
            userAgent: event.userAgent || 'KAX-Client',
            details: safeDetails
        };

        console.log(`[KAX_AUDIT][${event.module}] ${event.action} by ${logEntry.userName} (${logEntry.ipAddress})`);

        // Aquí se conectará con dbo.spKAX_RegistrarAuditoria en la base interna
    }

    /**
     * Genera un identificador de traza estandarizado TRC-YYYYMMDD-XXXXXX
     */
    public static generateTraceId(): string {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase();
        return `TRC-${yyyy}${mm}${dd}-${randomHex}`;
    }
}
