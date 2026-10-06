const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno de .env si existe
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
            if (key && !process.env[key]) {
                process.env[key] = val;
            }
        }
    });
}

const SECRET_KEY = process.env.LICENSE_SECRET || 'Korex_Master_License_Secret_Key_2026_Secure';

function generarLicencia(cliente, nit, fechaExpiracion) {
    if (!cliente || !nit || !fechaExpiracion) {
        console.error('\n❌ ERROR: Faltan argumentos requeridos.');
        console.log('Uso: node generar-licencia.js <NombreCliente> <NIT> <YYYY-MM-DD>\n');
        process.exit(1);
    }

    // Validar formato de fecha YYYY-MM-DD
    const regexFecha = /^\d{4}-\d{2}-\d{2}$/;
    if (!regexFecha.test(fechaExpiracion.trim())) {
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
    console.log('           🔑 CLAVE DE LICENCIA GENERADA - KOREX                ');
    console.log('================================================================');
    console.log(`Cliente    : ${cliente.trim()}`);
    console.log(`NIT        : ${nit.trim()}`);
    console.log(`Vencimiento: ${fechaExpiracion.trim()}`);
    console.log('----------------------------------------------------------------');
    console.log('CLAVE DE LICENCIA (Copie todo el texto a continuación):');
    console.log('----------------------------------------------------------------\n');
    console.log(licenseKey);
    console.log('\n================================================================\n');

    return licenseKey;
}

const args = process.argv.slice(2);
if (args.length >= 3) {
    generarLicencia(args[0], args[1], args[2]);
} else {
    // Si no se pasaron argumentos por CLI, solicitar interactivamente
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.question('Nombre o Razon Social de la Agencia / Cliente: ', (cliente) => {
        readline.question('NIT / Cédula del Cliente: ', (nit) => {
            readline.question('Fecha de Expiración (YYYY-MM-DD, ej: 2027-12-31): ', (fechaExpiracion) => {
                readline.close();
                generarLicencia(cliente.trim(), nit.trim(), fechaExpiracion.trim());
            });
        });
    });
}
