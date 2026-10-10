'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
    Plane,
    Plus,
    Search,
    Edit2,
    Trash2,
    CheckCircle2,
    AlertCircle,
    X,
    Save,
    Sparkles,
    Sliders,
    ArrowLeft,
    RefreshCw,
    ToggleLeft,
    ToggleRight,
    HelpCircle
} from 'lucide-react';
import { parseJsonResponse } from '@/lib/safe-json';

interface FareBasisRule {
    id: number;
    airlineCode: string;
    airlineName: string;
    startPos: number;
    length: number;
    separator: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export default function FareBasisRulesPage() {
    const [rules, setRules] = useState<FareBasisRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Form fields
    const [formId, setFormId] = useState<number | null>(null);
    const [formCode, setFormCode] = useState('');
    const [formName, setFormName] = useState('');
    const [formStartPos, setFormStartPos] = useState<number>(3);
    const [formLength, setFormLength] = useState<number>(2);
    const [formSeparator, setFormSeparator] = useState('/');
    const [formIsActive, setFormIsActive] = useState(true);

    // Live Simulator inside modal
    const [testInput, setTestInput] = useState('JA2AA/JA2AA');

    // Cargar reglas
    const fetchRules = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/farebasis-rules');
            const data = await parseJsonResponse<any>(res, { rules: [] });
            if (data && Array.isArray(data.rules)) {
                setRules(data.rules);
            }
        } catch (err) {
            console.error('Error al cargar reglas:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRules();
    }, []);

    // Cálculo dinámico para simulación
    const simulatedOutput = useMemo(() => {
        if (!testInput) return '';
        const sep = formSeparator || '/';
        const start = Math.max(1, formStartPos || 1);
        const len = Math.max(1, formLength || 1);

        const segments = testInput.split(sep);
        const transformed = segments.map(seg => {
            if (!seg) return '';
            const idx = start - 1;
            if (idx >= seg.length) return '';
            return seg.substring(idx, idx + len);
        });
        return transformed.join(sep);
    }, [testInput, formStartPos, formLength, formSeparator]);

    // Filtrar reglas
    const filteredRules = useMemo(() => {
        return rules.filter(r => {
            const matchesSearch =
                r.airlineCode.toLowerCase().includes(search.toLowerCase()) ||
                r.airlineName.toLowerCase().includes(search.toLowerCase());

            if (statusFilter === 'active') return matchesSearch && r.isActive;
            if (statusFilter === 'inactive') return matchesSearch && !r.isActive;
            return matchesSearch;
        });
    }, [rules, search, statusFilter]);

    // Abrir modal de creación
    const handleOpenCreate = () => {
        setModalMode('create');
        setFormId(null);
        setFormCode('');
        setFormName('');
        setFormStartPos(3);
        setFormLength(2);
        setFormSeparator('/');
        setFormIsActive(true);
        setTestInput('JA2AA/JA2AA');
        setErrorMsg('');
        setShowModal(true);
    };

    // Abrir modal de edición
    const handleOpenEdit = (rule: FareBasisRule) => {
        setModalMode('edit');
        setFormId(rule.id);
        setFormCode(rule.airlineCode);
        setFormName(rule.airlineName);
        setFormStartPos(rule.startPos);
        setFormLength(rule.length);
        setFormSeparator(rule.separator || '/');
        setFormIsActive(rule.isActive);
        setTestInput(rule.airlineCode === '001' ? 'JA2AA/JA2AA' : 'TEST1234/TEST1234');
        setErrorMsg('');
        setShowModal(true);
    };

    // Guardar regla
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formCode.trim()) {
            setErrorMsg('El código de la aerolínea es requerido.');
            return;
        }
        if (!formName.trim()) {
            setErrorMsg('El nombre de la aerolínea es requerido.');
            return;
        }
        if (formStartPos < 1) {
            setErrorMsg('La posición inicial debe ser mayor o igual a 1.');
            return;
        }
        if (formLength < 1) {
            setErrorMsg('La cantidad de caracteres debe ser mayor o igual a 1.');
            return;
        }

        setSaving(true);
        setErrorMsg('');

        try {
            const res = await fetch('/api/farebasis-rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: formId,
                    airlineCode: formCode.trim(),
                    airlineName: formName.trim(),
                    startPos: formStartPos,
                    length: formLength,
                    separator: formSeparator.trim() || '/',
                    isActive: formIsActive
                })
            });

            const data = await parseJsonResponse<any>(res, { success: false });
            if (data && data.success) {
                setShowModal(false);
                setSuccessMsg(`Regla para "${formName}" guardada correctamente.`);
                setTimeout(() => setSuccessMsg(''), 4000);
                await fetchRules();
            } else {
                setErrorMsg(data?.message || 'Error al guardar la regla.');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Error al procesar la solicitud.');
        } finally {
            setSaving(false);
        }
    };

    // Alternar estado activo / inactivo
    const handleToggleActive = async (rule: FareBasisRule) => {
        try {
            const res = await fetch('/api/farebasis-rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: rule.id,
                    airlineCode: rule.airlineCode,
                    airlineName: rule.airlineName,
                    startPos: rule.startPos,
                    length: rule.length,
                    separator: rule.separator,
                    isActive: !rule.isActive
                })
            });
            const data = await parseJsonResponse<any>(res, { success: false });
            if (data && data.success) {
                setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
            }
        } catch (err) {
            console.error('Error al alternar estado:', err);
        }
    };

    // Eliminar regla
    const handleDelete = async (rule: FareBasisRule) => {
        if (!confirm(`¿Está seguro de eliminar la regla para "${rule.airlineName}" (${rule.airlineCode})?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/farebasis-rules?id=${rule.id}`, { method: 'DELETE' });
            const data = await parseJsonResponse<any>(res, { success: false });
            if (data && data.success) {
                setRules(prev => prev.filter(r => r.id !== rule.id));
                setSuccessMsg(`Regla para "${rule.airlineName}" eliminada correctamente.`);
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (err) {
            console.error('Error al eliminar:', err);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link
                            href="/parameters"
                            className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Volver a Parámetros</span>
                        </Link>
                    </div>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                        <Plane className="w-6 h-6 text-cyan-400" />
                        <span>Maestro de Fare Basis por Aerolínea</span>
                    </h1>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Configura las reglas de extracción segmentada para calcular dinámicamente la columna <strong className="text-cyan-400">FarebasisReal</strong> en los informes analíticos.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={fetchRules}
                        className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all"
                        title="Refrescar lista"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
                    </button>
                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nueva Regla de Extracción</span>
                    </button>
                </div>
            </div>

            {/* Mensajes de notificación */}
            {successMsg && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2.5 text-xs font-bold animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                </div>
            )}

            {/* Explicación de Arquitectura */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
                <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="font-semibold text-white">¿Cómo opera la regla de extracción?</p>
                    <p className="text-slate-400">
                        Cada segmento de la ruta tarifaria separado por el delimitador (por defecto <code className="text-cyan-400 bg-slate-800 px-1 py-0.5 rounded">/</code>) se extrae individualmente con la posición inicial y cantidad de caracteres parametrizados. Si una aerolínea no tiene regla activa, se utiliza su <code className="text-slate-300">Fare Basis</code> original intacto.
                    </p>
                </div>
            </div>

            {/* Barra de Búsqueda y Filtros */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por código (ej: 001) o nombre de aerolínea..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${statusFilter === 'all' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                    >
                        Todas ({rules.length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('active')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${statusFilter === 'active' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                    >
                        Activas ({rules.filter(r => r.isActive).length})
                    </button>
                    <button
                        onClick={() => setStatusFilter('inactive')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${statusFilter === 'inactive' ? 'bg-rose-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                    >
                        Inactivas ({rules.filter(r => !r.isActive).length})
                    </button>
                </div>
            </div>

            {/* Tabla de Reglas */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            <tr>
                                <th className="py-3 px-4">Código</th>
                                <th className="py-3 px-4">Aerolínea</th>
                                <th className="py-3 px-4 text-center">Posición Inicial</th>
                                <th className="py-3 px-4 text-center">Longitud</th>
                                <th className="py-3 px-4 text-center">Separador</th>
                                <th className="py-3 px-4">Ejemplo Dinámico</th>
                                <th className="py-3 px-4 text-center">Estado</th>
                                <th className="py-3 px-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-slate-500">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
                                        <span>Cargando reglas de Fare Basis...</span>
                                    </td>
                                </tr>
                            ) : filteredRules.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                                        No se encontraron reglas configuradas con el filtro actual.
                                    </td>
                                </tr>
                            ) : (
                                filteredRules.map(rule => {
                                    // Cálculo de muestra en la tabla
                                    const sampleRaw = rule.airlineCode === '001' ? 'JA2AA/JA2AA' : 'ABC1234/XYZ5678';
                                    const sampleSep = rule.separator || '/';
                                    const sampleTransformed = sampleRaw.split(sampleSep).map(s => {
                                        const idx = Math.max(0, rule.startPos - 1);
                                        return s.substring(idx, idx + rule.length);
                                    }).join(sampleSep);

                                    return (
                                        <tr key={rule.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="py-3.5 px-4 font-bold text-cyan-400">
                                                {rule.airlineCode}
                                            </td>
                                            <td className="py-3.5 px-4 font-sans font-semibold text-white">
                                                {rule.airlineName}
                                            </td>
                                            <td className="py-3.5 px-4 text-center font-bold text-slate-200">
                                                {rule.startPos}
                                            </td>
                                            <td className="py-3.5 px-4 text-center font-bold text-slate-200">
                                                {rule.length}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
                                                    {rule.separator || '/'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-1.5 text-[11px]">
                                                    <span className="text-slate-500">{sampleRaw}</span>
                                                    <span className="text-slate-600">→</span>
                                                    <span className="text-cyan-400 font-bold bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/50">
                                                        {sampleTransformed}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <button
                                                    onClick={() => handleToggleActive(rule)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all"
                                                    style={{
                                                        backgroundColor: rule.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        color: rule.isActive ? '#10b981' : '#ef4444',
                                                        border: `1px solid ${rule.isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                                    }}
                                                    title="Clic para cambiar estado"
                                                >
                                                    {rule.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                                                    <span>{rule.isActive ? 'Activo' : 'Inactivo'}</span>
                                                </button>
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => handleOpenEdit(rule)}
                                                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded-lg transition-colors"
                                                        title="Editar regla"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(rule)}
                                                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
                                                        title="Eliminar regla"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Creación / Edición */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
                        {/* Header Modal */}
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                                    <Plane className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-sm text-white">
                                        {modalMode === 'create' ? 'Nueva Regla de Fare Basis' : 'Editar Regla de Fare Basis'}
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Define el algoritmo de extracción para cada segmento tarifario.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <form onSubmit={handleSave} className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">
                                        Código Aerolínea <span className="text-cyan-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formCode}
                                        onChange={e => setFormCode(e.target.value.toUpperCase())}
                                        placeholder="Ej: 001 o AA"
                                        required
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:border-cyan-500 focus:outline-none uppercase font-mono"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Prefijo numérico (001) o sigla IATA (AA)</p>
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">
                                        Nombre Aerolínea <span className="text-cyan-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formName}
                                        onChange={e => setFormName(e.target.value)}
                                        placeholder="Ej: American Airlines"
                                        required
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:border-cyan-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Posición Inicial</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={formStartPos}
                                        onChange={e => setFormStartPos(parseInt(e.target.value) || 1)}
                                        required
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:border-cyan-500 focus:outline-none font-mono text-center"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Cantidad Caracteres</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={formLength}
                                        onChange={e => setFormLength(parseInt(e.target.value) || 1)}
                                        required
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:border-cyan-500 focus:outline-none font-mono text-center"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-bold mb-1">Separador</label>
                                    <input
                                        type="text"
                                        maxLength={5}
                                        value={formSeparator}
                                        onChange={e => setFormSeparator(e.target.value || '/')}
                                        required
                                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:border-cyan-500 focus:outline-none font-mono text-center"
                                    />
                                </div>
                            </div>

                            {/* Simulador Interactivo en Vivo */}
                            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 uppercase">
                                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                                        Simulador en Vivo
                                    </span>
                                    <span className="text-[10px] text-cyan-400 font-mono">Pos: {formStartPos} | Long: {formLength}</span>
                                </div>

                                <div>
                                    <label className="block text-[10px] text-slate-500 mb-1">Fare Basis original de prueba:</label>
                                    <input
                                        type="text"
                                        value={testInput}
                                        onChange={e => setTestInput(e.target.value.toUpperCase())}
                                        placeholder="Ej: JA2AA/JA2AA"
                                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:border-cyan-500 focus:outline-none uppercase"
                                    />
                                </div>

                                <div className="p-2.5 bg-slate-900/80 border border-cyan-900/40 rounded-xl flex items-center justify-between">
                                    <span className="text-[11px] text-slate-400">Resultado FarebasisReal:</span>
                                    <span className="text-xs font-bold font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                                        {simulatedOutput || '(vacío)'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="formIsActive"
                                    checked={formIsActive}
                                    onChange={e => setFormIsActive(e.target.checked)}
                                    className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 focus:outline-none"
                                />
                                <label htmlFor="formIsActive" className="text-slate-300 font-semibold cursor-pointer">
                                    Regla activa para cálculo de reportes
                                </label>
                            </div>

                            {/* Acciones */}
                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>{saving ? 'Guardando...' : 'Guardar Regla'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
