'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { WidgetConfig, DashboardConfig } from './types';
import { WidgetCard } from './WidgetCard';
import { WidgetModal } from './WidgetModal';
import {
    Plus,
    Save,
    Download,
    Filter,
    Grid,
    RotateCcw,
    Trash2,
    Check,
    X,
    ChevronDown,
    Layers,
    Share2,
    FileSpreadsheet,
    FileText,
    Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { processWidgetData } from './data-engine';
import { parseJsonResponse } from '@/lib/safe-json';

interface DashboardViewProps {
    data: Record<string, any>[];
    columns: string[];
    procedureId: number;
    procedureName: string;
    presetId?: number | null;
    presetName?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
    data,
    columns,
    procedureId,
    procedureName,
    presetId,
    presetName
}) => {
    // Lista de tableros guardados en DB
    const [savedDashboards, setSavedDashboards] = useState<DashboardConfig[]>([]);
    const [currentDashboard, setCurrentDashboard] = useState<DashboardConfig | null>(null);
    const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
    const [dashboardName, setDashboardName] = useState<string>('Mi Tablero Principal');
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<string | null>(null);

    // Modal de Guardar Como
    const [isSaveAsOpen, setIsSaveAsOpen] = useState(false);
    const [saveAsName, setSaveAsName] = useState('');
    const [saveAsDesc, setSaveAsDesc] = useState('');

    // Modal de edición / creación de widget
    const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
    const [editingWidget, setEditingWidget] = useState<WidgetConfig | null>(null);

    // Filtros globales interactivos en memoria
    const [filterCategoryCol, setFilterCategoryCol] = useState<string>('');
    const [selectedCategoryValues, setSelectedCategoryValues] = useState<string[]>([]);
    const [filterSearch, setFilterSearch] = useState<string>('');

    // Referencia al contenedor para exportación
    const dashboardRef = useRef<HTMLDivElement>(null);

    // Cargar tableros existentes al montar o cambiar el SP o la Plantilla activa
    useEffect(() => {
        loadDashboards();
    }, [procedureId, presetId]);

    const loadDashboards = async () => {
        try {
            const url = presetId
                ? `/api/executions/dashboards?procedureId=${procedureId}&presetId=${presetId}`
                : `/api/executions/dashboards?procedureId=${procedureId}`;
            const res = await fetch(url);
            if (res.ok) {
                const list = await parseJsonResponse(res, []);
                if (Array.isArray(list)) {
                    setSavedDashboards(list);

                    if (list.length > 0) {
                        // Cargar el tablero por defecto o el primero
                        const def = list.find((d: any) => d.isDefault) || list[0];
                        applyDashboard(def);
                    } else {
                        // Inicializar con widgets inteligentes por defecto según las columnas
                        createDefaultWidgets();
                    }
                } else {
                    createDefaultWidgets();
                }
            }
        } catch (e) {
            console.error('Error cargando tableros:', e);
            createDefaultWidgets();
        }
    };

    // Crear widgets iniciales si no hay tablero guardado
    const createDefaultWidgets = () => {
        const numericCols = columns.filter(c => {
            const val = data[0]?.[c];
            return typeof val === 'number' || (!isNaN(Number(val)) && val !== null && val !== '');
        });

        // Detectar columnas clave solicitadas por negocio
        const colTarifa = numericCols.find(c => /tarifa/i.test(c)) || numericCols[0];
        const colTotal = numericCols.find(c => /total/i.test(c) && !/usd/i.test(c)) || numericCols.find(c => /total/i.test(c)) || numericCols[1] || numericCols[0];
        
        // Detectar columna de proveedor
        const colProveedor = columns.find(c => /proveedor/i.test(c) && !/cod/i.test(c) && !/cd_/i.test(c)) 
            || columns.find(c => /proveedor/i.test(c))
            || columns.find(c => !numericCols.includes(c));

        const initWidgets: WidgetConfig[] = [
            {
                id: 'kpi_total_count',
                title: 'Sumatoria Total',
                type: 'kpi',
                aggregation: 'COUNT',
                width: 'quarter',
                colorPalette: 'cyan'
            }
        ];

        // 1. Sumatoria Tarifa
        if (colTarifa) {
            initWidgets.push({
                id: 'kpi_sum_tarifa',
                title: `Sumatoria ${colTarifa}`,
                type: 'kpi',
                metricColumn: colTarifa,
                aggregation: 'SUM',
                width: 'quarter',
                colorPalette: 'cyan'
            });
        }

        // 2. Sumatoria Total
        if (colTotal && colTotal !== colTarifa) {
            initWidgets.push({
                id: 'kpi_sum_total',
                title: `Sumatoria ${colTotal}`,
                type: 'kpi',
                metricColumn: colTotal,
                aggregation: 'SUM',
                width: 'quarter',
                colorPalette: 'emerald'
            });
        }

        // 3. Participación de Proveedores (Organizado de Mayor a Menor por Valor y % de Participación)
        if (colProveedor && (colTotal || colTarifa)) {
            const metricForProviders = colTotal || colTarifa;

            // Gráfico de Barras: Top Proveedores por Valor (Mayor a Menor)
            initWidgets.push({
                id: 'bar_proveedores_valor',
                title: `Participación de Proveedores (${metricForProviders})`,
                type: 'bar',
                dimensionColumn: colProveedor,
                metricColumn: metricForProviders,
                aggregation: 'SUM',
                width: 'half',
                colorPalette: 'vivid',
                topN: 10,
                sortBy: 'metric',
                sortOrder: 'desc'
            });

            // Gráfico Dona / Pastel de Participación Porcentual
            initWidgets.push({
                id: 'pie_proveedores_pct',
                title: `Distribución % de Proveedores (${metricForProviders})`,
                type: 'doughnut',
                dimensionColumn: colProveedor,
                metricColumn: metricForProviders,
                aggregation: 'SUM',
                width: 'half',
                colorPalette: 'vivid',
                topN: 8,
                sortBy: 'metric',
                sortOrder: 'desc'
            });

            // Tabla Dinámica Detallada de Proveedores con % de Participación
            initWidgets.push({
                id: 'table_proveedores_ranking',
                title: `Ranking de Proveedores: Valor y % de Participación (${colProveedor})`,
                type: 'pivot_table',
                dimensionColumn: colProveedor,
                metricColumn: metricForProviders,
                aggregation: 'SUM',
                width: 'full',
                colorPalette: 'emerald',
                topN: 20,
                sortBy: 'metric',
                sortOrder: 'desc',
                showPercentage: true
            });
        }

        setWidgets(initWidgets);
        setCurrentDashboard(null);
        setDashboardName('Tablero Analítico Automático');
    };

    const applyDashboard = (dash: any) => {
        setCurrentDashboard(dash);
        setDashboardName(dash.name);
        const wList = Array.isArray(dash.widgetsConfig)
            ? dash.widgetsConfig
            : typeof dash.widgetsConfig === 'string'
            ? JSON.parse(dash.widgetsConfig)
            : [];
        setWidgets(wList);

        if (dash.layoutConfig) {
            try {
                const lCfg = typeof dash.layoutConfig === 'string' ? JSON.parse(dash.layoutConfig) : dash.layoutConfig;
                setFilterCategoryCol(lCfg.filterCategoryCol || lCfg.categoryColumn || '');
                setSelectedCategoryValues(Array.isArray(lCfg.selectedCategoryValues) ? lCfg.selectedCategoryValues : (Array.isArray(lCfg.selectedCategories) ? lCfg.selectedCategories : []));
                setFilterSearch(typeof lCfg.filterSearch === 'string' ? lCfg.filterSearch : '');
            } catch {}
        } else {
            setFilterCategoryCol('');
            setSelectedCategoryValues([]);
            setFilterSearch('');
        }
    };

    // Filtro global aplicado a la data en memoria
    const filteredData = useMemo(() => {
        let result = data;

        // Filtro de búsqueda general
        if (filterSearch.trim()) {
            const q = filterSearch.toLowerCase().trim();
            result = result.filter(row =>
                Object.values(row).some(v => v !== null && v !== undefined && String(v).toLowerCase().includes(q))
            );
        }

        // Filtro de categoría específica
        if (filterCategoryCol && selectedCategoryValues.length > 0) {
            result = result.filter(row => {
                const val = String(row[filterCategoryCol] ?? '');
                return selectedCategoryValues.includes(val);
            });
        }

        return result;
    }, [data, filterSearch, filterCategoryCol, selectedCategoryValues]);

    // Opciones únicas para el filtro de categoría seleccionado
    const categoryOptions = useMemo(() => {
        if (!filterCategoryCol) return [];
        const set = new Set<string>();
        data.forEach(r => {
            const val = r[filterCategoryCol];
            if (val !== null && val !== undefined && String(val).trim() !== '') {
                set.add(String(val));
            }
        });
        return Array.from(set).slice(0, 100);
    }, [data, filterCategoryCol]);

    // Guardar (actualizar existente o crear si es nuevo)
    const handleSaveDirect = async () => {
        if (!currentDashboard) {
            setIsSaveAsOpen(true);
            setSaveAsName(dashboardName);
            return;
        }

        setIsSaving(true);
        setSaveStatus('Guardando...');
        try {
            const res = await fetch('/api/executions/dashboards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: currentDashboard.id,
                    procedureId,
                    presetId: presetId || null,
                    name: dashboardName,
                    description: currentDashboard.description || '',
                    layoutConfig: {
                        filterCategoryCol,
                        selectedCategoryValues,
                        filterSearch
                    },
                    widgetsConfig: widgets,
                    isDefault: currentDashboard.isDefault
                })
            });

            if (res.ok) {
                const updated = await parseJsonResponse<any>(res);
                if (updated) {
                    setCurrentDashboard(updated);
                    setSaveStatus('¡Guardado!');
                    loadDashboards();
                    setTimeout(() => setSaveStatus(null), 3000);
                }
            } else {
                setSaveStatus('Error al guardar');
            }
        } catch (e) {
            setSaveStatus('Error al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    // Guardar como nuevo tablero (se aplica a todas las plantillas del procedimiento)
    const handleSaveAs = async () => {
        if (!saveAsName.trim()) return;

        setIsSaving(true);
        try {
            const res = await fetch('/api/executions/dashboards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    procedureId,
                    presetId: presetId || null,
                    name: saveAsName.trim(),
                    description: saveAsDesc.trim(),
                    layoutConfig: {
                        filterCategoryCol,
                        selectedCategoryValues,
                        filterSearch
                    },
                    widgetsConfig: widgets,
                    isDefault: false
                })
            });

            if (res.ok) {
                const created = await parseJsonResponse<any>(res);
                if (created) {
                    setCurrentDashboard(created);
                    setDashboardName(created.name);
                    setIsSaveAsOpen(false);
                    setSaveStatus('¡Tablero creado!');
                    loadDashboards();
                    setTimeout(() => setSaveStatus(null), 3000);
                }
            }
        } catch (e) {
            console.error('Error al guardar nuevo tablero:', e);
        } finally {
            setIsSaving(false);
        }
    };

    // Eliminar tablero (si hay plantilla activa, se elimina ÚNICAMENTE de esa plantilla y queda en las demás)
    const handleDeleteDashboard = async () => {
        if (!currentDashboard?.id) return;
        const confirmMsg = presetName
            ? `¿Desea eliminar el tablero "${currentDashboard.name}" únicamente de la plantilla "${presetName}"?\n(El tablero permanecerá disponible en las demás plantillas)`
            : `¿Desea eliminar el tablero "${currentDashboard.name}"?`;
        
        if (!confirm(confirmMsg)) return;

        try {
            const url = presetId
                ? `/api/executions/dashboards?id=${currentDashboard.id}&procedureId=${procedureId}&presetId=${presetId}`
                : `/api/executions/dashboards?id=${currentDashboard.id}&procedureId=${procedureId}`;
            
            const res = await fetch(url, {
                method: 'DELETE'
            });
            if (res.ok) {
                setCurrentDashboard(null);
                loadDashboards();
            }
        } catch (e) {
            console.error('Error eliminando tablero:', e);
        }
    };

    // Manejo de widgets (agregar/editar/eliminar)
    const handleSaveWidget = (w: WidgetConfig) => {
        setWidgets(prev => {
            const exists = prev.findIndex(item => item.id === w.id);
            if (exists >= 0) {
                const next = [...prev];
                next[exists] = w;
                return next;
            }
            return [...prev, w];
        });
    };

    const handleDeleteWidget = (widgetId: string) => {
        setWidgets(prev => prev.filter(w => w.id !== widgetId));
    };

    // Exportar todo el Tablero a Excel (Métricas, Gráficos y Tablas dinámicas)
    const handleExportDashboardExcel = () => {
        if (!widgets || widgets.length === 0) {
            alert('No hay widgets para exportar.');
            return;
        }

        const wb = XLSX.utils.book_new();

        // 1. Hoja de Resumen Ejecutivo de KPIs
        const kpis = widgets.filter(w => w.type === 'kpi');
        const summaryRows: any[] = [];
        summaryRows.push({ 'TABLERO ANALÍTICO': dashboardName.toUpperCase(), 'FECHA DE EXPORTACIÓN': new Date().toLocaleString('es-CO') });
        summaryRows.push({}); // Fila en blanco
        summaryRows.push({ 'INDICADOR / KPI': 'REGISTROS ANALIZADOS', 'VALOR': filteredData.length, 'NOTAS': '100% de la base consultada' });

        kpis.forEach(k => {
            const proc = processWidgetData(filteredData, k);
            summaryRows.push({
                'INDICADOR / KPI': k.title.toUpperCase(),
                'VALOR': proc.kpiValue || 0,
                'NOTAS': `${k.aggregation} de ${k.metricColumn || 'registros'}`
            });
        });

        const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen_KPIs');

        // 2. Hojas individuales para cada Tabla Dinámica o Gráfico
        widgets.forEach((w, idx) => {
            if (w.type === 'kpi') return;

            const proc = processWidgetData(filteredData, w);
            let sheetData: any[] = [];

            if (w.type === 'pivot_table' && proc.rows && proc.rows.length > 0) {
                const rowsToExport = proc.allRows || proc.rows;
                rowsToExport.forEach(r => {
                    const isParent = !!r.isParentGroup;
                    const hasChildren = isParent && Array.isArray(r.children) && r.children.length > 0;

                    if (isParent) {
                        sheetData.push({
                            [w.dimensionColumn || 'Dimensión']: `[USUARIO] ${r[w.dimensionColumn!]}`,
                            [`${w.aggregation} (${w.metricColumn || 'Valor'})`]: r[w.metricColumn || 'conteo'],
                            'Participación (%)': `${r.porcentaje ?? 0}%`,
                            'Sumatoria': r.sumatoria ?? r.sumatoriaTiquetes ?? r.registros ?? 0,
                            'Participación Sumatoria (%)': `${r.porcentajeSumatoria ?? r.porcentajeTiquetes ?? 0}%`
                        });

                        if (hasChildren) {
                            r.children.forEach((ch: any) => {
                                sheetData.push({
                                    [w.dimensionColumn || 'Dimensión']: `    └── ${ch[w.dimensionColumn!]}`,
                                    [`${w.aggregation} (${w.metricColumn || 'Valor'})`]: ch[w.metricColumn || 'conteo'],
                                    'Participación (%)': `${ch.porcentaje ?? 0}%`,
                                    'Sumatoria': ch.sumatoria ?? ch.sumatoriaTiquetes ?? ch.registros ?? 0,
                                    'Participación Sumatoria (%)': `${ch.porcentajeSumatoria ?? ch.porcentajeTiquetes ?? 0}%`
                                });
                            });
                        }
                    } else {
                        sheetData.push({
                            [w.dimensionColumn || 'Dimensión']: r[w.dimensionColumn!],
                            [`${w.aggregation} (${w.metricColumn || 'Valor'})`]: r[w.metricColumn || 'conteo'],
                            'Participación (%)': `${r.porcentaje ?? 0}%`,
                            'Sumatoria': r.sumatoria ?? r.sumatoriaTiquetes ?? r.registros ?? 0,
                            'Participación Sumatoria (%)': `${r.porcentajeSumatoria ?? r.porcentajeTiquetes ?? 0}%`
                        });
                    }
                });

                // Fila de Total
                sheetData.push({
                    [w.dimensionColumn || 'Dimensión']: `TOTAL (${proc.totalCount} grupos)`,
                    [`${w.aggregation} (${w.metricColumn || 'Valor'})`]: proc.totalGlobalMetricSum ?? proc.totalMetricSum ?? 0,
                    'Participación (%)': '100.00%',
                    'Sumatoria': proc.totalGlobalSumatoria ?? proc.totalGlobalTiquetesSum ?? proc.totalSumatoria ?? proc.totalTiquetesSum ?? 0,
                    'Participación Sumatoria (%)': '100.00%'
                });
            } else if (proc.labels && proc.labels.length > 0) {
                sheetData = proc.labels.map((lbl, i) => ({
                    [w.dimensionColumn || 'Categoría']: lbl,
                    [`${w.aggregation} (${w.metricColumn || 'Valor'})`]: proc.values[i] || 0
                }));
            }

            if (sheetData.length > 0) {
                const ws = XLSX.utils.json_to_sheet(sheetData);
                // Nombre de hoja seguro (máx 31 caracteres)
                const safeTitle = (w.title.replace(/[\/\\?*:[\]]/g, '').trim() || `Widget_${idx + 1}`).substring(0, 30);
                XLSX.utils.book_append_sheet(wb, ws, safeTitle);
            }
        });

        const dateStr = new Date().toISOString().split('T')[0];
        const safeDashName = dashboardName.replace(/[^a-zA-Z0-9_\-]/g, '_');
        XLSX.writeFile(wb, `Tablero_${safeDashName}_${dateStr}.xlsx`);
    };

    // Imprimir o Exportar a PDF usando vista optimizada para impresión de navegador
    const handleExportDashboardPDF = () => {
        window.print();
    };

    return (
        <div className="space-y-4">
            {/* Barra superior de Controles del Tablero */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-xl shadow-black/20">
                {/* Selector y Nombre del Tablero */}
                <div className="flex items-center space-x-3 flex-wrap">
                    <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-sm">
                        <Grid className="w-4 h-4" />
                    </span>
                    <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                            <select
                                value={currentDashboard?.id || ''}
                                onChange={e => {
                                    const id = Number(e.target.value);
                                    const found = savedDashboards.find(d => d.id === id);
                                    if (found) applyDashboard(found);
                                    else if (e.target.value === '') createDefaultWidgets();
                                }}
                                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-100 focus:outline-none focus:border-cyan-500 max-w-[220px] truncate"
                            >
                                <option value="">★ Tablero Sugerido (Dinámico)</option>
                                {savedDashboards.map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.name} {d.isDefault ? '(Por Defecto)' : ''}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="text"
                                value={dashboardName}
                                onChange={e => setDashboardName(e.target.value)}
                                placeholder="Nombre del Tablero..."
                                title="Editar nombre del tablero"
                                className="bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg px-2.5 py-1 text-xs font-semibold text-cyan-300 w-56 focus:outline-none"
                            />

                            {currentDashboard && (
                                <button
                                    onClick={handleDeleteDashboard}
                                    title={presetName ? `Eliminar tablero de la plantilla "${presetName}" (se mantendrá en las demás)` : "Eliminar este tablero guardado"}
                                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>{filteredData.length} registros analizados • {widgets.length} widgets configurados</span>
                            {presetName && (
                                <span className="bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">
                                    Plantilla: {presetName}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Acciones del Tablero: Agregar Widget, Guardar, Guardar Como */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => {
                            setEditingWidget(null);
                            setIsWidgetModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-cyan-300 text-xs font-medium flex items-center space-x-1.5 transition shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar Widget</span>
                    </button>

                    <button
                        onClick={handleSaveDirect}
                        disabled={isSaving}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
                        title={currentDashboard ? `Guardar cambios en "${dashboardName}"` : 'Guardar tablero en base de datos'}
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSaving ? 'Guardando...' : currentDashboard ? 'Guardar Tablero' : 'Guardar Como'}</span>
                    </button>

                    <button
                        onClick={() => {
                            setSaveAsName(`${dashboardName} (Copia)`);
                            setIsSaveAsOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-1.5 transition"
                        title="Guardar como un nuevo tablero con otro nombre"
                    >
                        <span>Guardar Como...</span>
                    </button>

                    <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

                    {/* Botones de Exportación de Tablero Permanente */}
                    <button
                        onClick={handleExportDashboardExcel}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-slate-950 font-black text-xs flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
                        title="Exportar métricas y tablas del tablero analítico a archivo Excel (.xlsx)"
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Excel</span>
                    </button>

                    <button
                        onClick={handleExportDashboardPDF}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-rose-300 font-bold text-xs flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
                        title="Imprimir o guardar este tablero analítico en PDF"
                    >
                        <FileText className="w-3.5 h-3.5 text-rose-400" />
                        <span>PDF</span>
                    </button>

                    {saveStatus && (
                        <span className="text-xs font-semibold text-emerald-400 animate-fade-in flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>{saveStatus}</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Barra de Filtros Globales en Memoria */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center space-x-1.5 text-slate-400 text-xs">
                    <Filter className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-semibold text-slate-300">Filtros en Memoria:</span>
                </div>

                {/* Búsqueda rápida global */}
                <div className="relative min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Buscar en el tablero..."
                        value={filterSearch}
                        onChange={e => setFilterSearch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
                    />
                    {filterSearch && (
                        <button
                            onClick={() => setFilterSearch('')}
                            className="absolute right-2 top-1.5 text-slate-500 hover:text-slate-300"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {/* Columna de Categoría */}
                <div className="flex items-center space-x-2">
                    <select
                        value={filterCategoryCol}
                        onChange={e => {
                            setFilterCategoryCol(e.target.value);
                            setSelectedCategoryValues([]);
                        }}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                    >
                        <option value="">(Filtrar por Categoría)</option>
                        {columns.map(c => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>

                    {/* Valores de Categoría */}
                    {filterCategoryCol && (
                        <select
                            multiple
                            value={selectedCategoryValues}
                            onChange={e => {
                                const selected = Array.from(e.target.selectedOptions, o => o.value);
                                setSelectedCategoryValues(selected);
                            }}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 text-xs text-slate-200 max-h-8 focus:outline-none focus:border-cyan-500"
                            title="Mantenga presionado Ctrl para seleccionar varios"
                        >
                            {categoryOptions.map(opt => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Botón para reiniciar filtros en memoria */}
                {(filterSearch || filterCategoryCol || selectedCategoryValues.length > 0) && (
                    <button
                        onClick={() => {
                            setFilterSearch('');
                            setFilterCategoryCol('');
                            setSelectedCategoryValues([]);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition flex items-center space-x-1 text-[11px]"
                    >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restablecer Filtros</span>
                    </button>
                )}
            </div>

            {/* Grilla Responsiva de Widgets */}
            <div ref={dashboardRef} className="grid grid-cols-12 gap-4">
                {widgets.length === 0 ? (
                    <div className="col-span-12 py-16 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
                        <Grid className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                        <h4 className="text-sm font-semibold text-slate-300">No hay widgets en este tablero</h4>
                        <p className="text-xs text-slate-500 mt-1">
                            Haga clic en &quot;Agregar Widget&quot; para crear tarjetas KPI, gráficos o tablas dinámicas.
                        </p>
                        <button
                            onClick={() => {
                                setEditingWidget(null);
                                setIsWidgetModalOpen(true);
                            }}
                            className="mt-4 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium inline-flex items-center space-x-1.5 transition"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Crear Primer Widget</span>
                        </button>
                    </div>
                ) : (
                    widgets.map(w => (
                        <WidgetCard
                            key={w.id}
                            widget={w}
                            data={filteredData}
                            onEdit={widgetToEdit => {
                                setEditingWidget(widgetToEdit);
                                setIsWidgetModalOpen(true);
                            }}
                            onDelete={handleDeleteWidget}
                        />
                    ))
                )}
            </div>

            {/* Modal para Agregar / Editar Widget */}
            <WidgetModal
                isOpen={isWidgetModalOpen}
                columns={columns}
                sampleData={data}
                initialWidget={editingWidget}
                onClose={() => setIsWidgetModalOpen(false)}
                onSave={handleSaveWidget}
            />

            {/* Modal para Guardar Como */}
            {isSaveAsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                            <h3 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
                                <Save className="text-cyan-400 w-4 h-4" />
                                <span>Guardar Nuevo Tablero</span>
                            </h3>
                            <button
                                onClick={() => setIsSaveAsOpen(false)}
                                className="text-slate-400 hover:text-slate-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div>
                                <label className="block text-slate-400 mb-1">Nombre del Tablero</label>
                                <input
                                    type="text"
                                    value={saveAsName}
                                    onChange={e => setSaveAsName(e.target.value)}
                                    placeholder="Ej. Análisis de Ventas Q4..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-400 mb-1">Descripción (Opcional)</label>
                                <textarea
                                    value={saveAsDesc}
                                    onChange={e => setSaveAsDesc(e.target.value)}
                                    placeholder="Detalles sobre los gráficos y métricas configuradas..."
                                    rows={3}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                                <button
                                    onClick={() => setIsSaveAsOpen(false)}
                                    className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveAs}
                                    disabled={!saveAsName.trim() || isSaving}
                                    className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium disabled:opacity-50"
                                >
                                    Guardar Tablero
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
