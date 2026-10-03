import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const KAX_SECRET = process.env.KAX_SECRET_KEY || 'Korex_Analytics_Enterprise_Secret_Key_2026_AES256';

function getDerivedKey(secret?: string): Buffer {
    const keyString = secret || KAX_SECRET;
    return crypto.createHash('sha256').update(keyString).digest();
}

/**
 * Encripta contraseñas de bases de datos utilizando AES-256-CBC.
 * Formato resultante: ENC(<iv_hex>:<encrypted_hex>)
 */
export function encryptDatabasePassword(plainText: string): string {
    if (!plainText || typeof plainText !== 'string') return plainText;
    const trimmed = plainText.trim();
    if (trimmed === '' || trimmed.startsWith('ENC(')) return plainText;

    try {
        const key = getDerivedKey();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(plainText, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return `ENC(${iv.toString('hex')}:${encrypted})`;
    } catch (err: any) {
        console.error('[KAX_SECURITY] Error al encriptar contraseña:', err.message);
        return plainText;
    }
}

/**
 * Desencripta tokens ENC(<iv_hex>:<encrypted_hex>) a texto plano de forma segura.
 */
export function decryptDatabasePassword(cipherText: string): string {
    if (!cipherText || typeof cipherText !== 'string') return cipherText;
    const trimmed = cipherText.trim();
    if (!trimmed.startsWith('ENC(') || !trimmed.endsWith(')')) return cipherText;

    try {
        const inner = trimmed.slice(4, -1).trim();
        const parts = inner.split(':');
        if (parts.length !== 2) return cipherText;

        const [ivHex, encHex] = parts;
        const key = getDerivedKey();
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err: any) {
        console.warn('[KAX_SECURITY] Error al desencriptar token, retornando original:', err.message);
        return cipherText;
    }
}

/**
 * Hash seguro de contraseñas de usuarios usando bcrypt.
 */
export async function hashUserPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
}

/**
 * Verifica contraseñas de usuario contra el hash bcrypt.
 */
export async function verifyUserPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
}

/**
 * Sanitiza objetos para eliminar cualquier rastro de contraseñas antes de logs o respuestas API.
 */
export function sanitizePayload<T extends Record<string, any>>(obj: T): T {
    if (!obj || typeof obj !== 'object') return obj;
    const clean: any = Array.isArray(obj) ? [] : {};
    for (const [k, v] of Object.entries(obj)) {
        const lower = k.toLowerCase();
        if (lower.includes('password') || lower.includes('clave') || lower.includes('secret') || lower.includes('token')) {
            clean[k] = '***MASKED***';
        } else if (v && typeof v === 'object') {
            clean[k] = sanitizePayload(v);
        } else {
            clean[k] = v;
        }
    }
    return clean;
}
