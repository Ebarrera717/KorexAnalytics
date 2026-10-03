'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Play,
    Database,
    RefreshCw,
    Download,
    Filter,
    Bookmark,
    Save,
    CheckCircle2,
    AlertCircle,
    Clock,
    SlidersHorizontal,
    Table as TableIcon,
    ChevronDown,
    X,
    Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ProcedureParam {
    name: string;
    label: string;
    type: 'text' | 'date' | 'select' | 'number';
    placeholder?: string;
    defaultValue?: string;
    required?: boolean;
}

interface Procedure {
    id: number;
    name: string;
    spName: string;
    description?: string;
    category?: string;
    parameters: ProcedureParam[];
}

interface SQLProfile {
    id: number;
    name: string;
    server: string;
    defaultDatabase: string;
    allowedDatabases: string[];
    username: string;
}

interface Preset {
    id: number;
    name: string;
    procedureId: number;
    filterValues: Record<string, string>;
}

export default function ExecutionsPage() {
    const [profiles, setProfiles] = useState<SQLProfile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
    const [selectedDatabase, setSelectedDatabase] = useState<string>('');

    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [selectedProc, setSelectedProc] = useState<Procedure | null>(null);
    const [filterValues, setFilterValues] = useState<Record<string, string>>({});

    const [presets, setPresets] = useState<Preset[]>([]);
    const [selectedPresetId, setSelectedPresetId] = useState<string>('');
    const [showPresetModal, setShowPresetModal] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');

    // Execution state
    const [executing, setExecuting] = useState(false);
    const [executionResult, setExecutionResult] = useState<any | null>(null);
    const [executionError, setExecutionError] = useState<string | null>(null);

    // Initial Load
    useEffect(() => {
        // Cargar perfiles SQL
        fetch('/api/sqlserver/profiles')
            .then(res => res.json())
            .then(data => {
                setProfiles(data);
                if (data.length > 0) {
                    setSelectedProfileId(data[0].id);
                    setSelectedDatabase(data[0].defaultDatabase);
                }
            })
            .catch(console.error);

        // Cargar procedimientos analíticos
        fetch('/api/executions/procedures')
            .then(res => res.json())
            .then(data => {
                setProcedures(data);
                if (data.length > 0) {
                    selectProcedure(data[0]);
                }
            })
            .catch(console.error);
    }, []);

    const activeProfile = useMemo(() => {
        return profiles.find(p => p.id === selectedProfileId) || null;
    }, [profiles, selectedProfileId]);

    const selectProcedure = (proc: Procedure) => {
        setSelectedProc(proc);
        const defaults: Record<string, string> = {};
        proc.parameters.forEach(param => {
            if (param.defaultValue) defaults[param.name] = param.defaultValue;
            else if (param.type === 'date') {
                const today = new Date().toISOString().split('T')[0];
                defaults[param.name] = today;
            }
        });
        setFilterValues(defaults);
        setExecutionResult(null);
        setExecutionError(null);

        // Cargar presets de este procedimiento
        fetch(`/api/executions/presets?procedureId=${proc.id}`)
            .then(res => res.json())
            .then(setPresets)
            .catch(console.error);
    };

    const handleRunExecution = async () => {
        if (!selectedProc || !activeProfile) return;

        setExecuting(true);
        setExecutionError(null);
        setExecutionResult(null);

        try {
            const res = await fetch('/api/executions/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile: activeProfile,
                    targetDatabase: selectedDatabase,
                    spName: selectedProc.spName,
                    parameters: filterValues,
                    userId: 1,
                    userName: 'Admin'
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                setExecutionError(data.message || 'Error durante la ejecución del procedimiento.');
            } else {
                setExecutionResult(data);
            }
        } catch (err: any) {
            setExecutionError(err.message || 'Error de conexión con el servidor.');
        } finally {
            setExecuting(false);
        }
    };

    const handleExportExcel = () => {
        if (!executionResult || !executionResult.data || executionResult.data.length === 0) return;
        const worksheet = XLSX.utils.json_to_sheet(executionResult.data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados');
        XLSX.writeFile(workbook, `${executionResult.spName}_${executionResult.traceId}.xlsx`);
    };

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                <div>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                        <Play className="w-6 h-6 text-cyan-400" />
                        <span>Módulo de Ejecuciones Analíticas</span>
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Parametrización dinámica y ejecución de Stored Procedures sobre SQL Server.
                    </p>
                </div>
            </div>

            {/* Target Profile & Database Selector Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <Database className="w-4 h-4 text-cyan-400" />
                    <span>1. Servidor y Base de Datos Destino</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Perfil de Conexión SQL Server</label>
                        <select
                            value={selectedProfileId || ''}
                            onChange={(e) => {
                                const id = Number(e.target.value);
                                setSelectedProfileId(id);
                                const prof = profiles.find(p => p.id === id);
                                if (prof) setSelectedDatabase(prof.defaultDatabase);
                            }}
                            className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:border-cyan-500 focus:outline-none"
                        >
                            {profiles.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.server})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">Base de Datos Autorizada</label>
                        <select
                            value={selectedDatabase}
                            onChange={(e) => setSelectedDatabase(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:border-cyan-500 focus:outline-none"
                        >
                            {(activeProfile?.allowedDatabases || [selectedDatabase]).map(db => (
                                <option key={db} value={db}>{db}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Procedure & Parameters Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <Filter className="w-4 h-4 text-cyan-400" />
                        <span>2. Selección de Procedimiento y Filtros</span>
                    </div>

                    {presets.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-semibold">Preset:</span>
                            <select
                                value={selectedPresetId}
                                onChange={(e) => {
                                    setSelectedPresetId(e.target.value);
                                    const preset = presets.find(p => String(p.id) === e.target.value);
                                    if (preset) setFilterValues(preset.filterValues);
                                }}
                                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1"
                            >
                                <option value="">Seleccionar preset...</option>
                                {presets.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Procedure Selector Tabs / Dropdown */}
                <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Procedimiento Almacenado</label>
                    <select
                        value={selectedProc?.id || ''}
                        onChange={(e) => {
                            const proc = procedures.find(p => p.id === Number(e.target.value));
                            if (proc) selectProcedure(proc);
                        }}
                        className="w-full bg-slate-950 border border-slate-700 text-cyan-400 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:border-cyan-500 focus:outline-none"
                    >
                        {procedures.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name} ({p.spName})
                            </option>
                        ))}
                    </select>
                    {selectedProc?.description && (
                        <p className="text-[11px] text-slate-400 mt-1.5 italic">{selectedProc.description}</p>
                    )}
                </div>

                {/* Dynamic Parameters Grid */}
                {selectedProc && selectedProc.parameters.length > 0 && (
                    <div className="pt-2 border-t border-slate-800">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {selectedProc.parameters.map((param) => (
                                <div key={param.name}>
                                    <label className="block text-xs font-bold text-slate-300 mb-1">
                                        {param.label} {param.required && <span className="text-red-400">*</span>}
                                    </label>
                                    <input
                                        type={param.type === 'number' ? 'number' : param.type === 'date' ? 'date' : 'text'}
                                        value={filterValues[param.name] || ''}
                                        onChange={(e) => setFilterValues({ ...filterValues, [param.name]: e.target.value })}
                                        placeholder={param.placeholder || ''}
                                        className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2 text-xs focus:border-cyan-500 focus:outline-none"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Toolbar */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                    <button
                        onClick={() => setShowPresetModal(true)}
                        className="px-4 h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Guardar como Preset</span>
                    </button>

                    <button
                        onClick={handleRunExecution}
                        disabled={executing}
                        className="px-6 h-11 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                    >
                        {executing ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                                <span>Ejecutando en SQL Server...</span>
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 fill-current" />
                                <span>Ejecutar Proceso</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {executionError && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider">Error en la Ejecución</h4>
                        <p className="text-xs mt-0.5">{executionError}</p>
                    </div>
                </div>
            )}

            {/* Execution Results Section */}
            {executionResult && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-0">
                    {/* Results Header */}
                    <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/40">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-extrabold text-white">{executionResult.spName}</h3>
                                    <span className="font-mono text-[11px] text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                                        {executionResult.traceId}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Base: <span className="text-slate-200">{executionResult.targetDatabase}</span> • Filas: <span className="text-slate-200">{executionResult.recordCount.toLocaleString()}</span> • Duración: <span className="text-slate-200">{executionResult.elapsedTimeMs} ms</span>
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleExportExcel}
                            className="px-4 h-9 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold rounded-xl text-xs border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Descargar Excel</span>
                        </button>
                    </div>

                    {/* Data Table */}
                    <div className="overflow-x-auto max-h-[500px]">
                        {executionResult.data && executionResult.data.length > 0 ? (
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider z-10">
                                    <tr>
                                        {executionResult.columns.map((col: string) => (
                                            <th key={col} className="py-3 px-4 whitespace-nowrap">{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                                    {executionResult.data.map((row: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                                            {executionResult.columns.map((col: string) => (
                                                <td key={col} className="py-3 px-4 whitespace-nowrap">
                                                    {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-600">NULL</span>}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-slate-500 text-xs">
                                La ejecución finalizó exitosamente pero no devolvió filas de datos.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
