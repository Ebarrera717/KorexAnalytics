import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const response = NextResponse.json({
        success: true,
        message: 'Sesión cerrada correctamente.'
    });

    response.cookies.delete('kax_session');
    return response;
}
