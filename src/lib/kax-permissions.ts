export interface RolePermissionsMatrix {
    modules: Record<string, boolean>;
    actions: Record<string, boolean>;
}

export const KAX_MODULE_CATALOG: { code: string; label: string; description: string }[] = [
    { code: 'executions', label: 'Ejecuciones de SPs', description: 'Ejecución en tiempo real de consultas y procedimientos almacenados' },
    { code: 'sqlserver', label: 'Servidores y Perfiles SQL', description: 'Configuración y prueba de conexiones a instancias de bases de datos' },
    { code: 'parameters', label: 'Parámetros del Sistema', description: 'Ajustes globales y configuración por usuario' },
    { code: 'users', label: 'Usuarios y Seguridad', description: 'Gestión de cuentas de usuario, roles y niveles de acceso' },
    { code: 'license', label: 'Licenciamiento', description: 'Estado, vigencia y activación de la licencia del software' }
];

export const KAX_ACTION_CATALOG: { key: string; label: string; group: string }[] = [
    // Ejecuciones
    { key: 'executions.run', label: 'Ejecutar Procedimientos y Consultas', group: 'Ejecuciones' },
    { key: 'executions.export', label: 'Exportar Resultados a Excel / CSV / JSON', group: 'Ejecuciones' },
    { key: 'executions.savePreset', label: 'Guardar y Gestionar Presets de Parámetros', group: 'Ejecuciones' },

    // Tableros
    { key: 'dashboards.save', label: 'Crear y Guardar Tableros Analíticos / Widgets', group: 'Tableros' },
    { key: 'dashboards.delete', label: 'Eliminar Tableros Analíticos', group: 'Tableros' },

    // Conexiones SQL
    { key: 'sqlserver.manage', label: 'Crear, Editar y Eliminar Conexiones SQL', group: 'Servidores SQL' },
    { key: 'sqlserver.test', label: 'Probar Conectividad de Servidores', group: 'Servidores SQL' },

    // Seguridad y Usuarios
    { key: 'users.manage', label: 'Crear y Modificar Usuarios y Roles', group: 'Seguridad' },

    // Parámetros y Licencia
    { key: 'parameters.manage', label: 'Configurar Parámetros del Sistema', group: 'Configuración' },
    { key: 'license.manage', label: 'Actualizar y Aplicar Licencia del Software', group: 'Configuración' }
];

export const DEFAULT_SUPERADMIN_PERMISSIONS: RolePermissionsMatrix = {
    modules: KAX_MODULE_CATALOG.reduce((acc, m) => ({ ...acc, [m.code]: true }), {}),
    actions: KAX_ACTION_CATALOG.reduce((acc, a) => ({ ...acc, [a.key]: true }), {})
};

export const DEFAULT_ANALYST_PERMISSIONS: RolePermissionsMatrix = {
    modules: {
        dashboard: true,
        executions: true,
        sqlserver: false,
        parameters: false,
        history: true,
        users: false,
        license: false
    },
    actions: {
        'executions.run': true,
        'executions.export': true,
        'executions.savePreset': true,
        'dashboards.save': true,
        'dashboards.delete': false,
        'sqlserver.manage': false,
        'sqlserver.test': false,
        'users.manage': false,
        'parameters.manage': false,
        'license.manage': false
    }
};

export const DEFAULT_AUDITOR_PERMISSIONS: RolePermissionsMatrix = {
    modules: {
        dashboard: true,
        executions: false,
        sqlserver: false,
        parameters: false,
        history: true,
        users: false,
        license: false
    },
    actions: {
        'executions.run': false,
        'executions.export': true,
        'executions.savePreset': false,
        'dashboards.save': false,
        'dashboards.delete': false,
        'sqlserver.manage': false,
        'sqlserver.test': false,
        'users.manage': false,
        'parameters.manage': false,
        'license.manage': false
    }
};

/**
 * Determina si un nombre de rol corresponde a Super Administrador
 */
export function isSuperAdminRole(roleName?: string): boolean {
    if (!roleName) return false;
    const clean = roleName.toUpperCase().trim();
    return clean.includes('SUPER_ADMIN') || clean.includes('SUPERADMIN') || clean.includes('SUPER ADMINISTRADOR');
}

/**
 * Normaliza y fusiona la matriz de permisos enviada con el catálogo predeterminado
 */
export function normalizeRolePermissions(rawPermissions?: any, roleName?: string): RolePermissionsMatrix {
    if (isSuperAdminRole(roleName)) {
        return DEFAULT_SUPERADMIN_PERMISSIONS;
    }

    if (!rawPermissions || typeof rawPermissions !== 'object') {
        if (roleName?.toUpperCase().includes('ANALYST')) return DEFAULT_ANALYST_PERMISSIONS;
        if (roleName?.toUpperCase().includes('AUDITOR')) return DEFAULT_AUDITOR_PERMISSIONS;
        return DEFAULT_SUPERADMIN_PERMISSIONS;
    }

    // Si viene { all: true }
    if (rawPermissions.all === true) {
        return DEFAULT_SUPERADMIN_PERMISSIONS;
    }

    const modules: Record<string, boolean> = {};
    KAX_MODULE_CATALOG.forEach(m => {
        modules[m.code] = rawPermissions.modules?.[m.code] ?? (rawPermissions[m.code] ?? false);
    });

    const actions: Record<string, boolean> = {};
    KAX_ACTION_CATALOG.forEach(a => {
        actions[a.key] = rawPermissions.actions?.[a.key] ?? false;
    });

    return { modules, actions };
}

/**
 * Evalúa si una matriz de permisos permite un módulo o acción particular
 */
export function hasPermission(
    matrix: RolePermissionsMatrix,
    check: { module?: string; action?: string },
    isSuperAdmin: boolean = false
): boolean {
    if (isSuperAdmin) return true;
    if (check.module && !matrix.modules[check.module]) return false;
    if (check.action && !matrix.actions[check.action]) return false;
    return true;
}
