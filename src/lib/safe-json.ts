/**
 * Utilidad universal para lectura segura de respuestas HTTP en Next.js.
 * Evita la excepción: "SyntaxError: Unexpected token '<', '<!DOCTYPE '... is not valid JSON"
 * cuando el servidor responde con páginas HTML (404, 500, redirects a login o bloqueo de middleware).
 */
export async function parseJsonResponse<T = any>(
    res: Response,
    fallbackValue: T = null as unknown as T
): Promise<T> {
    try {
        const text = await res.text();
        if (!text || text.trim() === '') {
            return fallbackValue;
        }

        const trimmed = text.trim();
        // Si el cuerpo inicia con HTML (<doctype, <html, <div, etc.), evitar JSON.parse
        if (trimmed.startsWith('<')) {
            console.warn(`[parseJsonResponse] Servidor respondió con HTML en lugar de JSON (HTTP ${res.status}):`, trimmed.slice(0, 120));
            return fallbackValue;
        }

        return JSON.parse(trimmed) as T;
    } catch (err) {
        console.warn(`[parseJsonResponse] Error al parsear JSON (HTTP ${res.status}):`, err);
        return fallbackValue;
    }
}
