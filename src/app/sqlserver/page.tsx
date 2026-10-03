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
    Radio
} from 'lucide-react';

interface SQLProfile {
    id: number;
    name: string;
    server: string;
    instance?: string;
    port?: number;
    defaultDatabase: string;
    allowedDatabases: string[];
    username: string;
    isActive: boolean;
}

export default function SQLServerProfilesPage() {
    const [profiles, setProfiles] = useState<SQLProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [testingId, setTestingId] = useState<number | null>(null);
    const [testResult, setTestResult] = useState<{ id: number; success: boolean; message: string; version?: string } | null>(null);

    // Form Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingProfile, setEditingProfile] = useState<Partial<SQLProfile> & { password?: string }>({
        name: '',
        server: '127.0.0.1',
        instance: '',
        port: 1433,
        defaultDatabase: '',
        allowedDatabases: [],
        username: 'sa',
        password: ''
    });

    const loadProfiles = () => {
        setLoading(true);
        fetch('/api/sqlserver/profiles')
            .then(res => res.json())
            .then(data => {
                setProfiles(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        loadProfiles();
    }, []);

    const handleTestConnection = async (profile: SQLProfile) => {
        setTestingId(profile.id);
        setTestResult(null);

        try {
            const res = await fetch('/api/sqlserver/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    server: profile.server,
                    instance: profile.instance,
                    port: profile.port,
                    defaultDatabase: profile.defaultDatabase,
                    username: profile.username
                })
            });
            const data = await res.json();
            setTestResult({
                id: profile.id,
                success: data.success,
                message: data.message || (data.success ? 'Conexión verificada exitosamente' : 'Error de conexión'),
                version: data.version
            });
        } catch (err: any) {
            setTestResult({
                id: profile.id,
                success: false,
                message: err.message || 'Error al conectar'
            });
        } finally {
            setTestingId(null);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/sqlserver/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...editingProfile,
                    allowedDatabases: typeof editingProfile.allowedDatabases === 'string'
                        ? (editingProfile.allowedDatabases as string).split(',').map(s => s.trim()).filter(Boolean)
                        : editingProfile.allowedDatabases
                })
            });
            if (res.ok) {
                setShowModal(false);
                loadProfiles();
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                <div>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                        <Database className="w-6 h-6 text-cyan-400" />
                        <span>Configuración de Servidores SQL Server</span>
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Gestión de perfiles de conexión multi-servidor y aislamiento de bases de datos permitidas.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingProfile({
                            name: '',
                            server: '127.0.0.1',
                            instance: '',
                            port: 1433,
                            defaultDatabase: '',
                            allowedDatabases: [],
                            username: 'sa',
                            password: ''
                        });
                        setShowModal(true);
                    }}
                    className="px-5 h-11 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Perfil SQL</span>
                </button>
            </div>

            {/* Profiles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {profiles.map((profile) => (
                    <div
                        key={profile.id}
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition-colors"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                                    <Server className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold text-white">{profile.name}</h3>
                                    <p className="text-xs text-slate-400 font-mono">
                                        {profile.server}{profile.instance ? `\\${profile.instance}` : ''}:{profile.port || 1433}
                                    </p>
                                </div>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                ACTIVO
                            </span>
                        </div>

                        <div className="bg-slate-950/60 rounded-xl p-3 space-y-1.5 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Base Predeterminada:</span>
                                <span className="font-bold text-slate-200">{profile.defaultDatabase}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Usuario SQL:</span>
                                <span className="font-mono text-slate-300">{profile.username}</span>
                            </div>
                            <div className="pt-1.5 border-t border-slate-800 text-[11px] text-slate-400">
                                <span className="font-semibold text-slate-300">Bases Autorizadas: </span>
                                {(profile.allowedDatabases || []).join(', ')}
                            </div>
                        </div>

                        {testResult && testResult.id === profile.id && (
                            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                                testResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                                {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                                <div>
                                    <p className="font-bold">{testResult.message}</p>
                                    {testResult.version && <p className="text-[10px] text-slate-400 mt-0.5">{testResult.version}</p>}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                            <button
                                onClick={() => handleTestConnection(profile)}
                                disabled={testingId === profile.id}
                                className="px-3.5 h-8 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
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
                                    onClick={() => {
                                        setEditingProfile(profile);
                                        setShowModal(true);
                                    }}
                                    className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Crear / Editar */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                        <h3 className="text-base font-extrabold text-white">
                            {editingProfile.id ? 'Editar Perfil SQL Server' : 'Nuevo Perfil SQL Server'}
                        </h3>

                        <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block text-slate-300 font-bold mb-1">Nombre Descriptivo</label>
                                <input
                                    type="text"
                                    required
                                    value={editingProfile.name || ''}
                                    onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })}
                                    placeholder="Ej: Producción Norte"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Servidor / Host</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingProfile.server || ''}
                                        onChange={e => setEditingProfile({ ...editingProfile, server: e.target.value })}
                                        placeholder="127.0.0.1"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Puerto</label>
                                    <input
                                        type="number"
                                        value={editingProfile.port || 1433}
                                        onChange={e => setEditingProfile({ ...editingProfile, port: Number(e.target.value) })}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Base Predeterminada</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingProfile.defaultDatabase || ''}
                                        onChange={e => setEditingProfile({ ...editingProfile, defaultDatabase: e.target.value })}
                                        placeholder="ZeusAgencias_23"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Usuario SQL</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingProfile.username || ''}
                                        onChange={e => setEditingProfile({ ...editingProfile, username: e.target.value })}
                                        placeholder="sa"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-300 font-bold mb-1">Contraseña SQL (Cifrado AES-256)</label>
                                <input
                                    type="password"
                                    value={editingProfile.password || ''}
                                    onChange={e => setEditingProfile({ ...editingProfile, password: e.target.value })}
                                    placeholder="••••••••••••"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 h-10 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-xl shadow-md shadow-cyan-500/20"
                                >
                                    Guardar Perfil
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
