'use client';

import React, { useState, useEffect } from 'react';
import { 
    Users, Shield, KeyRound, CheckCircle2, AlertCircle, Plus, Edit2, 
    RefreshCw, Lock, Mail, User, Building, FileText, Check, X, ShieldCheck,
    Calendar, Clock
} from 'lucide-react';
import { parseJsonResponse } from '@/lib/safe-json';

interface UserEntity {
    id: number;
    name: string;
    email: string;
    roleId: number;
    roleName: string;
    isActive: boolean;
    lastLoginAt?: string;
    createdAt?: string;
}

interface RoleEntity {
    id: number;
    name: string;
    description?: string;
    permissions?: any;
    isActive: boolean;
}

interface LicenseInfo {
    isLicensed: boolean;
    isExpired: boolean;
    expirationDate: string | null;
    daysRemaining: number | null;
    clientName: string | null;
    nit: string | null;
    status: 'ACTIVE' | 'WARNING' | 'EXPIRED' | 'UNLICENSED';
}

export default function UsersManagementPage() {
    const [activeTab, setActiveTab] = useState<'users' | 'license'>('users');
    const [users, setUsers] = useState<UserEntity[]>([]);
    const [roles, setRoles] = useState<RoleEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
    const [licenseKeyInput, setLicenseKeyInput] = useState('');
    const [licenseLoading, setLicenseLoading] = useState(false);
    const [licenseMessage, setLicenseMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Modal para Crear / Editar Usuario
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserEntity | null>(null);
    const [formName, setFormName] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formPassword, setFormPassword] = useState('');
    const [formRoleId, setFormRoleId] = useState<number>(1);
    const [formIsActive, setFormIsActive] = useState(true);
    const [savingUser, setSavingUser] = useState(false);
    const [userFormError, setUserFormError] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersRes, licRes] = await Promise.all([
                fetch('/api/users'),
                fetch('/api/license')
            ]);

            const usersData = await parseJsonResponse<any>(usersRes, { success: false, users: [], roles: [] });
            const licData = await parseJsonResponse<any>(licRes, null);

            if (usersData?.success) {
                setUsers(usersData.users || []);
                setRoles(usersData.roles || []);
                if (usersData.roles && usersData.roles.length > 0) {
                    setFormRoleId(usersData.roles[0].id);
                }
            }

            if (licData) {
                setLicenseInfo(licData);
            }
        } catch (err: any) {
            console.error('Error cargando datos de seguridad:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const openCreateModal = () => {
        setEditingUser(null);
        setFormName('');
        setFormEmail('');
        setFormPassword('');
        setFormRoleId(roles.length > 0 ? roles[0].id : 1);
        setFormIsActive(true);
        setUserFormError(null);
        setShowUserModal(true);
    };

    const openEditModal = (user: UserEntity) => {
        setEditingUser(user);
        setFormName(user.name);
        setFormEmail(user.email);
        setFormPassword('');
        setFormRoleId(user.roleId);
        setFormIsActive(user.isActive);
        setUserFormError(null);
        setShowUserModal(true);
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName.trim() || !formEmail.trim() || !formRoleId) {
            setUserFormError('Por favor complete los campos obligatorios.');
            return;
        }

        if (!editingUser && !formPassword.trim()) {
            setUserFormError('La contraseña es requerida para nuevos usuarios.');
            return;
        }

        setSavingUser(true);
        setUserFormError(null);

        try {
            const payload: any = {
                id: editingUser ? editingUser.id : null,
                name: formName.trim(),
                email: formEmail.trim(),
                roleId: formRoleId,
                isActive: formIsActive
            };

            if (formPassword.trim()) {
                payload.password = formPassword.trim();
            }

            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await parseJsonResponse<any>(res, { success: false, message: 'Respuesta inválida del servidor' });
            if (!res.ok || !data?.success) {
                throw new Error(data?.message || 'Error al guardar usuario');
            }

            setShowUserModal(false);
            await loadData();
        } catch (err: any) {
            setUserFormError(err.message || 'Error al guardar usuario');
        } finally {
            setSavingUser(false);
        }
    };

    const handleApplyLicense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!licenseKeyInput.trim()) {
            setLicenseMessage({ type: 'error', text: 'Por favor ingrese la clave de licencia.' });
            return;
        }

        setLicenseLoading(true);
        setLicenseMessage(null);

        try {
            const res = await fetch('/api/license', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ licenseKey: licenseKeyInput.trim() })
            });

            const data = await parseJsonResponse<any>(res, { success: false, message: 'Respuesta inválida del servidor' });
            if (!res.ok || !data?.success) {
                throw new Error(data?.message || 'Error al validar clave de licencia');
            }

            setLicenseMessage({
                type: 'success',
                text: `¡Licencia activada con éxito para ${data.license?.client}! Vigente hasta ${data.license?.expirationDate}.`
            });
            setLicenseKeyInput('');
            await loadData();
        } catch (err: any) {
            setLicenseMessage({
                type: 'error',
                text: err.message || 'Clave de licencia inválida o expirada.'
            });
        } finally {
            setLicenseLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-wide">Seguridad, Usuarios y Licenciamiento</h1>
                            <p className="text-xs text-slate-400">Control de acceso granular, roles y estado criptográfico de la licencia</p>
                        </div>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                            activeTab === 'users'
                                ? 'bg-cyan-600 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        <span>Usuarios y Roles</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('license')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                            activeTab === 'license'
                                ? 'bg-cyan-600 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Licencia del Software</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: USUARIOS Y ROLES */}
            {activeTab === 'users' && (
                <div className="space-y-6">
                    {/* Top Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-400 font-medium">Total Usuarios</p>
                                <p className="text-2xl font-bold text-white mt-1">{users.length}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                                <Users className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-400 font-medium">Usuarios Activos</p>
                                <p className="text-2xl font-bold text-emerald-400 mt-1">
                                    {users.filter(u => u.isActive).length}
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-400 font-medium">Roles Definidos</p>
                                <p className="text-2xl font-bold text-cyan-300 mt-1">{roles.length}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-300 flex items-center justify-center">
                                <Shield className="w-5 h-5" />
                            </div>
                        </div>
                    </div>

                    {/* Table Card */}
                    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
                        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-700/80">
                            <div>
                                <h2 className="text-sm font-bold text-white">Catálogo de Cuentas de Acceso</h2>
                                <p className="text-xs text-slate-400">Usuarios con permisos para operar consultas y tableros</p>
                            </div>
                            <button
                                onClick={openCreateModal}
                                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-lg shadow-cyan-600/20 cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Nuevo Usuario</span>
                            </button>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
                                <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                                <span>Cargando usuarios y roles...</span>
                            </div>
                        ) : users.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">
                                No se encontraron usuarios registrados en la base de datos interna.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-700">
                                        <tr>
                                            <th className="py-3 px-4">Usuario</th>
                                            <th className="py-3 px-4">Correo Electrónico</th>
                                            <th className="py-3 px-4">Rol Asignado</th>
                                            <th className="py-3 px-4">Estado</th>
                                            <th className="py-3 px-4">Último Acceso</th>
                                            <th className="py-3 px-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800 text-slate-300">
                                        {users.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-800/40 transition">
                                                <td className="py-3 px-4 font-semibold text-white flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold">
                                                        {u.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span>{u.name}</span>
                                                </td>
                                                <td className="py-3 px-4 font-mono text-slate-300">{u.email}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                                                        u.roleName?.includes('SUPER_ADMIN')
                                                            ? 'bg-purple-950/40 border-purple-500/30 text-purple-300'
                                                            : u.roleName?.includes('ADMIN')
                                                            ? 'bg-blue-950/40 border-blue-500/30 text-blue-300'
                                                            : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300'
                                                    }`}>
                                                        {u.roleName || 'SIN ROL'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {u.isActive ? (
                                                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                            Activo
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                                            Inactivo
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-slate-400">
                                                    {u.lastLoginAt ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                                                            <span>{new Date(u.lastLoginAt).toLocaleString()}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-600">Nunca</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        onClick={() => openEditModal(u)}
                                                        className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition"
                                                        title="Editar Usuario"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: LICENCIA */}
            {activeTab === 'license' && (
                <div className="space-y-6">
                    {/* Tarjeta de Estado Actual */}
                    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
                            <div>
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <KeyRound className="w-5 h-5 text-cyan-400" />
                                    <span>Vigencia y Estado del Licenciamiento</span>
                                </h2>
                                <p className="text-xs text-slate-400">Verificación criptográfica HMAC SHA-256 en tiempo de ejecución</p>
                            </div>

                            <div>
                                {licenseInfo?.status === 'ACTIVE' && (
                                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Licencia Activa
                                    </span>
                                )}
                                {licenseInfo?.status === 'WARNING' && (
                                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                                        <AlertCircle className="w-4 h-4" />
                                        Por Expirar ({licenseInfo.daysRemaining} días)
                                    </span>
                                )}
                                {licenseInfo?.status === 'EXPIRED' && (
                                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
                                        <AlertCircle className="w-4 h-4" />
                                        Licencia Expirada
                                    </span>
                                )}
                                {(!licenseInfo?.isLicensed || licenseInfo?.status === 'UNLICENSED') && (
                                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-xs font-bold">
                                        No Licenciado
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Grid de Atributos */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4">
                                <span className="text-[11px] text-slate-400 font-medium">Cliente Autorizado</span>
                                <div className="flex items-center gap-2 mt-1 text-slate-200 font-semibold text-sm">
                                    <Building className="w-4 h-4 text-cyan-400 shrink-0" />
                                    <span className="truncate">{licenseInfo?.clientName || 'Sin Registrar'}</span>
                                </div>
                            </div>

                            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                                <span className="text-[11px] text-slate-400 font-medium">NIT / Identificación</span>
                                <div className="flex items-center gap-2 mt-1 text-slate-200 font-semibold text-sm">
                                    <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                                    <span>{licenseInfo?.nit || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                                <span className="text-[11px] text-slate-400 font-medium">Fecha de Vencimiento</span>
                                <div className="flex items-center gap-2 mt-1 text-slate-200 font-semibold text-sm">
                                    <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                                    <span>{licenseInfo?.expirationDate || 'N/A'}</span>
                                </div>
                            </div>

                            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                                <span className="text-[11px] text-slate-400 font-medium">Días Restantes</span>
                                <div className="flex items-center gap-2 mt-1 font-bold text-sm">
                                    <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
                                    <span className={
                                        (licenseInfo?.daysRemaining ?? 0) <= 0 
                                            ? 'text-rose-400' 
                                            : (licenseInfo?.daysRemaining ?? 0) <= 15 
                                            ? 'text-amber-400' 
                                            : 'text-emerald-400'
                                    }>
                                        {licenseInfo?.daysRemaining !== null ? `${licenseInfo?.daysRemaining} días` : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Mensaje de Resultado de Activación */}
                        {licenseMessage && (
                            <div className={`p-4 rounded-xl flex items-start gap-3 text-xs ${
                                licenseMessage.type === 'success'
                                    ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                                    : 'bg-rose-950/40 border border-rose-500/30 text-rose-300'
                            }`}>
                                {licenseMessage.type === 'success' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                )}
                                <span>{licenseMessage.text}</span>
                            </div>
                        )}

                        {/* Formulario de Renovación / Aplicación */}
                        <form onSubmit={handleApplyLicense} className="space-y-4 pt-2">
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                Aplicar o Renovar Clave de Licencia
                            </label>
                            <div className="relative">
                                <textarea
                                    value={licenseKeyInput}
                                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                                    placeholder="Pegue aquí el token generado (KOR1.eyJ...)"
                                    rows={3}
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={licenseLoading}
                                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
                            >
                                {licenseLoading ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Validando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        <span>Actualizar Licencia</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL CREAR / EDITAR USUARIO */}
            {showUserModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <User className="w-5 h-5 text-cyan-400" />
                                <span>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</span>
                            </h3>
                            <button
                                onClick={() => setShowUserModal(false)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {userFormError && (
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{userFormError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-slate-300 font-bold mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Ej: Laura Gómez"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-300 font-bold mb-1">Correo Electrónico</label>
                                <input
                                    type="email"
                                    required
                                    value={formEmail}
                                    onChange={(e) => setFormEmail(e.target.value)}
                                    placeholder="usuario@empresa.com"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-300 font-bold mb-1">
                                    {editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}
                                </label>
                                <input
                                    type="password"
                                    required={!editingUser}
                                    value={formPassword}
                                    onChange={(e) => setFormPassword(e.target.value)}
                                    placeholder={editingUser ? 'Dejar en blanco para conservar actual' : '••••••••••••'}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-300 font-bold mb-1">Rol de Acceso</label>
                                <select
                                    value={formRoleId}
                                    onChange={(e) => setFormRoleId(parseInt(e.target.value, 10))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-cyan-500"
                                >
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.name} {r.description ? `— ${r.description}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={formIsActive}
                                        onChange={(e) => setFormIsActive(e.target.checked)}
                                        className="rounded border-slate-700 text-cyan-600 focus:ring-0"
                                    />
                                    <span>Usuario Activo en el Sistema</span>
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowUserModal(false)}
                                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingUser}
                                    className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-xl transition cursor-pointer"
                                >
                                    {savingUser ? 'Guardando...' : editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
