'use client';

import React, { useState, useEffect } from 'react';
import {
    Database,
    Plus,
    Server,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Trash2,
    Edit2,
    Radio,
    Eye,
    EyeOff,
    ChevronDown,
    ChevronUp,
    Check,
    Zap,
    Settings2,
    X,
    Layers,
    Clock,
    Lock
} from 'lucide-react';
import { parseJsonResponse } from '@/lib/safe-json';

interface SQLProfile {
    id: number;
    name: string;
    server: string;
    instance?: string;
    port: number;
    defaultDatabase: string;
    allowedDatabases: string[];
    username: string;
    encrypt: boolean;
    trustServerCertificate: boolean;
    connectionTimeout: number;
    requestTimeout: number;
    isActive: boolean;
}

interface TestResult {
    id?: number;
    success: boolean;
    message: string;
    version?: string;
    responseTimeMs?: number;
    activeDatabase?: string;
    availableDatabases?: string[];
}

export default function SQLServerProfilesPage() {
    const [profiles, setProfiles] = useState<SQLProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [testingId, setTestingId] = useState<number | null>(null);
    const [cardResults, setCardResults] = useState<Record<number, TestResult>>({});

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modalTesting, setModalTesting] = useState(false);
    const [modalTestResult, setModalTestResult] = useState<TestResult | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

    // Form fields
    const [formState, setFormState] = useState<{
        id?: number;
        name: string;
        server: string;
        instance: string;
        port: number;
        defaultDatabase: string;
        allowedDatabasesText: string;
        allowedDatabasesList: string[];
        username: string;
        password: string;
        encrypt: boolean;
        trustServerCertificate: boolean;
        connectionTimeout: number;
        requestTimeout: number;
        isActive: boolean;
    }>({
        name: '',
        server: '127.0.0.1',
        instance: '',
        port: 1433,
        defaultDatabase: 'Zeusagencias_23',
        allowedDatabasesText: 'Zeusagencias_23, ZeusContabilidad_Db, Korex_Pruebas',
        allowedDatabasesList: ['Zeusagencias_23', 'ZeusContabilidad_Db', 'Korex_Pruebas'],
        username: 'zeusagencias',
        password: '',
        encrypt: false,
        trustServerCertificate: true,
        connectionTimeout: 15,
        requestTimeout: 180,
        isActive: true
    });

    const loadProfiles = () => {
        setLoading(true);
        fetch('/api/sqlserver/profiles')
            .then(res => parseJsonResponse<SQLProfile[]>(res, []))
            .then(data => {
                if (Array.isArray(data)) {
                    setProfiles(data);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Error al cargar perfiles:', err);
                setLoading(false);
            });
    };

    useEffect(() => {
        loadProfiles();
    }, []);

    // Probar conexión desde la tarjeta (utiliza credenciales reales guardadas en DB)
    const handleCardTestConnection = async (profile: SQLProfile) => {
        setTestingId(profile.id);
        try {
            const res = await fetch('/api/sqlserver/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: profile.id })
            });
            const data: TestResult | null = await parseJsonResponse(res, { success: false, message: 'Respuesta inválida' });
            if (data) {
                setCardResults(prev => ({ ...prev, [profile.id]: data }));
            }
        } catch (err: any) {
            setCardResults(prev => ({
                ...prev,
                [profile.id]: {
                    success: false,
                    message: err.message || 'Error al conectar'
                }
            }));
        } finally {
            setTestingId(null);
        }
    };

    // Probar conexión en vivo dentro del Modal (detecta bases de datos)
    const handleModalTestConnection = async () => {
        setModalTesting(true);
        setModalTestResult(null);

        try {
            const res = await fetch('/api/sqlserver/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: formState.id,
                    server: formState.server,
                    instance: formState.instance,
                    port: formState.port,
                    defaultDatabase: formState.defaultDatabase,
                    username: formState.username,
                    password: formState.password,
                    encrypt: formState.encrypt,
                    trustServerCertificate: formState.trustServerCertificate
                })
            });
            const data: TestResult = await res.json();
            setModalTestResult(data);

            // Si detectó bases y defaultDatabase no está en ellas o está vacío, sugerir la primera
            if (data.success && data.availableDatabases && data.availableDatabases.length > 0) {
                if (!formState.defaultDatabase || !data.availableDatabases.includes(formState.defaultDatabase)) {
                    const firstZeus = data.availableDatabases.find(d => d.toLowerCase().includes('zeus')) || data.availableDatabases[0];
                    setFormState(prev => ({ ...prev, defaultDatabase: firstZeus }));
                }
            }
        } catch (err: any) {
            setModalTestResult({
                success: false,
                message: err.message || 'Error de comunicación con el servidor'
            });
        } finally {
            setModalTesting(false);
        }
    };

    // Abrir Modal para crear
    const handleOpenCreate = () => {
        setFormState({
            name: 'Servidor Principal (Zeus ERP)',
            server: '127.0.0.1',
            instance: '',
            port: 1433,
            defaultDatabase: 'Zeusagencias_23',
            allowedDatabasesText: 'Zeusagencias_23, ZeusContabilidad_Db, Korex_Pruebas',
            allowedDatabasesList: ['Zeusagencias_23', 'ZeusContabilidad_Db', 'Korex_Pruebas'],
            username: 'zeusagencias',
            password: '',
            encrypt: false,
            trustServerCertificate: true,
            connectionTimeout: 15,
            requestTimeout: 180,
            isActive: true
        });
        setModalTestResult(null);
        setShowPassword(false);
        setShowAdvanced(false);
        setShowModal(true);
    };

    // Abrir Modal para editar
    const handleOpenEdit = (profile: SQLProfile) => {
        const allowed = profile.allowedDatabases || [profile.defaultDatabase];
        setFormState({
            id: profile.id,
            name: profile.name,
            server: profile.server,
            instance: profile.instance || '',
            port: profile.port || 1433,
            defaultDatabase: profile.defaultDatabase,
            allowedDatabasesText: allowed.join(', '),
            allowedDatabasesList: allowed,
            username: profile.username,
            password: '', // En blanco para conservar la existente salvo que se modifique
            encrypt: profile.encrypt || false,
            trustServerCertificate: profile.trustServerCertificate !== undefined ? profile.trustServerCertificate : true,
            connectionTimeout: profile.connectionTimeout || 15,
            requestTimeout: profile.requestTimeout || 180,
            isActive: profile.isActive !== undefined ? profile.isActive : true
        });
        setModalTestResult(null);
        setShowPassword(false);
        setShowAdvanced(false);
        setShowModal(true);
    };

    // Guardar cambios
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const allowedArray = formState.allowedDatabasesText
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        try {
            const res = await fetch('/api/sqlserver/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: formState.id,
                    name: formState.name,
                    server: formState.server,
                    instance: formState.instance,
                    port: formState.port,
                    defaultDatabase: formState.defaultDatabase,
                    allowedDatabases: allowedArray,
                    username: formState.username,
                    password: formState.password || undefined,
                    encrypt: formState.encrypt,
                    trustServerCertificate: formState.trustServerCertificate,
                    connectionTimeout: formState.connectionTimeout,
                    requestTimeout: formState.requestTimeout,
                    isActive: formState.isActive
                })
            });

            if (res.ok) {
                setShowModal(false);
                loadProfiles();
            } else {
                const err = await parseJsonResponse(res, { message: 'Error al guardar el perfil.' });
                alert(err?.message || 'Error al guardar el perfil.');
            }
        } catch (err: any) {
            alert('Error de conexión al guardar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Eliminar perfil
    const handleDeleteProfile = async (id: number) => {
        try {
            const res = await fetch(`/api/sqlserver/profiles?id=${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setDeleteConfirmId(null);
                loadProfiles();
            }
        } catch (err) {
            console.error('Error al eliminar perfil:', err);
        }
    };

    // Agregar base detectada a la lista de autorizadas
    const toggleAllowedDb = (dbName: string) => {
        const current = formState.allowedDatabasesText.split(',').map(s => s.trim()).filter(Boolean);
        let updated: string[];
        if (current.includes(dbName)) {
            updated = current.filter(d => d !== dbName);
        } else {
            updated = [...current, dbName];
        }
        setFormState(prev => ({
            ...prev,
            allowedDatabasesText: updated.join(', '),
            allowedDatabasesList: updated
        }));
    };

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                <div>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                        <Database className="w-6 h-6 text-cyan-400" />
                        <span>Configuración de Servidores SQL Server / Zeus ERP</span>
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Configure y administre directamente desde aquí los parámetros de conexión, instancias y aislamiento de bases de datos para Zeus ERP.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadProfiles}
                        disabled={loading}
                        className="px-4 h-10 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs border border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
                        title="Recargar perfiles"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Actualizar</span>
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="px-5 h-10 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nuevo Servidor SQL</span>
                    </button>
                </div>
            </div>

            {/* Profiles Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center p-16 text-slate-400 space-y-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                    <p className="text-sm font-semibold">Cargando servidores registrados...</p>
                </div>
            ) : profiles.length === 0 ? (
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-12 text-center space-y-4">
                    <Server className="w-12 h-12 text-slate-500 mx-auto" />
                    <h3 className="text-base font-bold text-white">No hay servidores configurados</h3>
                    <p className="text-xs text-slate-300 max-w-md mx-auto">
                        Agregue un servidor para conectar los procedimientos analíticos con su base de datos de Zeus ERP.
                    </p>
                    <button
                        onClick={handleOpenCreate}
                        className="px-5 h-10 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Configurar Servidor Zeus ERP</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {profiles.map((profile) => {
                        const cardTest = cardResults[profile.id];
                        const isZeus = profile.name.toLowerCase().includes('zeus') || profile.defaultDatabase.toLowerCase().includes('zeus');

                        return (
                            <div
                                key={profile.id}
                                className={`bg-slate-800/80 border rounded-2xl p-5 shadow-sm space-y-4 transition-all duration-200 ${
                                    isZeus ? 'border-cyan-500/40 ring-1 ring-cyan-500/30' : 'border-slate-700/80 hover:border-slate-600'
                                }`}
                            >
                                {/* Top Banner */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl ${isZeus ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-300'}`}>
                                            <Server className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-extrabold text-white">{profile.name}</h3>
                                                {isZeus && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                                        Zeus ERP
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                                                {profile.server}{profile.instance ? `\\${profile.instance}` : ''}:{profile.port || 1433}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                        profile.isActive
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-slate-700 text-slate-400 border-slate-600'
                                    }`}>
                                        {profile.isActive ? 'ACTIVO' : 'INACTIVO'}
                                    </span>
                                </div>

                                {/* Information Box */}
                                <div className="bg-slate-900/90 rounded-xl p-3.5 space-y-2 text-xs border border-slate-700/80">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-300">Base Predeterminada:</span>
                                        <span className="font-bold text-cyan-300 font-mono">{profile.defaultDatabase}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-300">Usuario SQL:</span>
                                        <span className="font-mono text-slate-200 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                            {profile.username}
                                        </span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-700/80">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[11px] font-semibold text-slate-300">Bases Autorizadas:</span>
                                            <span className="text-[10px] text-slate-400">{profile.allowedDatabases?.length || 0} asignadas</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(profile.allowedDatabases || []).map((db, idx) => (
                                                <span
                                                    key={idx}
                                                    className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-800 text-slate-200 border border-slate-700"
                                                >
                                                    {db}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Live Test Result Banner */}
                                {cardTest && (
                                    <div className={`p-3 rounded-xl text-xs flex items-start gap-2.5 transition-all ${
                                        cardTest.success
                                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-300 border border-red-500/20'
                                    }`}>
                                        {cardTest.success ? (
                                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                                        )}
                                        <div className="space-y-0.5 flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="font-bold truncate">{cardTest.message}</p>
                                                {cardTest.responseTimeMs !== undefined && (
                                                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                                        {cardTest.responseTimeMs} ms
                                                    </span>
                                                )}
                                            </div>
                                            {cardTest.version && (
                                                <p className="text-[10px] text-slate-400 font-mono truncate">{cardTest.version}</p>
                                            )}
                                            {cardTest.availableDatabases && cardTest.availableDatabases.length > 0 && (
                                                <p className="text-[10px] text-cyan-400 font-semibold pt-1">
                                                    ✓ {cardTest.availableDatabases.length} bases en línea detectadas en SQL Server
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                                    <button
                                        onClick={() => handleCardTestConnection(profile)}
                                        disabled={testingId === profile.id}
                                        className="px-3.5 h-8 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700 active:scale-95"
                                    >
                                        {testingId === profile.id ? (
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Radio className="w-3.5 h-3.5" />
                                        )}
                                        <span>Probar Conexión</span>
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleOpenEdit(profile)}
                                            className="px-3 h-8 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                                            title="Editar configuración"
                                        >
                                            <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                                            <span>Configurar</span>
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirmId(profile.id)}
                                            className="p-2 text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer border border-slate-700"
                                            title="Eliminar perfil"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Eliminación */}
            {deleteConfirmId !== null && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-red-400">
                            <AlertCircle className="w-6 h-6" />
                            <h3 className="text-base font-extrabold text-white">¿Eliminar Servidor?</h3>
                        </div>
                        <p className="text-xs text-slate-400">
                            Esta acción eliminará el perfil de conexión. Las ejecuciones históricas mantendrán su trazabilidad pero este perfil no estará disponible para nuevas consultas.
                        </p>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-4 h-9 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDeleteProfile(deleteConfirmId)}
                                className="px-4 h-9 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs"
                            >
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Crear / Editar Perfil */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl my-8 overflow-hidden">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                                    <Settings2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-white">
                                        {formState.id ? 'Configurar Servidor SQL Server / Zeus ERP' : 'Nuevo Servidor SQL Server / Zeus ERP'}
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Parámetros de acceso, credenciales y asignación de bases de datos
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSaveProfile} className="p-6 space-y-4 text-xs">
                            {/* Nombre del Servidor */}
                            <div>
                                <label className="block text-slate-300 font-bold mb-1">Nombre Descriptivo del Servidor</label>
                                <input
                                    type="text"
                                    required
                                    value={formState.name}
                                    onChange={e => setFormState({ ...formState, name: e.target.value })}
                                    placeholder="Ej: Producción Central (Zeus ERP)"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                                />
                            </div>

                            {/* Servidor, Instancia y Puerto */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-1">
                                    <label className="block text-slate-300 font-bold mb-1">Host / Servidor / IP</label>
                                    <input
                                        type="text"
                                        required
                                        value={formState.server}
                                        onChange={e => setFormState({ ...formState, server: e.target.value })}
                                        placeholder="127.0.0.1 o ZEUSAGENCIAS10"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Instancia (Opcional)</label>
                                    <input
                                        type="text"
                                        value={formState.instance}
                                        onChange={e => setFormState({ ...formState, instance: e.target.value })}
                                        placeholder="En blanco o SQLEXPRESS"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Puerto TCP</label>
                                    <input
                                        type="number"
                                        value={formState.port}
                                        onChange={e => setFormState({ ...formState, port: Number(e.target.value) })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Credenciales de Autenticación */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Usuario SQL Server</label>
                                    <input
                                        type="text"
                                        required
                                        value={formState.username}
                                        onChange={e => setFormState({ ...formState, username: e.target.value })}
                                        placeholder="zeusagencias o sa"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-slate-300 font-bold">Contraseña SQL</label>
                                        {formState.id && (
                                            <span className="text-[10px] text-slate-500">Dejar vacía para conservar actual</span>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formState.password}
                                            onChange={e => setFormState({ ...formState, password: e.target.value })}
                                            placeholder={formState.id ? '•••••••••••• (Conservada)' : 'Ingrese contraseña'}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 pr-10 text-slate-100 focus:border-cyan-500 focus:outline-none font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Botón de Prueba en Vivo y Detección de Bases */}
                            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2.5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-cyan-400" />
                                        <span className="font-bold text-slate-200">Verificación y Detección Automática</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleModalTestConnection}
                                        disabled={modalTesting}
                                        className="px-3.5 h-8 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-extrabold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm shadow-cyan-500/20 active:scale-95 disabled:opacity-50"
                                    >
                                        {modalTesting ? (
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Radio className="w-3.5 h-3.5" />
                                        )}
                                        <span>Probar y Detectar Bases</span>
                                    </button>
                                </div>

                                {modalTestResult && (
                                    <div className={`p-3 rounded-lg text-xs border ${
                                        modalTestResult.success
                                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-300 border-red-500/20'
                                    }`}>
                                        <div className="flex items-center gap-2">
                                            {modalTestResult.success ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                            ) : (
                                                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                            )}
                                            <span className="font-bold">{modalTestResult.message}</span>
                                        </div>
                                        {modalTestResult.version && (
                                            <p className="text-[10px] text-slate-400 font-mono mt-1">{modalTestResult.version}</p>
                                        )}

                                        {/* Bases detectadas disponibles para clic */}
                                        {modalTestResult.availableDatabases && modalTestResult.availableDatabases.length > 0 && (
                                            <div className="mt-2.5 pt-2 border-t border-emerald-500/20 space-y-1.5">
                                                <p className="text-[11px] font-bold text-cyan-300">
                                                    Bases encontradas en el servidor (Haga clic para agregar/quitar de autorizadas):
                                                </p>
                                                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                                                    {modalTestResult.availableDatabases.map((db) => {
                                                        const isSelected = formState.allowedDatabasesText.split(',').map(s => s.trim()).includes(db);
                                                        const isDefault = formState.defaultDatabase === db;

                                                        return (
                                                            <button
                                                                type="button"
                                                                key={db}
                                                                onClick={() => toggleAllowedDb(db)}
                                                                className={`px-2 py-1 rounded-md text-[10px] font-mono font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                                                    isSelected
                                                                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                                                                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                                                                }`}
                                                            >
                                                                {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
                                                                <span>{db}</span>
                                                                {isDefault && <span className="text-[9px] text-amber-400 font-bold">(Predet.)</span>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Base de Datos Predeterminada */}
                            <div>
                                <label className="block text-slate-300 font-bold mb-1">Base de Datos Predeterminada (Zeus ERP)</label>
                                {modalTestResult?.availableDatabases && modalTestResult.availableDatabases.length > 0 ? (
                                    <div className="flex gap-2">
                                        <select
                                            value={formState.defaultDatabase}
                                            onChange={e => setFormState({ ...formState, defaultDatabase: e.target.value })}
                                            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                                        >
                                            {modalTestResult.availableDatabases.map(db => (
                                                <option key={db} value={db}>{db}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="text"
                                            value={formState.defaultDatabase}
                                            onChange={e => setFormState({ ...formState, defaultDatabase: e.target.value })}
                                            className="w-48 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                                            placeholder="O escribir nombre"
                                        />
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        required
                                        value={formState.defaultDatabase}
                                        onChange={e => setFormState({ ...formState, defaultDatabase: e.target.value })}
                                        placeholder="Ej: Zeusagencias_23"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                                    />
                                )}
                            </div>

                            {/* Bases de Datos Autorizadas */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-slate-300 font-bold">Bases de Datos Autorizadas</label>
                                    <span className="text-[10px] text-slate-400">Separadas por comas</span>
                                </div>
                                <input
                                    type="text"
                                    value={formState.allowedDatabasesText}
                                    onChange={e => setFormState({ ...formState, allowedDatabasesText: e.target.value })}
                                    placeholder="Zeusagencias_23, ZeusContabilidad_Db, Korex_Pruebas"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none font-mono text-[11px]"
                                />
                            </div>

                            {/* Opciones Avanzadas Colapsables */}
                            <div className="pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    <span>Parámetros Avanzados de Conexión y Seguridad</span>
                                </button>

                                {showAdvanced && (
                                    <div className="mt-3 p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-slate-400 font-semibold mb-1">Timeout Conexión (s)</label>
                                                <input
                                                    type="number"
                                                    value={formState.connectionTimeout}
                                                    onChange={e => setFormState({ ...formState, connectionTimeout: Number(e.target.value) })}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-slate-400 font-semibold mb-1">Timeout Consultas (s)</label>
                                                <input
                                                    type="number"
                                                    value={formState.requestTimeout}
                                                    onChange={e => setFormState({ ...formState, requestTimeout: Number(e.target.value) })}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-4 pt-1">
                                            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                                                <input
                                                    type="checkbox"
                                                    checked={formState.trustServerCertificate}
                                                    onChange={e => setFormState({ ...formState, trustServerCertificate: e.target.checked })}
                                                    className="rounded border-slate-700 text-cyan-600 focus:ring-0"
                                                />
                                                <span>Confiar en Certificado de Servidor (Recomendado para Zeus local)</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                                                <input
                                                    type="checkbox"
                                                    checked={formState.encrypt}
                                                    onChange={e => setFormState({ ...formState, encrypt: e.target.checked })}
                                                    className="rounded border-slate-700 text-cyan-600 focus:ring-0"
                                                />
                                                <span>Forzar Cifrado SSL/TLS (Encrypt)</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                                                <input
                                                    type="checkbox"
                                                    checked={formState.isActive}
                                                    onChange={e => setFormState({ ...formState, isActive: e.target.checked })}
                                                    className="rounded border-slate-700 text-cyan-600 focus:ring-0"
                                                />
                                                <span>Servidor Habilitado y Activo</span>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 h-10 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                                    <span>{formState.id ? 'Guardar Cambios' : 'Registrar Servidor'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
