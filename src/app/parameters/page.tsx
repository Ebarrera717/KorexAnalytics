'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Sliders,
    Save,
    CheckCircle2,
    Database,
    Shield,
    FileSpreadsheet,
    Settings2,
    Plane,
    ArrowRight
} from 'lucide-react';
import { parseJsonResponse } from '@/lib/safe-json';

export default function UserParametersPage() {
    const [params, setParams] = useState({
        DefaultSQLProfileId: '1',
        DefaultDatabase: 'ZeusAgencias_23',
        MaxRecordsLimit: '5000',
        AutoExportFormat: 'EXCEL',
        ThemeMode: 'DARK'
    });
    const [saving, setSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);

    useEffect(() => {
        fetch('/api/parameters/user?userId=1')
            .then(res => parseJsonResponse<any>(res, { parameters: null }))
            .then(data => {
                if (data && data.parameters) setParams(data.parameters);
            })
            .catch(console.error);
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSavedSuccess(false);

        try {
            const res = await fetch('/api/parameters/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: 1, parameters: params })
            });
            if (res.ok) {
                setSavedSuccess(true);
                setTimeout(() => setSavedSuccess(false), 3000);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                <div>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                        <Sliders className="w-6 h-6 text-cyan-400" />
                        <span>Parámetros y Preferencias de Usuario</span>
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Configuración personalizada de valores por defecto y límites de ejecución.
                    </p>
                </div>
            </div>

            {savedSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2.5 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Parámetros guardados y aplicados correctamente.</span>
                </div>
            )}

            {/* Acceso a Maestro de Fare Basis */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-900/80 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all group shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400 group-hover:scale-105 transition-transform shrink-0">
                        <Plane className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-extrabold text-sm text-white group-hover:text-cyan-400 transition-colors">
                            Maestro de Reglas de Fare Basis por Aerolínea
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Configura las reglas de extracción segmentada para calcular la columna <strong className="text-cyan-400">FarebasisReal</strong>.
                        </p>
                    </div>
                </div>
                <Link
                    href="/parameters/farebasis"
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-cyan-500 text-slate-200 hover:text-slate-950 rounded-xl font-bold text-xs transition-all shrink-0 self-start sm:self-auto"
                >
                    <span>Configurar Reglas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </div>

            <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 text-xs">
                <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Database className="w-4 h-4 text-cyan-400" />
                        <span>Preferencia de Conexión</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-300 font-bold mb-1">ID Perfil SQL Favorito</label>
                            <input
                                type="text"
                                value={params.DefaultSQLProfileId || ''}
                                onChange={e => setParams({ ...params, DefaultSQLProfileId: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-300 font-bold mb-1">Base de Datos Predeterminada</label>
                            <input
                                type="text"
                                value={params.DefaultDatabase || ''}
                                onChange={e => setParams({ ...params, DefaultDatabase: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-cyan-400" />
                        <span>Límites y Exportación</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-slate-300 font-bold mb-1">Límite Máximo de Registros por Consulta</label>
                            <input
                                type="number"
                                value={params.MaxRecordsLimit || '5000'}
                                onChange={e => setParams({ ...params, MaxRecordsLimit: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-300 font-bold mb-1">Formato de Auto-Exportación</label>
                            <select
                                value={params.AutoExportFormat || 'EXCEL'}
                                onChange={e => setParams({ ...params, AutoExportFormat: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                            >
                                <option value="EXCEL">Microsoft Excel (.xlsx)</option>
                                <option value="CSV">Archivo CSV (.csv)</option>
                                <option value="JSON">JSON Estructurado (.json)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 h-11 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                    >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Guardando...' : 'Guardar Parámetros'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
