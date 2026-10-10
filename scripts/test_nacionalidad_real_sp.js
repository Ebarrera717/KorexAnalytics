const mssql = require('mssql');

async function testSP() {
    console.log('Conectando a ZeusAgencias_23...');
    const pool = await mssql.connect({
        server: '127.0.0.1',
        database: 'ZeusAgencias_23',
        user: 'zeusagencias',
        password: 'zzeusagencias',
        options: { encrypt: false, trustServerCertificate: true },
        requestTimeout: 60000
    });

    console.log('--- 1. VERIFICAR PARÁMETRO @NacionalidadReal EN SYS.PARAMETERS ---');
    const pRes = await pool.request().query(`
        SELECT p.name, t.name AS type_name, p.max_length
        FROM sys.parameters p
        JOIN sys.types t ON p.user_type_id = t.user_type_id
        WHERE p.object_id = OBJECT_ID('dbo.Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas')
          AND p.name = '@NacionalidadReal'
    `);
    console.table(pRes.recordset);
    if (pRes.recordset.length === 0) {
        throw new Error('Parámetro @NacionalidadReal no encontrado en el SP.');
    }
    console.log('✓ Parámetro @NacionalidadReal presente correctamente.');

    console.log('\n--- 2. EJECUTAR EL SP SIN FILTRO (TODOS) ---');
    const t0 = Date.now();
    const resTodos = await pool.request()
        .input('fecha_inicio', mssql.SmallDateTime, new Date('2020-01-01'))
        .input('fecha_fin', mssql.SmallDateTime, new Date('2026-12-31'))
        .execute('[dbo].[Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas]');
    const durTodos = Date.now() - t0;
    console.log(`✓ Registros retornados (Todos): ${resTodos.recordset.length} en ${durTodos} ms`);

    if (resTodos.recordset.length > 0) {
        const row0 = resTodos.recordset[0];
        console.log('\nVerificación de columnas en la primera fila:');
        console.log('  Existe columna "Nacionalidad":', 'Nacionalidad' in row0, '->', row0['Nacionalidad']);
        console.log('  Existe columna "Nacionalidad Real":', 'Nacionalidad Real' in row0, '->', row0['Nacionalidad Real']);
        console.log('  Servicio / Ruta:', row0['Servicio']);

        const sample = resTodos.recordset.slice(0, 10).map(r => ({
            Documento: r.Documento,
            Servicio: r.Servicio,
            Nacionalidad_Original: r.Nacionalidad,
            Nacionalidad_Real: r['Nacionalidad Real']
        }));
        console.table(sample);
    }

    console.log('\n--- 3. EJECUTAR EL SP CON @NacionalidadReal = "Nacional" ---');
    const resNac = await pool.request()
        .input('fecha_inicio', mssql.SmallDateTime, new Date('2020-01-01'))
        .input('fecha_fin', mssql.SmallDateTime, new Date('2026-12-31'))
        .input('NacionalidadReal', mssql.VarChar(25), 'Nacional')
        .execute('[dbo].[Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas]');
    console.log(`✓ Registros retornados con filtro "Nacional": ${resNac.recordset.length}`);
    const nonNac = resNac.recordset.filter(r => r['Nacionalidad Real'] !== 'Nacional');
    if (nonNac.length > 0) {
        console.error('ERROR: Se encontraron registros no nacionales cuando el filtro era Nacional!', nonNac);
    } else {
        console.log('✓ El 100% de los registros retornados tienen Nacionalidad Real = "Nacional"');
    }

    console.log('\n--- 4. EJECUTAR EL SP CON @NacionalidadReal = "Internacional" ---');
    const resInt = await pool.request()
        .input('fecha_inicio', mssql.SmallDateTime, new Date('2020-01-01'))
        .input('fecha_fin', mssql.SmallDateTime, new Date('2026-12-31'))
        .input('NacionalidadReal', mssql.VarChar(25), 'Internacional')
        .execute('[dbo].[Zeus®spze_VentasDetalladasPorConceptos_FiltroRutas]');
    console.log(`✓ Registros retornados con filtro "Internacional": ${resInt.recordset.length}`);
    const nonInt = resInt.recordset.filter(r => r['Nacionalidad Real'] !== 'Internacional');
    if (nonInt.length > 0) {
        console.error('ERROR: Se encontraron registros no internacionales cuando el filtro era Internacional!', nonInt);
    } else {
        console.log('✓ El 100% de los registros retornados tienen Nacionalidad Real = "Internacional"');
    }

    console.log('\n--- 5. VERIFICACIÓN DE TOTALES ---');
    console.log(`Total 'Todos': ${resTodos.recordset.length}`);
    console.log(`Suma Nacional (${resNac.recordset.length}) + Internacional (${resInt.recordset.length}) = ${resNac.recordset.length + resInt.recordset.length}`);
    if (resTodos.recordset.length === resNac.recordset.length + resInt.recordset.length) {
        console.log('✓ Coincidencia exacta: Todos = Nacional + Internacional (sin duplicados ni omisiones)');
    } else {
        console.log('Advertencia de conteo (revisar si hay valores que no son Nacional ni Internacional)');
    }

    await pool.close();
    console.log('\n¡Todas las pruebas del SP completadas exitosamente!');
}

testSP().catch(err => {
    console.error('Error en prueba del SP:', err);
    process.exit(1);
});
