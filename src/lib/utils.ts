import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Formatea números de manera determinista para evitar errores de hidratación entre SSR y el cliente.
 * Ejemplo: 1250 -> "1.250"
 */
export function formatNumber(val: number | string | undefined | null): string {
    if (val === undefined || val === null || isNaN(Number(val))) return '0';
    const parts = Number(val).toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',');
}
