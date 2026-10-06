import crypto from 'crypto';
import mssql from 'mssql';
import { executeInternalProcedure } from './kax-db';

const SECRET_KEYS = [
    process.env.LICENSE_SECRET,
    process.env.KAX_LICENSE_SECRET,
    process.env.KAX_SECRET_KEY,
    'Korex_Master_License_Secret_Key_2026_Secure',
    'Korex_Analytics_Enterprise_Secret_Key_2026_AES256'
].filter(Boolean) as string[];

export interface LicensePayload {
    client: string;
    nit: string;
    expirationDate: string; // YYYY-MM-DD
    issuedDate: string;
}

export interface LicenseVerificationResult {
    isValid: boolean;
    payload?: LicensePayload;
    error?: string;
}

export interface LicenseStatus {
    isLicensed: boolean;
    isExpired: boolean;
    expirationDate: string | null;
    daysRemaining: number | null;
    clientName: string | null;
    nit: string | null;
    status: 'ACTIVE' | 'WARNING' | 'EXPIRED' | 'UNLICENSED';
}

/**
 * Valida criptográficamente un token de licencia HMAC SHA-256
 * Formato esperado: KOR1.<base64url_json>.<sha256_hex>
 */
export function verifyLicenseKey(licenseKey: string): LicenseVerificationResult {
    if (!licenseKey || typeof licenseKey !== 'string') {
        return { isValid: false, error: 'Clave de licencia vacía o con formato inválido' };
    }

    const parts = licenseKey.trim().split('.');
    if (parts.length !== 3 || parts[0] !== 'KOR1') {
        return { isValid: false, error: 'Formato de clave de licencia desconocido o incompatible con Korex' };
    }

    const [, payloadBase64, signature] = parts;

    try {
        let isSignatureValid = false;
        const sigBuf = Buffer.from(signature);

        for (const secret of SECRET_KEYS) {
            const expectedSig = crypto
                .createHmac('sha256', secret)
                .update(payloadBase64)
                .digest('hex');
            const expBuf = Buffer.from(expectedSig);
            if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
                isSignatureValid = true;
                break;
            }
        }

        if (!isSignatureValid) {
            return { isValid: false, error: 'La firma criptográfica de la clave de licencia es inválida o fue alterada' };
        }


        const decodedJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
        const rawPayload = JSON.parse(decodedJson);

        if (!rawPayload.c || !rawPayload.n || !rawPayload.e) {
            return { isValid: false, error: 'Contenido de la licencia incompleto (faltan campos obligatorios)' };
        }

        return {
            isValid: true,
            payload: {
                client: rawPayload.c,
                nit: rawPayload.n,
                expirationDate: rawPayload.e,
                issuedDate: rawPayload.i || ''
            }
        };
    } catch (err: any) {
        return { isValid: false, error: 'Error al decodificar la clave de licencia: ' + err.message };
    }
}

/**
 * Obtiene el estado actual de licenciamiento almacenado en dbo.KAX_License
 */
export async function getStoredLicenseStatus(): Promise<LicenseStatus> {
    try {
        const result = await executeInternalProcedure('dbo.spKAX_LicenseConsultar', {});

        if (!result.recordset || result.recordset.length === 0) {
            return {
                isLicensed: false,
                isExpired: false,
                expirationDate: null,
                daysRemaining: null,
                clientName: null,
                nit: null,
                status: 'UNLICENSED'
            };
        }

        const row = result.recordset[0];
        const licenseKey = row.licenseKey || '';
        const clientName = row.clientName || '';
        const nit = row.nit || '';
        const expirationDateRaw = row.expirationDate;

        const expirationDateStr = expirationDateRaw instanceof Date
            ? expirationDateRaw.toISOString().split('T')[0]
            : String(expirationDateRaw || '').split('T')[0];

        // Verificar la firma criptográfica guardada
        const verification = verifyLicenseKey(licenseKey);
        if (!verification.isValid || !verification.payload) {
            return {
                isLicensed: false,
                isExpired: true,
                expirationDate: expirationDateStr,
                daysRemaining: 0,
                clientName,
                nit,
                status: 'EXPIRED'
            };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expDate = new Date(`${verification.payload.expirationDate}T00:00:00.000Z`);
        const diffMs = expDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const isExpired = daysRemaining < 0;

        let status: 'ACTIVE' | 'WARNING' | 'EXPIRED' | 'UNLICENSED' = 'ACTIVE';
        if (isExpired) {
            status = 'EXPIRED';
        } else if (daysRemaining <= 15) {
            status = 'WARNING';
        }

        return {
            isLicensed: true,
            isExpired,
            expirationDate: verification.payload.expirationDate,
            daysRemaining,
            clientName: verification.payload.client,
            nit: verification.payload.nit,
            status
        };
    } catch (err: any) {
        console.error('[KAX_LICENSE] Error al consultar estado de licencia:', err.message);
        return {
            isLicensed: false,
            isExpired: false,
            expirationDate: null,
            daysRemaining: null,
            clientName: null,
            nit: null,
            status: 'UNLICENSED'
        };
    }
}

/**
 * Valida y registra una nueva clave de licencia en dbo.KAX_License
 */
export async function applyLicense(
    licenseKey: string,
    clientNameInput?: string,
    nitInput?: string
): Promise<{ success: boolean; message: string; license?: LicensePayload }> {
    const verification = verifyLicenseKey(licenseKey);

    if (!verification.isValid || !verification.payload) {
        return {
            success: false,
            message: verification.error || 'La clave de licencia proporcionada no es válida.'
        };
    }

    const { client, nit, expirationDate, issuedDate } = verification.payload;

    if (!clientNameInput || !clientNameInput.trim()) {
        return {
            success: false,
            message: 'Debe ingresar el Nombre o Razón Social del Cliente.'
        };
    }

    if (!nitInput || !nitInput.trim()) {
        return {
            success: false,
            message: 'Debe ingresar el NIT o Cédula del Cliente.'
        };
    }

    const clean = (s: string) => s.toLowerCase().replace(/[\s\.\-_]/g, '').trim();

    if (clean(clientNameInput) !== clean(client)) {
        return {
            success: false,
            message: `El Nombre del Cliente ingresado ("${clientNameInput.trim()}") no coincide con el registrado en la clave de licencia ("${client}").`
        };
    }

    if (clean(nitInput) !== clean(nit)) {
        return {
            success: false,
            message: `El NIT ingresado ("${nitInput.trim()}") no coincide con el registrado en la clave de licencia ("${nit}").`
        };
    }


    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(`${expirationDate}T00:00:00.000Z`);

    if (expDate < today) {
        return {
            success: false,
            message: `La clave de licencia ingresada expiró el ${expirationDate}.`
        };
    }

    try {
        await executeInternalProcedure(
            'dbo.spKAX_LicenseAplicar',
            {
                clientName: { type: mssql.NVarChar(255), value: client },
                nit: { type: mssql.NVarChar(50), value: nit },
                licenseKey: { type: mssql.NVarChar(mssql.MAX), value: licenseKey.trim() },
                expirationDate: { type: mssql.Date, value: new Date(expirationDate) },
                issuedDate: { type: mssql.Date, value: issuedDate ? new Date(issuedDate) : new Date() },
                status: { type: mssql.NVarChar(50), value: 'ACTIVE' }
            },
            {
                savedId: mssql.Int
            }
        );

        return {
            success: true,
            message: `Licencia activada con éxito para ${client}. Válida hasta ${expirationDate}.`,
            license: verification.payload
        };
    } catch (err: any) {
        console.error('[KAX_LICENSE] Error al persistir la licencia:', err.message);
        return {
            success: false,
            message: 'Error al registrar la licencia en la base de datos: ' + err.message
        };
    }
}
