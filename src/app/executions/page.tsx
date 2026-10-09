'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Play,
    Database,
    Plus,
    RefreshCw,
    Download,
    Search,
    ChevronDown,
    ChevronUp,
    Filter,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle2,
    Clock,
    X,
    Edit2,
    Trash2,
    Copy,
    ArrowUp,
    ArrowDown,
    Eye,
    EyeOff,
    SlidersHorizontal,
    Calculator,
    Table as TableIcon,
    Bookmark,
    Save,
    Sparkles,
    Check,
    Layers,
    Server,
    Zap,
    MoveLeft,
    MoveRight,
    LayoutDashboard
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { formatNumber } from '@/lib/utils';
import { DashboardView } from '@/components/dashboard-builder/DashboardView';

interface ProcedureParam {
    name: string;
    label: string;
    type: 'text' | 'date' | 'select' | 'number';
    lookupType?: string;
    section?: string;
    placeholder?: string;
    defaultValue?: string;
    options?: { label: string; value: string }[];
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
    isActive: boolean;
}

interface ExecutionPreset {
    id: number;
    procedureId: number;
    name: string;
    description?: string;
    filterValues?: Record<string, string>;
    filterConfig?: { order?: string[]; hidden?: string[] };
    columnConfigs?: ColumnConfig[];
    selectedTotals?: string[];
    dashboardsConfig?: any[];
}

interface LookupItem {
    code: string;
    name: string;
}

interface ColumnConfig {
    originalKey: string;
    customLabel: string;
    visible: boolean;
}

export default function ExecutionsPage() {
    // Servidores y bases de datos
    const [profiles, setProfiles] = useState<SQLProfile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
    const [selectedDatabase, setSelectedDatabase] = useState<string>('');

    // Procedimientos
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [selectedProc, setSelectedProc] = useState<Procedure | null>(null);
    const [loadingProcs, setLoadingProcs] = useState(true);
    const [filterValues, setFilterValues] = useState<Record<string, string>>({});

    // Presets / Plantillas
    const [presets, setPresets] = useState<ExecutionPreset[]>([]);
    const [selectedPresetId, setSelectedPresetId] = useState<string>('');
    const [showSavePresetModal, setShowSavePresetModal] = useState(false);
    const [presetEditId, setPresetEditId] = useState<number | null>(null);
    const [presetNameInput, setPresetNameInput] = useState('');
    const [presetDescInput, setPresetDescInput] = useState('');
    const [savingPreset, setSavingPreset] = useState(false);

    // Ajustes de Filtros (Orden y Visibilidad)
    const [orderedParams, setOrderedParams] = useState<ProcedureParam[]>([]);
    const [hiddenParamNames, setHiddenParamNames] = useState<Set<string>>(new Set());
    const [showFilterConfig, setShowFilterConfig] = useState(false);

    // Modal de Creación / Edición de SP
    const [showProcModal, setShowProcModal] = useState(false);
    const [detectingParams, setDetectingParams] = useState(false);
    const [availableDbSps, setAvailableDbSps] = useState<string[]>([]);
    const [loadingDbSps, setLoadingDbSps] = useState(false);
    const [modalProc, setModalProc] = useState<{
        id?: number;
        name: string;
        spName: string;
        description: string;
        category: string;
        parametersJson: string;
    }>({
        name: '',
        spName: '',
        description: '',
        category: 'ANALYTICS',
        parametersJson: '[]'
    });

    // Lookup Modal (Lupa 🔍)
    const [showLookupModal, setShowLookupModal] = useState(false);
    const [lookupTargetParam, setLookupTargetParam] = useState<ProcedureParam | null>(null);
    const [lookupData, setLookupData] = useState<LookupItem[]>([]);
    const [loadingLookup, setLoadingLookup] = useState(false);
    const [lookupSearch, setLookupSearch] = useState('');
    const [selectedLookupCodes, setSelectedLookupCodes] = useState<Set<string>>(new Set());

    // Ejecución y Resultados
    const [executing, setExecuting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [executionResult, setExecutionResult] = useState<{
        traceId: string;
        recordCount: number;
        elapsedTimeMs: number;
        columns: string[];
        data: any[];
    } | null>(null);

    // Tabla de Resultados, Columnas y Totales
    const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);
    const [showColConfigModal, setShowColConfigModal] = useState(false);
    const [resultTab, setResultTab] = useState<'data' | 'totals' | 'dashboard'>('data');
    const [selectedTotals, setSelectedTotals] = useState<Set<string>>(new Set());
    const [resultsSearchTerm, setResultsSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [exportDelimiter, setExportDelimiter] = useState<',' | ';' | '\t'>(',');

    // Carga inicial de perfiles y procedimientos
    useEffect(() => {
        loadProfiles();
        loadProcedures();
    }, []);

    const loadProfiles = async () => {
        try {
            const res = await fetch('/api/sqlserver/profiles');
            const data: SQLProfile[] = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                setProfiles(data);
                const active = data.find(p => p.isActive) || data[0];
                setSelectedProfileId(active.id);
                setSelectedDatabase(active.defaultDatabase);
            }
        } catch (err) {
            console.error('Error al cargar perfiles:', err);
        }
    };

    const loadProcedures = async () => {
        setLoadingProcs(true);
        try {
            const res = await fetch('/api/executions/procedures');
            const data: Procedure[] = await res.json();
            if (Array.isArray(data)) {
                setProcedures(data);
                if (data.length > 0) {
                    selectProcedure(data[0]);
                }
            }
        } catch (err) {
            console.error('Error al cargar procedimientos:', err);
        } finally {
            setLoadingProcs(false);
        }
    };

    const loadPresetsForProcedure = async (procedureId: number) => {
        try {
            const res = await fetch(`/api/executions/presets?procedureId=${procedureId}`);
            if (res.ok) {
                const data: ExecutionPreset[] = await res.json();
                setPresets(data);
            }
        } catch (e) {
            console.error('Error al cargar plantillas:', e);
        }
    };

    const activeProfile = useMemo(() => {
        return profiles.find(p => p.id === selectedProfileId) || null;
    }, [profiles, selectedProfileId]);

    // Selección de procedimiento y resolución de valores por defecto
    const selectProcedure = (proc: Procedure) => {
        setSelectedProc(proc);
        setErrorMsg(null);
        setSuccessMsg(null);
        setExecutionResult(null);
        setColumnConfigs([]);
        setSelectedTotals(new Set());
        setResultTab('data');
        setSelectedPresetId('');

        const params = proc.parameters || [];

        // Recuperar orden/visibilidad de localStorage si existe
        let initialOrdered = [...params];
        let initialHidden = new Set<string>();

        if (typeof window !== 'undefined') {
            const savedKey = `kax_filter_config_${proc.id}`;
            const saved = localStorage.getItem(savedKey);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed.order)) {
                        const map = new Map(params.map(p => [p.name, p]));
                        const reordered: ProcedureParam[] = [];
                        parsed.order.forEach((name: string) => {
                            if (map.has(name)) {
                                reordered.push(map.get(name)!);
                                map.delete(name);
                            }
                        });
                        map.forEach(p => reordered.push(p));
                        initialOrdered = reordered;
                    }
                    if (Array.isArray(parsed.hidden)) {
                        initialHidden = new Set(parsed.hidden);
                    }
                } catch (e) {}
            }
        }

        setOrderedParams(initialOrdered);
        setHiddenParamNames(initialHidden);

        // Inicializar fechas dinámicas
        const initialVals: Record<string, string> = {};
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const firstDayStr = `${year}-${month}-01`;
        const todayStr = `${year}-${month}-${day}`;

        params.forEach(p => {
            let def = p.defaultValue || '';
            if (def === 'FIRST_DAY_OF_MONTH') def = firstDayStr;
            if (def === 'TODAY') def = todayStr;
            initialVals[p.name] = def;
        });

        setFilterValues(initialVals);
        loadPresetsForProcedure(proc.id);
    };

    // Aplicar Plantilla / Preset Guardado
    const applyPreset = (preset: ExecutionPreset) => {
        if (preset.filterValues) {
            setFilterValues({ ...preset.filterValues });
        }
        if (preset.filterConfig) {
            if (preset.filterConfig.hidden) {
                setHiddenParamNames(new Set(preset.filterConfig.hidden));
            }
            if (preset.filterConfig.order && selectedProc) {
                const map = new Map(selectedProc.parameters.map(p => [p.name, p]));
                const reordered: ProcedureParam[] = [];
                preset.filterConfig.order.forEach((name: string) => {
                    if (map.has(name)) {
                        reordered.push(map.get(name)!);
                        map.delete(name);
                    }
                });
                map.forEach(p => reordered.push(p));
                setOrderedParams(reordered);
            }
        }
        if (preset.columnConfigs) {
            setColumnConfigs(preset.columnConfigs);
        }
        if (preset.selectedTotals) {
            setSelectedTotals(new Set(preset.selectedTotals));
        }
        setToastMsg(`Plantilla "${preset.name}" aplicada.`);
        setTimeout(() => setToastMsg(null), 3000);
    };

    // Guardar cambios directamente sobre la plantilla seleccionada actualmente
    const handleQuickUpdatePreset = async () => {
        if (!selectedProc || !selectedPresetId) return;
        const currentPreset = presets.find(p => p.id === Number(selectedPresetId));
        if (!currentPreset) return;

        setSavingPreset(true);
        try {
            const res = await fetch('/api/executions/presets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: currentPreset.id,
                    procedureId: selectedProc.id,
                    name: currentPreset.name,
                    description: currentPreset.description || '',
                    filterValues,
                    filterConfig: {
                        order: orderedParams.map(p => p.name),
                        hidden: Array.from(hiddenParamNames)
                    },
                    columnConfigs,
                    selectedTotals: Array.from(selectedTotals),
                    dashboardsConfig: currentPreset.dashboardsConfig
                })
            });

            if (res.ok) {
                setToastMsg(`✓ Plantilla "${currentPreset.name}" actualizada con los cambios actuales.`);
                setTimeout(() => setToastMsg(null), 3000);
                await loadPresetsForProcedure(selectedProc.id);
            } else {
                const err = await res.json();
                alert(err.message || 'Error al actualizar plantilla.');
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSavingPreset(false);
        }
    };

    // Abrir modal para Guardar Como (nueva plantilla o con nombre específico)
    const openSaveAsModal = () => {
        if (!selectedProc) return;
        const currentPreset = presets.find(p => p.id === Number(selectedPresetId));
        setPresetEditId(null); // siempre nuevo al guardar como
        setPresetNameInput(currentPreset ? `${currentPreset.name} (Copia)` : `${selectedProc.name} - ${new Date().toISOString().split('T')[0]}`);
        setPresetDescInput(currentPreset?.description || '');
        setShowSavePresetModal(true);
    };

    // Guardar Preset desde el Modal (puede ser nuevo o edición de nombre)
    const handleSavePreset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProc || !presetNameInput.trim()) return;

        const currentPreset = presets.find(p => p.id === Number(selectedPresetId));
        setSavingPreset(true);
        try {
            const payload: any = {
                procedureId: selectedProc.id,
                name: presetNameInput.trim(),
                description: presetDescInput.trim(),
                filterValues,
                filterConfig: {
                    order: orderedParams.map(p => p.name),
                    hidden: Array.from(hiddenParamNames)
                },
                columnConfigs,
                selectedTotals: Array.from(selectedTotals),
                dashboardsConfig: currentPreset?.dashboardsConfig || null
            };

            if (presetEditId) {
                payload.id = presetEditId;
            }

            const res = await fetch('/api/executions/presets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const saved = await res.json();
                setShowSavePresetModal(false);
                setToastMsg(`Plantilla "${presetNameInput}" guardada exitosamente.`);
                setTimeout(() => setToastMsg(null), 3000);
                await loadPresetsForProcedure(selectedProc.id);
                if (saved && saved.id) {
                    setSelectedPresetId(String(saved.id));
                }
            } else {
                const err = await res.json();
                alert(err.message || 'Error al guardar plantilla.');
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSavingPreset(false);
        }
    };

    // Eliminar Preset
    const handleDeletePreset = async (id: number) => {
        if (!confirm('¿Desea eliminar esta plantilla guardada?')) return;
        try {
            const res = await fetch(`/api/executions/presets?id=${id}`, { method: 'DELETE' });
            if (res.ok && selectedProc) {
                setSelectedPresetId('');
                await loadPresetsForProcedure(selectedProc.id);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Reordenar y Ocultar Filtros
    const toggleFilterVisibility = (paramName: string) => {
        setHiddenParamNames(prev => {
            const next = new Set(prev);
            if (next.has(paramName)) next.delete(paramName);
            else next.add(paramName);
            return next;
        });
    };

    const moveFilterUp = (idx: number) => {
        if (idx <= 0) return;
        const next = [...orderedParams];
        const temp = next[idx - 1];
        next[idx - 1] = next[idx];
        next[idx] = temp;
        setOrderedParams(next);
    };

    const moveFilterDown = (idx: number) => {
        if (idx >= orderedParams.length - 1) return;
        const next = [...orderedParams];
        const temp = next[idx + 1];
        next[idx + 1] = next[idx];
        next[idx] = temp;
        setOrderedParams(next);
    };

    // Modal Crear / Editar SP
    const openNewProcModal = async () => {
        setModalProc({
            name: '',
            spName: '',
            description: '',
            category: 'ANALYTICS',
            parametersJson: '[]'
        });
        setShowProcModal(true);
        loadDbAvailableSps();
    };

    const openEditProcModal = (proc: Procedure) => {
        setModalProc({
            id: proc.id,
            name: proc.name,
            spName: proc.spName,
            description: proc.description || '',
            category: proc.category || 'ANALYTICS',
            parametersJson: JSON.stringify(proc.parameters, null, 2)
        });
        setShowProcModal(true);
        loadDbAvailableSps();
    };

    const loadDbAvailableSps = async () => {
        setLoadingDbSps(true);
        try {
            const res = await fetch(`/api/executions/available-sps?profileId=${selectedProfileId || ''}&database=${selectedDatabase || ''}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.procedures)) {
                setAvailableDbSps(data.procedures);
            }
        } catch (err) {
            console.error('Error al listar SPs:', err);
        } finally {
            setLoadingDbSps(false);
        }
    };

    // Detección automática de parámetros con sys.parameters
    const handleDetectParams = async () => {
        if (!modalProc.spName.trim()) {
            alert('Por favor ingrese o seleccione el nombre del Stored Procedure.');
            return;
        }

        setDetectingParams(true);
        try {
            const res = await fetch(`/api/executions/detect-params?spName=${encodeURIComponent(modalProc.spName.trim())}&profileId=${selectedProfileId || ''}&database=${encodeURIComponent(selectedDatabase || '')}`);
            const data = await res.json();

            if (data.success && Array.isArray(data.parameters)) {
                setModalProc(prev => ({
                    ...prev,
                    name: prev.name || data.spName.replace(/^(sp_|spze_|spza_|sp)/i, '').replace(/([A-Z])/g, ' $1').trim(),
                    parametersJson: JSON.stringify(data.parameters, null, 2)
                }));
                setToastMsg(`✓ ${data.parameters.length} parámetros detectados automáticamente desde SQL Server.`);
                setTimeout(() => setToastMsg(null), 3500);
            } else {
                alert(data.message || 'No se pudieron detectar parámetros para este procedimiento.');
            }
        } catch (err: any) {
            alert('Error al detectar parámetros: ' + err.message);
        } finally {
            setDetectingParams(false);
        }
    };

    // Guardar Stored Procedure en dbo.KAX_ExecutionProcedure
    const handleSaveProcedure = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let parsedParams = [];
            try {
                parsedParams = JSON.parse(modalProc.parametersJson);
            } catch {
                alert('El formato JSON de parámetros contiene errores de sintaxis.');
                return;
            }

            const res = await fetch('/api/executions/procedures', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: modalProc.id,
                    name: modalProc.name.trim(),
                    spName: modalProc.spName.trim(),
                    description: modalProc.description.trim(),
                    category: modalProc.category,
                    parameters: parsedParams
                })
            });

            if (res.ok) {
                setShowProcModal(false);
                setToastMsg(`Procedimiento "${modalProc.name}" guardado exitosamente.`);
                setTimeout(() => setToastMsg(null), 3000);
                await loadProcedures();
            } else {
                const err = await res.json();
                alert(err.message || 'Error al guardar el procedimiento.');
            }
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Eliminar Stored Procedure
    const handleDeleteProcedure = async (id: number, name: string) => {
        if (!confirm(`¿Está seguro de eliminar el procedimiento "${name}" del catálogo?`)) return;
        try {
            const res = await fetch(`/api/executions/procedures?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setToastMsg(`Procedimiento "${name}" eliminado.`);
                setTimeout(() => setToastMsg(null), 3000);
                await loadProcedures();
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Lookup Modal (Lupa 🔍)
    const openLookupModal = async (param: ProcedureParam) => {
        setLookupTargetParam(param);
        setLookupSearch('');
        setShowLookupModal(true);
        setSelectedLookupCodes(new Set());
        fetchLookupData(param.lookupType || '', '');
    };

    const fetchLookupData = async (type: string, search: string) => {
        setLoadingLookup(true);
        try {
            const res = await fetch(`/api/executions/lookup?type=${type}&search=${encodeURIComponent(search)}&profileId=${selectedProfileId || ''}&database=${encodeURIComponent(selectedDatabase || '')}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setLookupData(data);
            }
        } catch (err) {
            console.error('Error al consultar lookup:', err);
        } finally {
            setLoadingLookup(false);
        }
    };

    const toggleLookupCode = (code: string) => {
        setSelectedLookupCodes(prev => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code);
            else next.add(code);
            return next;
        });
    };

    const selectAllLookupCodes = () => {
        setSelectedLookupCodes(new Set(lookupData.map(item => item.code)));
    };

    const deselectAllLookupCodes = () => {
        setSelectedLookupCodes(new Set());
    };

    const applyLookupSelection = () => {
        if (!lookupTargetParam) return;
        const joined = Array.from(selectedLookupCodes).join(',');
        setFilterValues(prev => ({ ...prev, [lookupTargetParam.name]: joined }));
        setShowLookupModal(false);
    };

    // Ejecutar Stored Procedure
    const handleExecute = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProc || !activeProfile) return;

        setExecuting(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        setExecutionResult(null);

        try {
            const res = await fetch('/api/executions/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    profile: activeProfile,
                    targetDatabase: selectedDatabase,
                    spName: selectedProc.spName,
                    parameters: filterValues
                })
            });

            const json = await res.json();

            if (!res.ok || !json.success) {
                let errText = json.message || json.errorDetails || 'Error al ejecutar el procedimiento en SQL Server.';
                if (errText.includes('Could not find stored procedure') || errText.includes('No se encontró el procedimiento almacenado')) {
                    errText += `\n\n💡 Verifique la "Base de Datos Autorizada" en la Sección 1. El procedimiento "${selectedProc.spName}" pertenece a la base de datos "Zeusagencias_23", mientras que actualmente está seleccionada "${selectedDatabase}". Cambie la base de datos arriba y vuelva a ejecutar.`;
                }
                throw new Error(errText);
            }

            setExecutionResult({
                traceId: json.traceId,
                recordCount: json.recordCount,
                elapsedTimeMs: json.elapsedTimeMs,
                columns: json.columns || [],
                data: json.data || []
            });

            // Configurar columnas iniciales si aún no estaban definidas
            const rawCols: string[] = json.columns || [];
            if (columnConfigs.length === 0) {
                setColumnConfigs(rawCols.map(col => ({
                    originalKey: col,
                    customLabel: col,
                    visible: true
                })));
            }

            // Seleccionar automáticamente columnas numéricas para totales
            if (selectedTotals.size === 0) {
                const keywords = ['tarifa', 'iva', 'total', 'descuento', 'ventas', 'combustible', 'comision', 'saldo', 'valor', 'records'];
                const autoTotals = new Set<string>();
                rawCols.forEach(col => {
                    if (keywords.some(kw => col.toLowerCase().includes(kw))) {
                        autoTotals.add(col);
                    }
                });
                setSelectedTotals(autoTotals);
            }

            setSuccessMsg(`Se obtuvieron ${formatNumber(json.recordCount)} registros en ${json.elapsedTimeMs} ms.`);
            setCurrentPage(1);
        } catch (err: any) {
            setErrorMsg(err.message || 'Error de conexión con el servidor SQL.');
        } finally {
            setExecuting(false);
        }
    };

    // Columnas activas y filtradas
    const activeColumns = useMemo(() => {
        return columnConfigs.filter(c => c.visible);
    }, [columnConfigs]);

    // Filtrado y búsqueda dentro de los resultados
    const filteredResults = useMemo(() => {
        if (!executionResult || !executionResult.data) return [];
        if (!resultsSearchTerm.trim()) return executionResult.data;

        const term = resultsSearchTerm.toLowerCase();
        return executionResult.data.filter(row => {
            return Object.values(row).some(val => String(val ?? '').toLowerCase().includes(term));
        });
    }, [executionResult, resultsSearchTerm]);

    // Paginación
    const paginatedResults = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredResults.slice(start, start + pageSize);
    }, [filteredResults, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredResults.length / pageSize) || 1;

    // Totales calculados (Suma, Promedio, Mín, Máx, Conteo)
    const totalsSummary = useMemo(() => {
        if (!filteredResults || filteredResults.length === 0) return [];

        return Array.from(selectedTotals).map(key => {
            const colConfig = columnConfigs.find(c => c.originalKey === key);
            const label = colConfig ? colConfig.customLabel : key;

            let sum = 0;
            let count = 0;
            let min = Infinity;
            let max = -Infinity;

            filteredResults.forEach(r => {
                const val = Number(r[key]);
                if (!isNaN(val)) {
                    sum += val;
                    count++;
                    if (val < min) min = val;
                    if (val > max) max = val;
                }
            });

            const avg = count > 0 ? sum / count : 0;

            return {
                key,
                label,
                sum,
                count,
                avg,
                min: min === Infinity ? 0 : min,
                max: max === -Infinity ? 0 : max
            };
        });
    }, [filteredResults, selectedTotals, columnConfigs]);

    // Función auxiliar para limpiar celdas y evitar saltos de línea y desbordamiento de columnas al pegar en Excel
    const cleanCellForExport = (val: any): string => {
        if (val === null || val === undefined) return '';
        return String(val)
            .replace(/[\r\n\t]+/g, ' ')
            .trim();
    };

    // Exportar Excel
    const handleExportExcel = () => {
        if (!executionResult || !executionResult.data || executionResult.data.length === 0) return;

        const exportData = filteredResults.map(row => {
            const obj: Record<string, any> = {};
            activeColumns.forEach(c => {
                const val = row[c.originalKey];
                obj[c.customLabel] = typeof val === 'string' ? cleanCellForExport(val) : val;
            });
            return obj;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados');
        XLSX.writeFile(workbook, `${selectedProc?.spName || 'Reporte'}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Copiar al portapapeles con formato Excel
    const handleCopyToClipboard = () => {
        if (!filteredResults || filteredResults.length === 0) return;

        const headers = activeColumns.map(c => cleanCellForExport(c.customLabel)).join('\t');
        const rows = filteredResults.map(r => activeColumns.map(c => cleanCellForExport(r[c.originalKey])).join('\t')).join('\n');
        const text = `${headers}\n${rows}`;

        navigator.clipboard.writeText(text).then(() => {
            setToastMsg('¡Copiado al portapapeles! Puedes pegarlo directamente en Excel (Ctrl + V).');
            setTimeout(() => setToastMsg(null), 4000);
        });
    };

    // Mover columna en configuración
    const moveColumn = (index: number, direction: 'left' | 'right') => {
        const next = [...columnConfigs];
        const target = direction === 'left' ? index - 1 : index + 1;
        if (target < 0 || target >= next.length) return;
        const temp = next[target];
        next[target] = next[index];
        next[index] = temp;
        setColumnConfigs(next);
    };

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
            {/* Toast flotante */}
            {toastMsg && (
                <div className="fixed top-6 right-6 z-50 bg-cyan-600 text-slate-950 font-extrabold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                    <CheckCircle2 className="w-5 h-5 text-slate-950 shrink-0" />
                    <span>{toastMsg}</span>
                    <button onClick={() => setToastMsg(null)} className="p-1 hover:bg-cyan-700/30 rounded-lg">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl">
                            <Play className="w-6 h-6 fill-current" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight">
                                Módulo de Ejecuciones Analíticas
                            </h1>
                            <p className="text-xs text-slate-400">
                                Parametrización dinámica, catálogo de Stored Procedures sobre Zeus ERP y SQL Server con trazabilidad total.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={openNewProcModal}
                        className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-xl font-extrabold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nuevo SP</span>
                    </button>
                    <button
                        onClick={loadProcedures}
                        className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-700"
                        title="Recargar procedimientos"
                    >
                        <RefreshCw className={`w-4 h-4 ${loadingProcs ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* 1. SELECCIÓN DE SERVIDOR Y BASE DE DATOS DESTINO */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <Server className="w-4 h-4 text-cyan-400" />
                    <span>1. Servidor y Base de Datos Destino</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1.5">Perfil de Conexión SQL Server</label>
                        <div className="relative">
                            <select
                                value={selectedProfileId || ''}
                                onChange={(e) => {
                                    const id = Number(e.target.value);
                                    setSelectedProfileId(id);
                                    const prof = profiles.find(p => p.id === id);
                                    if (prof) setSelectedDatabase(prof.defaultDatabase);
                                }}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-semibold focus:border-cyan-500 focus:outline-none appearance-none cursor-pointer"
                            >
                                {profiles.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.server})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1.5">Base de Datos Autorizada</label>
                        <div className="relative">
                            <select
                                value={selectedDatabase}
                                onChange={(e) => setSelectedDatabase(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-semibold focus:border-cyan-500 focus:outline-none appearance-none cursor-pointer"
                            >
                                {(activeProfile?.allowedDatabases || [activeProfile?.defaultDatabase || '']).map((db, idx) => (
                                    <option key={idx} value={db}>
                                        {db}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. SELECCIÓN DE PROCEDIMIENTO Y PLANTILLAS */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <Database className="w-4 h-4 text-cyan-400" />
                    <span>2. Selección de Procedimiento Almacenado y Plantillas</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-end">
                    {/* Selector de Procedimiento */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-slate-300">Procedimiento Almacenado (SQL Server)</label>
                            {selectedProc && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => openEditProcModal(selectedProc)}
                                        className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold cursor-pointer"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        <span>Editar Definición</span>
                                    </button>
                                    <span className="text-slate-700">|</span>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteProcedure(selectedProc.id, selectedProc.name)}
                                        className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 font-bold cursor-pointer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Quitar SP</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <select
                                value={selectedProc?.id || ''}
                                onChange={(e) => {
                                    const p = procedures.find(item => item.id === Number(e.target.value));
                                    if (p) selectProcedure(p);
                                }}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-3 text-xs text-white font-bold focus:border-cyan-500 focus:outline-none appearance-none cursor-pointer"
                            >
                                {procedures.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.spName})
                                    </option>
                                ))}
                            </select>
                            <Database className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3.5 pointer-events-none" />
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                        </div>
                    </div>

                    {/* Selector de Plantillas / Presets */}
                    {selectedProc && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Bookmark className="w-3.5 h-3.5" />
                                    <span>Plantillas / Presets Guardados ({presets.length})</span>
                                </label>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <select
                                        value={selectedPresetId}
                                        onChange={(e) => {
                                            const id = e.target.value;
                                            setSelectedPresetId(id);
                                            const found = presets.find(p => p.id === Number(id));
                                            if (found) applyPreset(found);
                                        }}
                                        className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl pl-10 pr-10 py-3 text-xs text-cyan-200 font-bold focus:border-cyan-400 focus:outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">-- Cargar Plantilla Guardada... --</option>
                                        {presets.map(preset => (
                                            <option key={preset.id} value={preset.id}>
                                                ⭐ {preset.name}
                                            </option>
                                        ))}
                                    </select>
                                    <Bookmark className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3.5 pointer-events-none" />
                                    <ChevronDown className="w-4 h-4 text-cyan-400 absolute right-3.5 top-3.5 pointer-events-none" />
                                </div>

                                {/* Botones Guardar y Guardar Como */}
                                {selectedPresetId ? (
                                    <>
                                        <button
                                            type="button"
                                            disabled={savingPreset}
                                            onClick={handleQuickUpdatePreset}
                                            className="px-3.5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 transition-all"
                                            title="Guardar cambios directamente sobre esta plantilla seleccionada"
                                        >
                                            <Save className="w-4 h-4" />
                                            <span>{savingPreset ? 'Guardando...' : 'Guardar'}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={openSaveAsModal}
                                            className="px-3.5 py-3 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 transition-all"
                                            title="Guardar con otro nombre o crear nueva plantilla"
                                        >
                                            <Bookmark className="w-4 h-4" />
                                            <span>Guardar Como</span>
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={openSaveAsModal}
                                        className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 transition-all"
                                        title="Guardar filtros actuales como nueva plantilla"
                                    >
                                        <Save className="w-4 h-4" />
                                        <span>Guardar Preset</span>
                                    </button>
                                )}

                                {selectedPresetId && (
                                    <button
                                        type="button"
                                        onClick={() => handleDeletePreset(Number(selectedPresetId))}
                                        className="p-3 bg-slate-800 hover:bg-red-500 hover:text-white text-red-400 rounded-xl transition-all cursor-pointer border border-slate-700 shrink-0"
                                        title="Eliminar plantilla guardada"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {selectedProc?.description && (
                    <p className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                        <strong className="text-slate-300">Descripción:</strong> {selectedProc.description}
                    </p>
                )}
            </div>

            {/* Mensajes de Alerta */}
            {errorMsg && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
                    <div className="space-y-1 text-xs">
                        <span className="font-bold">Error de Ejecución:</span>
                        <p className="font-mono whitespace-pre-wrap">{errorMsg}</p>
                    </div>
                </div>
            )}

            {successMsg && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 font-bold">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span>{successMsg}</span>
                    </div>
                    {executionResult && (
                        <span className="font-mono text-[11px] px-2.5 py-1 bg-emerald-500/20 rounded-full font-bold">
                            Trace: {executionResult.traceId}
                        </span>
                    )}
                </div>
            )}

            {/* 3. CONTENEDOR DE FILTROS DINÁMICOS */}
            {selectedProc && (
                <form onSubmit={handleExecute} className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden space-y-0">
                    <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-cyan-400" />
                            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                                Filtros de la Consulta (Pantalla Única)
                            </h2>
                            <span className="text-[11px] text-slate-500 font-mono">
                                ({orderedParams.length - hiddenParamNames.size} de {orderedParams.length} visibles)
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowFilterConfig(!showFilterConfig)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    showFilterConfig
                                        ? 'bg-cyan-600 text-slate-950'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span>{showFilterConfig ? 'Cerrar Ajustes' : 'Organizar y Visibilidad'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Panel de Ajustes de Filtros (Orden y Visibilidad) */}
                    {showFilterConfig && (
                        <div className="p-4 bg-slate-950/80 border-b border-slate-800 space-y-3">
                            <h3 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                                Reordenar Ubicación y Visibilidad de Filtros
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-1">
                                {orderedParams.map((p, idx) => {
                                    const isHidden = hiddenParamNames.has(p.name);
                                    return (
                                        <div
                                            key={p.name}
                                            className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-all ${
                                                isHidden
                                                    ? 'bg-slate-900/40 border-slate-800 opacity-60'
                                                    : 'bg-slate-900 border-slate-700 shadow-sm'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 truncate pr-2">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleFilterVisibility(p.name)}
                                                    className="text-slate-400 hover:text-white transition-colors"
                                                    title={isHidden ? 'Mostrar filtro' : 'Ocultar filtro'}
                                                >
                                                    {isHidden ? <EyeOff className="w-4 h-4 text-red-400" /> : <Eye className="w-4 h-4 text-emerald-400" />}
                                                </button>
                                                <span className={`font-medium truncate ${isHidden ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                                    {p.label}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    disabled={idx === 0}
                                                    onClick={() => moveFilterUp(idx)}
                                                    className="p-1 hover:bg-slate-800 rounded text-slate-400 disabled:opacity-30 cursor-pointer"
                                                    title="Subir posición"
                                                >
                                                    <ArrowUp className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={idx === orderedParams.length - 1}
                                                    onClick={() => moveFilterDown(idx)}
                                                    className="p-1 hover:bg-slate-800 rounded text-slate-400 disabled:opacity-30 cursor-pointer"
                                                    title="Bajar posición"
                                                >
                                                    <ArrowDown className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Grid de Inputs de Filtros */}
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {orderedParams.map((p) => {
                                if (hiddenParamNames.has(p.name)) return null;

                                return (
                                    <div key={p.name} className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                                            <span>{p.label} {p.required && <span className="text-red-400">*</span>}</span>
                                            <span className="text-[10px] text-slate-500 font-mono">@{p.name}</span>
                                        </label>

                                        {p.type === 'select' ? (
                                            <select
                                                value={filterValues[p.name] ?? ''}
                                                onChange={(e) => setFilterValues(prev => ({ ...prev, [p.name]: e.target.value }))}
                                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:border-cyan-500 focus:outline-none cursor-pointer"
                                            >
                                                {p.options?.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : p.type === 'date' ? (
                                            <input
                                                type="date"
                                                value={filterValues[p.name] ?? ''}
                                                onChange={(e) => setFilterValues(prev => ({ ...prev, [p.name]: e.target.value }))}
                                                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:border-cyan-500 focus:outline-none font-mono"
                                            />
                                        ) : (
                                            <div className="relative flex items-center">
                                                <input
                                                    type={p.type === 'number' ? 'number' : 'text'}
                                                    value={filterValues[p.name] ?? ''}
                                                    onChange={(e) => setFilterValues(prev => ({ ...prev, [p.name]: e.target.value }))}
                                                    placeholder={p.placeholder || 'Ingrese valor...'}
                                                    className={`w-full py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:border-cyan-500 focus:outline-none ${
                                                        p.lookupType ? 'pl-3 pr-9 font-mono' : 'px-3'
                                                    }`}
                                                />
                                                {p.lookupType && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openLookupModal(p)}
                                                        className="absolute right-1.5 p-1.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 rounded-lg transition-all cursor-pointer"
                                                        title={`Buscar en ${p.lookupType} (Lupa)`}
                                                    >
                                                        <Search className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Barra de Acciones */}
                    <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                if (selectedProc) selectProcedure(selectedProc);
                            }}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700"
                        >
                            Restablecer Valores
                        </button>

                        <button
                            type="submit"
                            disabled={executing}
                            className="flex items-center gap-2 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                        >
                            {executing ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
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
                </form>
            )}

            {/* 4. RESULTADOS DE LA EJECUCIÓN */}
            {executionResult && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-0">
                    {/* Header de Resultados */}
                    <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-black text-white">{selectedProc?.spName}</h3>
                                    <span className="font-mono text-[10px] text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                                        {executionResult.traceId}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Base: <span className="text-slate-200 font-semibold">{selectedDatabase}</span> • Filas: <span className="text-slate-200 font-semibold" suppressHydrationWarning>{formatNumber(executionResult.recordCount)}</span> • Duración: <span className="text-slate-200 font-semibold">{executionResult.elapsedTimeMs} ms</span>
                                </p>
                            </div>
                        </div>

                        {/* Pestañas Datos / Totales y Botones de Exportación */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                                <button
                                    onClick={() => setResultTab('data')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        resultTab === 'data'
                                            ? 'bg-cyan-600 text-slate-950'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <TableIcon className="w-3.5 h-3.5 inline mr-1" />
                                    <span>Datos ({formatNumber(filteredResults.length)})</span>
                                </button>
                                <button
                                    onClick={() => setResultTab('totals')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        resultTab === 'totals'
                                            ? 'bg-cyan-600 text-slate-950'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <Calculator className="w-3.5 h-3.5 inline mr-1" />
                                    <span>Totales ({selectedTotals.size})</span>
                                </button>
                                <button
                                    onClick={() => setResultTab('dashboard')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                        resultTab === 'dashboard'
                                            ? 'bg-cyan-600 text-slate-950 shadow-sm shadow-cyan-600/30'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <LayoutDashboard className="w-3.5 h-3.5 inline mr-1" />
                                    <span>Tablero Analítico</span>
                                </button>
                            </div>

                            <button
                                onClick={() => setShowColConfigModal(true)}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="Configurar visibilidad y orden de columnas"
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Columnas</span>
                            </button>

                            <button
                                onClick={handleCopyToClipboard}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                                title="Copiar al portapapeles formateado para Excel"
                            >
                                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Copiar</span>
                            </button>

                            <button
                                onClick={handleExportExcel}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Excel</span>
                            </button>
                        </div>
                    </div>

                    {/* Pestaña: Datos */}
                    {resultTab === 'data' && (
                        <div>
                            {/* Barra de búsqueda y tamaño de página */}
                            <div className="p-3 border-b border-slate-800 bg-slate-950/30 flex items-center justify-between gap-3 flex-wrap text-xs">
                                <div className="relative w-64">
                                    <input
                                        type="text"
                                        value={resultsSearchTerm}
                                        onChange={(e) => {
                                            setResultsSearchTerm(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        placeholder="Buscar en resultados..."
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
                                    />
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-400">Filas por página:</span>
                                        <select
                                            value={pageSize}
                                            onChange={(e) => {
                                                setPageSize(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 focus:outline-none"
                                        >
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                            <option value={500}>500</option>
                                        </select>
                                    </div>
                                    <span className="text-slate-500 font-mono">
                                        Página {currentPage} de {totalPages}
                                    </span>
                                </div>
                            </div>

                            {/* Tabla con scroll horizontal */}
                            <div className="overflow-x-auto max-h-[550px]">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800">
                                        <tr>
                                            <th className="py-3 px-4 w-12 text-center text-slate-500">#</th>
                                            {activeColumns.map(col => (
                                                <th key={col.originalKey} className="py-3 px-4 font-bold whitespace-nowrap">
                                                    {col.customLabel}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                                        {paginatedResults.length > 0 ? (
                                            paginatedResults.map((row, rIdx) => (
                                                <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                                                    <td className="py-2.5 px-4 text-center font-mono text-[10px] text-slate-500">
                                                        {(currentPage - 1) * pageSize + rIdx + 1}
                                                    </td>
                                                    {activeColumns.map(col => {
                                                        const val = row[col.originalKey];
                                                        const isNum = typeof val === 'number';
                                                        return (
                                                            <td
                                                                key={col.originalKey}
                                                                className={`py-2.5 px-4 whitespace-nowrap ${isNum ? 'text-right font-mono text-cyan-300' : ''}`}
                                                                suppressHydrationWarning
                                                            >
                                                                {val !== null && val !== undefined ? (isNum ? formatNumber(val) : String(val)) : <span className="text-slate-600">-</span>}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={activeColumns.length + 1} className="py-8 text-center text-slate-500">
                                                    No se encontraron registros que coincidan con la búsqueda.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paginación */}
                            <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs">
                                <span className="text-slate-400">
                                    Mostrando {paginatedResults.length} de {formatNumber(filteredResults.length)} filas
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        disabled={currentPage <= 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold disabled:opacity-30 cursor-pointer"
                                    >
                                        Anterior
                                    </button>
                                    <span className="px-2 font-mono text-slate-300">{currentPage} / {totalPages}</span>
                                    <button
                                        disabled={currentPage >= totalPages}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold disabled:opacity-30 cursor-pointer"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pestaña: Totales Calculados */}
                    {resultTab === 'totals' && (
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                    <Calculator className="w-4 h-4 text-cyan-400" />
                                    <span>Resumen Estadístico y Sumatorias</span>
                                </h3>
                                <span className="text-xs text-slate-500 font-mono">
                                    Basado en {formatNumber(filteredResults.length)} filas
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {totalsSummary.map(item => (
                                    <div key={item.key} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-white text-xs truncate">{item.label}</span>
                                            <span className="text-[10px] text-cyan-400 font-mono font-bold bg-cyan-500/10 px-2 py-0.5 rounded">
                                                {item.count} valores
                                            </span>
                                        </div>
                                        <div className="space-y-1 pt-1 text-xs font-mono">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Suma Total:</span>
                                                <span className="font-bold text-emerald-400">{formatNumber(item.sum)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Promedio:</span>
                                                <span className="text-slate-300">{formatNumber(item.avg.toFixed(2))}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Mínimo / Máximo:</span>
                                                <span className="text-slate-300">{formatNumber(item.min)} / {formatNumber(item.max)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pestaña: Tablero Analítico / Dashboard Builder */}
                    {resultTab === 'dashboard' && (
                        <div className="p-5">
                            <DashboardView
                                data={executionResult.data}
                                columns={executionResult.columns}
                                procedureId={selectedProc?.id || 1}
                                procedureName={selectedProc?.name || 'Consulta'}
                                presetId={selectedPresetId ? Number(selectedPresetId) : null}
                                presetName={presets.find(p => p.id === Number(selectedPresetId))?.name}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* MODAL: GUARDAR PRESET / PLANTILLA */}
            {showSavePresetModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                        <div className="flex items-center gap-2 text-cyan-400">
                            <Bookmark className="w-5 h-5" />
                            <h3 className="text-base font-extrabold text-white">
                                {presetEditId ? 'Editar Plantilla' : 'Guardar Como Nueva Plantilla'}
                            </h3>
                        </div>
                        <p className="text-xs text-slate-400">
                            Guarda los valores actuales de los filtros, orden de campos y configuraciones de columnas con el nombre que especifiques.
                        </p>

                        <form onSubmit={handleSavePreset} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block text-slate-300 font-bold mb-1">Nombre de la Plantilla</label>
                                <input
                                    type="text"
                                    required
                                    value={presetNameInput}
                                    onChange={(e) => setPresetNameInput(e.target.value)}
                                    placeholder="Ej: Reporte Mensual Sucursal Norte"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-300 font-bold mb-1">Descripción (Opcional)</label>
                                <input
                                    type="text"
                                    value={presetDescInput}
                                    onChange={(e) => setPresetDescInput(e.target.value)}
                                    placeholder="Ej: Utilizado para cierre contable de mes"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowSavePresetModal(false)}
                                    className="px-4 h-9 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingPreset}
                                    className="px-5 h-9 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black rounded-xl shadow-md shadow-cyan-500/20"
                                >
                                    {savingPreset ? 'Guardando...' : 'Guardar Plantilla'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: LOOKUP (LUPA 🔍 PARA CLIENTES, VENDEDORES, SUCURSALES, ETC.) */}
            {showLookupModal && lookupTargetParam && (
                <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
                                    <Search className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold text-white">
                                        Buscar {lookupTargetParam.label} ({lookupTargetParam.lookupType})
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Selecciona uno o múltiples registros de la base {selectedDatabase}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowLookupModal(false)}
                                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Search Bar & Actions */}
                        <div className="p-4 border-b border-slate-800 bg-slate-950/30 space-y-3">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={lookupSearch}
                                    onChange={(e) => {
                                        setLookupSearch(e.target.value);
                                        fetchLookupData(lookupTargetParam.lookupType || '', e.target.value);
                                    }}
                                    placeholder="Buscar por código o nombre..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                                />
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                            </div>

                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-mono">
                                    {selectedLookupCodes.size} seleccionados de {lookupData.length} encontrados
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={selectAllLookupCodes}
                                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-lg text-[11px]"
                                    >
                                        Seleccionar Todos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={deselectAllLookupCodes}
                                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold rounded-lg text-[11px]"
                                    >
                                        Limpiar
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Listado con Checkboxes */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-1 divide-y divide-slate-800/40">
                            {loadingLookup ? (
                                <div className="p-8 text-center text-slate-400 space-y-2">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
                                    <p className="text-xs">Consultando base de datos...</p>
                                </div>
                            ) : lookupData.length === 0 ? (
                                <p className="p-8 text-center text-slate-500 text-xs">
                                    No se encontraron registros.
                                </p>
                            ) : (
                                lookupData.map((item) => {
                                    const isSelected = selectedLookupCodes.has(item.code);
                                    return (
                                        <div
                                            key={item.code}
                                            onClick={() => toggleLookupCode(item.code)}
                                            className={`flex items-center gap-3 p-2.5 rounded-xl text-xs cursor-pointer transition-colors ${
                                                isSelected ? 'bg-cyan-500/10 text-white' : 'hover:bg-slate-800/50 text-slate-300'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {}}
                                                className="rounded border-slate-700 text-cyan-600 focus:ring-0 pointer-events-none"
                                            />
                                            <span className="font-mono font-bold text-cyan-400 w-28 shrink-0 truncate">
                                                {item.code}
                                            </span>
                                            <span className="truncate font-medium">{item.name}</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/60">
                            <button
                                type="button"
                                onClick={() => setShowLookupModal(false)}
                                className="px-4 h-9 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={applyLookupSelection}
                                className="px-5 h-9 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-cyan-500/20"
                            >
                                Aplicar Selección ({selectedLookupCodes.size})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: CONFIGURACIÓN DE COLUMNAS */}
            {showColConfigModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                                <span>Configuración y Visibilidad de Columnas</span>
                            </h3>
                            <button onClick={() => setShowColConfigModal(false)} className="p-1 text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {columnConfigs.map((col, idx) => (
                                <div key={col.originalKey} className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = [...columnConfigs];
                                            next[idx].visible = !next[idx].visible;
                                            setColumnConfigs(next);
                                        }}
                                        className="text-slate-400 hover:text-white p-1"
                                    >
                                        {col.visible ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-red-400" />}
                                    </button>
                                    <input
                                        type="text"
                                        value={col.customLabel}
                                        onChange={(e) => {
                                            const next = [...columnConfigs];
                                            next[idx].customLabel = e.target.value;
                                            setColumnConfigs(next);
                                        }}
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-100 font-semibold focus:outline-none"
                                    />
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            disabled={idx === 0}
                                            onClick={() => moveColumn(idx, 'left')}
                                            className="p-1 hover:bg-slate-800 rounded text-slate-400 disabled:opacity-30"
                                            title="Mover arriba"
                                        >
                                            <ArrowUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            disabled={idx === columnConfigs.length - 1}
                                            onClick={() => moveColumn(idx, 'right')}
                                            className="p-1 hover:bg-slate-800 rounded text-slate-400 disabled:opacity-30"
                                            title="Mover abajo"
                                        >
                                            <ArrowDown className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-950/60">
                            <button
                                type="button"
                                onClick={() => setShowColConfigModal(false)}
                                className="px-5 h-9 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-cyan-500/20"
                            >
                                Aceptar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: NUEVO / EDITAR STORED PROCEDURE (CON DETECCIÓN AUTOMÁTICA SYS.PARAMETERS) */}
            {showProcModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl my-8 overflow-hidden">
                        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
                                    <Database className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-white">
                                        {modalProc.id ? 'Editar Stored Procedure' : 'Nuevo Stored Procedure'}
                                    </h3>
                                    <p className="text-[11px] text-slate-400">
                                        Configuración del procedimiento y detección automática de parámetros desde SQL Server
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowProcModal(false)} className="p-1.5 text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveProcedure} className="p-6 space-y-4 text-xs">
                            <div>
                                <label className="block text-slate-300 font-bold mb-1">Nombre Descriptivo</label>
                                <input
                                    type="text"
                                    required
                                    value={modalProc.name}
                                    onChange={(e) => setModalProc({ ...modalProc, name: e.target.value })}
                                    placeholder="Ej: Reporte de Tiquetes No Utilizados"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 focus:border-cyan-500 focus:outline-none"
                                />
                            </div>

                            {/* Nombre del SP en SQL Server y selector de SPs disponibles */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-slate-300 font-bold">Nombre del SP en SQL Server</label>
                                    <span className="text-[10px] text-slate-500">Base actual: {selectedDatabase}</span>
                                </div>

                                <div className="flex gap-2">
                                    {availableDbSps.length > 0 ? (
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                required
                                                list="availableSpsList"
                                                value={modalProc.spName}
                                                onChange={(e) => setModalProc({ ...modalProc, spName: e.target.value })}
                                                placeholder="Ej: spze_RptTiquetes_No_Utilizados o elegir de la lista..."
                                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                                            />
                                            <datalist id="availableSpsList">
                                                {availableDbSps.map(sp => (
                                                    <option key={sp} value={sp} />
                                                ))}
                                            </datalist>
                                        </div>
                                    ) : (
                                        <input
                                            type="text"
                                            required
                                            value={modalProc.spName}
                                            onChange={(e) => setModalProc({ ...modalProc, spName: e.target.value })}
                                            placeholder="Ej: spze_RptTiquetes_No_Utilizados"
                                            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                                        />
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleDetectParams}
                                        disabled={detectingParams}
                                        className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20 active:scale-95 disabled:opacity-50 shrink-0"
                                        title="Detecta automáticamente los parámetros desde sys.parameters en SQL Server"
                                    >
                                        {detectingParams ? (
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Zap className="w-3.5 h-3.5" />
                                        )}
                                        <span>Detectar Parámetros</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-300 font-bold mb-1">Descripción del Procedimiento</label>
                                <textarea
                                    rows={2}
                                    value={modalProc.description}
                                    onChange={(e) => setModalProc({ ...modalProc, description: e.target.value })}
                                    placeholder="Detalle de la consulta analítica y uso sugerido..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
                                />
                            </div>

                            {/* Definición JSON de Parámetros */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-slate-300 font-bold">Definición de Parámetros (JSON)</label>
                                    <span className="text-[10px] text-slate-500">Auto-generado al presionar Detectar</span>
                                </div>
                                <textarea
                                    rows={8}
                                    value={modalProc.parametersJson}
                                    onChange={(e) => setModalProc({ ...modalProc, parametersJson: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-mono text-[11px] text-cyan-300 focus:border-cyan-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowProcModal(false)}
                                    className="px-4 h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 h-10 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black rounded-xl shadow-md shadow-cyan-500/20 active:scale-95"
                                >
                                    Guardar Procedimiento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
