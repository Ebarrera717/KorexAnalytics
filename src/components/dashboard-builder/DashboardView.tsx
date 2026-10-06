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
    Share2
} from 'lucide-react';

interface DashboardViewProps {
    data: Record<string, any>[];
    columns: string[];
    procedureId: number;
    procedureName: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
    data,
    columns,
    procedureId,
    procedureName
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

    // Cargar tableros existentes al montar o cambiar el SP
    useEffect(() => {
        loadDashboards();
    }, [procedureId]);

    const loadDashboards = async () => {
        try {
            const res = await fetch(`/api/executions/dashboards?procedureId=${procedureId}`);
            if (res.ok) {
                const list = await res.json();
                setSavedDashboards(list);

                if (list.length > 0) {
                    // Cargar el tablero por defecto o el primero
                    const def = list.find((d: any) => d.isDefault) || list[0];
                    applyDashboard(def);
                } else {
                    // Inicializar con widgets inteligentes por defecto según las columnas
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
                title: 'Total Registros',
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
                    name: dashboardName,
                    description: currentDashboard.description || '',
                    widgetsConfig: widgets,
                    isDefault: currentDashboard.isDefault
                })
            });

            if (res.ok) {
                const updated = await res.json();
                setCurrentDashboard(updated);
                setSaveStatus('¡Guardado!');
                loadDashboards();
                setTimeout(() => setSaveStatus(null), 3000);
            } else {
                setSaveStatus('Error al guardar');
            }
        } catch (e) {
            setSaveStatus('Error al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    // Guardar como nuevo tablero
    const handleSaveAs = async () => {
        if (!saveAsName.trim()) return;

        setIsSaving(true);
        try {
            const res = await fetch('/api/executions/dashboards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    procedureId,
                    name: saveAsName.trim(),
                    description: saveAsDesc.trim(),
                    widgetsConfig: widgets,
                    isDefault: false
                })
            });

            if (res.ok) {
                const created = await res.json();
                setCurrentDashboard(created);
                setDashboardName(created.name);
                setIsSaveAsOpen(false);
                setSaveStatus('¡Tablero creado!');
                loadDashboards();
                setTimeout(() => setSaveStatus(null), 3000);
            }
        } catch (e) {
            console.error('Error al guardar nuevo tablero:', e);
        } finally {
            setIsSaving(false);
        }
    };

    // Eliminar tablero
    const handleDeleteDashboard = async () => {
        if (!currentDashboard?.id) return;
        if (!confirm(`¿Desea eliminar el tablero "${currentDashboard.name}"?`)) return;

        try {
            const res = await fetch(`/api/executions/dashboards?id=${currentDashboard.id}`, {
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
                                    title="Eliminar este tablero guardado"
                                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                            {filteredData.length} registros analizados • {widgets.length} widgets configurados
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
