/**
 * ============================================================================
 * PROYECTO: KOREX ANALYTICS
 * SCRIPT: Generador Criptográfico de Licencias de Software (HMAC SHA-256)
 * EJECUCIÓN: node scripts/generar-licencia-kax.js <Cliente> <NIT> <YYYY-MM-DD>
 * ============================================================================
 */

require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SECRET_KEY = process.env.LICENSE_SECRET || process.env.KAX_LICENSE_SECRET || 'Korex_Master_License_Secret_Key_2026_Secure';


function generarLicenciaKAX(cliente, nit, fechaExpiracion) {
    if (!cliente || !nit || !fechaExpiracion) {
        console.error('\n❌ ERROR: Faltan argumentos requeridos.');
        console.log('Uso: node scripts/generar-licencia-kax.js <NombreCliente> <NIT> <YYYY-MM-DD>\n');
        process.exit(1);
    }

    const regexFecha = /^\d{4}-\d{2}-\d{2}$/;
    if (!regexFecha.test(fechaExpiracion)) {
        console.error('\n❌ ERROR: Formato de fecha inválido. Debe ser YYYY-MM-DD (ej: 2027-12-31)\n');
        process.exit(1);
    }

    const payload = {
        c: cliente.trim(),
        n: nit.trim(),
        e: fechaExpiracion.trim(),
        i: new Date().toISOString().split('T')[0]
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', SECRET_KEY).update(payloadBase64).digest('hex');
    const licenseKey = `KOR1.${payloadBase64}.${signature}`;

    console.log('\n================================================================');
    console.log('       🔑 CLAVE DE LICENCIA GENERADA - KOREX ANALYTICS         ');
    console.log('================================================================');
    console.log(`Cliente    : ${cliente}`);
    console.log(`NIT        : ${nit}`);
    console.log(`Emisión    : ${payload.i}`);
    console.log(`Expiración : ${fechaExpiracion}`);
    console.log('----------------------------------------------------------------');
    console.log('TOKEN DE LICENCIA (Copie el texto completo):');
    console.log('----------------------------------------------------------------\n');
    console.log(licenseKey);
    console.log('\n================================================================\n');

    return licenseKey;
}

const args = process.argv.slice(2);
if (args.length >= 3) {
    generarLicenciaKAX(args[0], args[1], args[2]);
} else {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.question('Razón Social / Nombre del Cliente: ', (cliente) => {
        readline.question('NIT / Identificación Tributaria: ', (nit) => {
            readline.question('Fecha de Expiración (YYYY-MM-DD, ej: 2027-12-31): ', (fechaExpiracion) => {
                readline.close();
                generarLicenciaKAX(cliente.trim(), nit.trim(), fechaExpiracion.trim());
            });
        });
    });
}
