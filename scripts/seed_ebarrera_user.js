require('dotenv').config();
const mssql = require('mssql');

async function run() {
    const config = {
        server: process.env.KAX_INTERNAL_DB_SERVER || '127.0.0.1',
        port: parseInt(process.env.KAX_INTERNAL_DB_PORT || '1433', 10),
        database: process.env.KAX_INTERNAL_DB_NAME || 'Korex_Analytics',
        user: process.env.KAX_INTERNAL_DB_USER || 'zeusagencias',
        password: process.env.KAX_INTERNAL_DB_PASSWORD || 'zzeusagencias',
        options: { encrypt: false, trustServerCertificate: true }
    };

    const pool = await mssql.connect(config);
    console.log('Connected to SQL Server');

    const roleRes = await pool.request().query("SELECT TOP 1 id FROM dbo.KAX_Role WHERE name = 'SUPER_ADMIN'");
    let roleId = roleRes.recordset[0]?.id;
    if (!roleId) {
        const createRole = await pool.request()
            .input('name', 'SUPER_ADMIN')
            .input('desc', 'Control total y administración de Korex Analytics')
            .input('perms', JSON.stringify({ all: true }))
            .query("INSERT INTO dbo.KAX_Role (name, description, permissions, isActive) OUTPUT INSERTED.id VALUES (@name, @desc, @perms, 1)");
        roleId = createRole.recordset[0]?.id || 1;
    }

    const hash = '$2b$10$3iwWpMl/ZOeY7Sw.U3p1/uu3ckrGHrUCl8UQvEP/0QUqHMjeHWnfa'; // bcrypt hash for 'admin123'
    const email = 'ebarrera@zagencias.com';

    const check = await pool.request().input('email', email).query('SELECT id FROM dbo.KAX_User WHERE LOWER(email) = LOWER(@email)');
    if (check.recordset.length > 0) {
        await pool.request()
            .input('name', 'Eduardo Barrera')
            .input('pwd', hash)
            .input('roleId', roleId)
            .input('email', email)
            .query('UPDATE dbo.KAX_User SET name = @name, passwordHash = @pwd, roleId = @roleId, isActive = 1, updatedAt = SYSUTCDATETIME() WHERE LOWER(email) = LOWER(@email)');
        console.log(`[OK] Usuario ${email} actualizado con rol SUPER_ADMIN y clave admin123.`);
    } else {
        await pool.request()
            .input('name', 'Eduardo Barrera')
            .input('email', email)
            .input('pwd', hash)
            .input('roleId', roleId)
            .query('INSERT INTO dbo.KAX_User (name, email, passwordHash, roleId, isActive) VALUES (@name, @email, @pwd, @roleId, 1)');
        console.log(`[OK] Usuario ${email} creado con rol SUPER_ADMIN y clave admin123.`);
    }

    const all = await pool.request().query('SELECT id, name, email, roleId, isActive FROM dbo.KAX_User');
    console.log('Usuarios en base de datos:', all.recordset);
    await pool.close();
}

run().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
