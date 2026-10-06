'use client';

import React, { useState } from 'react';
import { WidgetConfig, WidgetType, AggregationFn } from './types';
import {
    X,
    Check,
    BarChart2,
    TrendingUp,
    PieChart,
    Table,
    Activity,
    Plus,
    Trash2
} from 'lucide-react';

interface WidgetModalProps {
    isOpen: boolean;
    columns: string[];
    sampleData: Record<string, any>[];
    initialWidget?: WidgetConfig | null;
    onClose: () => void;
    onSave: (widget: WidgetConfig) => void;
}

export const WidgetModal: React.FC<WidgetModalProps> = ({
    isOpen,
    columns,
    sampleData,
    initialWidget,
    onClose,
    onSave
}) => {
    // Detectar columnas numéricas automáticamente a partir de los datos muestreados
    const numericColumns = React.useMemo(() => {
        if (!sampleData || sampleData.length === 0) return columns;
        const first = sampleData[0];
        return columns.filter(col => {
            const val = first[col];
            return typeof val === 'number' || (!isNaN(Number(val)) && val !== null && val !== '');
        });
    }, [columns, sampleData]);

    const [title, setTitle] = useState(initialWidget?.title || 'Nuevo Widget');
    const [type, setType] = useState<WidgetType>(initialWidget?.type || 'bar');
    const [dimensionColumn, setDimensionColumn] = useState<string>(
        initialWidget?.dimensionColumn || columns[0] || ''
    );
    const [metricColumn, setMetricColumn] = useState<string>(
        initialWidget?.metricColumn || numericColumns[0] || ''
    );
    const [aggregation, setAggregation] = useState<AggregationFn>(
        initialWidget?.aggregation || 'SUM'
    );
    const [width, setWidth] = useState<'full' | 'half' | 'third' | 'quarter'>(
        initialWidget?.width || 'half'
    );
    const [colorPalette, setColorPalette] = useState(initialWidget?.colorPalette || 'cyan');
    const [topN, setTopN] = useState<number>(initialWidget?.topN !== undefined ? initialWidget.topN : 10);
    const [sortBy, setSortBy] = useState<'dimension' | 'metric'>(
        initialWidget?.sortBy || 'metric'
    );
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
        initialWidget?.sortOrder || 'desc'
    );

    React.useEffect(() => {
        if (initialWidget) {
            setTitle(initialWidget.title);
            setType(initialWidget.type);
            setDimensionColumn(initialWidget.dimensionColumn || columns[0] || '');
            setMetricColumn(initialWidget.metricColumn || numericColumns[0] || '');
            setAggregation(initialWidget.aggregation || 'SUM');
            setWidth(initialWidget.width || (initialWidget.type === 'kpi' ? 'quarter' : 'half'));
            setColorPalette(initialWidget.colorPalette || 'cyan');
            setTopN(initialWidget.topN !== undefined ? initialWidget.topN : 10);
            setSortBy(initialWidget.sortBy || 'metric');
            setSortOrder(initialWidget.sortOrder || 'desc');
        } else {
            setTitle('Nuevo Widget');
            setType('bar');
            setDimensionColumn(columns[0] || '');
            setMetricColumn(numericColumns[0] || '');
            setAggregation('SUM');
            setWidth('half');
            setColorPalette('cyan');
            setTopN(10);
            setSortBy('metric');
            setSortOrder('desc');
        }
    }, [initialWidget, isOpen, columns, numericColumns]);

    if (!isOpen) return null;

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const config: WidgetConfig = {
            id: initialWidget?.id || `w_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            title: title.trim() || 'Widget sin título',
            type,
            dimensionColumn: type === 'kpi' ? undefined : dimensionColumn,
            metricColumn: metricColumn || undefined,
            aggregation,
            width,
            colorPalette,
            topN: Number(topN),
            sortBy,
            sortOrder,
            filters: initialWidget?.filters || []
        };
        onSave(config);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
                    <div className="flex items-center space-x-2">
                        <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <BarChart2 className="w-4 h-4" />
                        </span>
                        <h3 className="text-sm font-semibold text-slate-100">
                            {initialWidget ? 'Editar Widget' : 'Nuevo Widget Analítico'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
                    {/* Título del Widget */}
                    <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                            Título del Widget
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                            placeholder="Ej. Ventas por Sucursal, Total Ingresos..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 text-xs"
                        />
                    </div>

                    {/* Selector de Tipo de Widget */}
                    <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                            Tipo de Visualización
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {[
                                { id: 'kpi', label: 'Tarjeta KPI', icon: <TrendingUp className="w-4 h-4" /> },
                                { id: 'bar', label: 'Barras', icon: <BarChart2 className="w-4 h-4" /> },
                                { id: 'line', label: 'Líneas', icon: <Activity className="w-4 h-4" /> },
                                { id: 'area', label: 'Área', icon: <Activity className="w-4 h-4" /> },
                                { id: 'pie', label: 'Pastel', icon: <PieChart className="w-4 h-4" /> },
                                { id: 'doughnut', label: 'Dona', icon: <PieChart className="w-4 h-4" /> },
                                { id: 'pivot_table', label: 'Tabla Agrup.', icon: <Table className="w-4 h-4" /> }
                            ].map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        setType(item.id as WidgetType);
                                        if (item.id === 'kpi') setWidth('quarter');
                                    }}
                                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition ${
                                        type === item.id
                                            ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-sm'
                                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                    }`}
                                >
                                    <span className="text-base mb-1">{item.icon}</span>
                                    <span className="text-[10px] font-medium">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Configuración Eje X (Dimensión) y Eje Y (Métrica) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {type !== 'kpi' && (
                            <div>
                                <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                                    Dimensión / Eje X (Agrupación)
                                </label>
                                <select
                                    value={dimensionColumn}
                                    onChange={e => setDimensionColumn(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 text-xs"
                                >
                                    {columns.map(col => (
                                        <option key={col} value={col}>
                                            {col}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className={type === 'kpi' ? 'col-span-2 sm:col-span-1' : ''}>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                                Métrica / Columna a Calcular
                            </label>
                            <select
                                value={metricColumn}
                                onChange={e => setMetricColumn(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 text-xs"
                            >
                                <option value="">(Contar Filas / Sin Columna)</option>
                                {columns.map(col => (
                                    <option key={col} value={col}>
                                        {col} {numericColumns.includes(col) ? '🔢' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                                Función de Agregación
                            </label>
                            <select
                                value={aggregation}
                                onChange={e => setAggregation(e.target.value as AggregationFn)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 text-xs font-mono"
                            >
                                <option value="SUM">SUM (Suma Total)</option>
                                <option value="COUNT">COUNT (Conteo de Filas)</option>
                                <option value="AVG">AVG (Promedio)</option>
                                <option value="MAX">MAX (Valor Máximo)</option>
                                <option value="MIN">MIN (Valor Mínimo)</option>
                            </select>
                        </div>
                    </div>

                    {/* Opciones avanzadas de orden, Top N y Ancho */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800/60">
                        <div>
                            <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                                Ancho en Grilla
                            </label>
                            <select
                                value={width}
                                onChange={e => setWidth(e.target.value as any)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 text-xs"
                            >
                                <option value="quarter">1/4 de Pantalla (25%)</option>
                                <option value="third">1/3 de Pantalla (33%)</option>
                                <option value="half">1/2 de Pantalla (50%)</option>
                                <option value="full">Ancho Completo (100%)</option>
                            </select>
                        </div>

                        {type !== 'kpi' && (
                            <>
                                <div>
                                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                                        Límite Top N
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={topN}
                                        onChange={e => setTopN(Number(e.target.value))}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 text-xs font-mono"
                                    />
                                    <span className="text-[10px] text-slate-400">0 = Mostrar todos</span>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                                        Ordenar Por
                                    </label>
                                    <select
                                        value={`${sortBy}-${sortOrder}`}
                                        onChange={e => {
                                            const [sb, so] = e.target.value.split('-');
                                            setSortBy(sb as any);
                                            setSortOrder(so as any);
                                        }}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 text-xs"
                                    >
                                        <option value="metric-desc">Mayor a Menor (Métrica)</option>
                                        <option value="metric-asc">Menor a Mayor (Métrica)</option>
                                        <option value="dimension-asc">A - Z (Dimensión)</option>
                                        <option value="dimension-desc">Z - A (Dimensión)</option>
                                    </select>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Paleta de Color */}
                    <div>
                        <label className="block text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                            Paleta de Color
                        </label>
                        <div className="flex items-center flex-wrap gap-2">
                            {[
                                { id: 'vivid', label: 'Vibrante Neón', color: 'bg-gradient-to-r from-cyan-400 via-amber-400 to-pink-500' },
                                { id: 'multi', label: 'Multicolor', color: 'bg-gradient-to-r from-cyan-400 via-emerald-400 to-violet-500' },
                                { id: 'cyan', label: 'Cyan', color: 'bg-cyan-500' },
                                { id: 'blue', label: 'Azul', color: 'bg-blue-500' },
                                { id: 'emerald', label: 'Verde', color: 'bg-emerald-500' },
                                { id: 'amber', label: 'Ámbar', color: 'bg-amber-500' },
                                { id: 'violet', label: 'Violeta', color: 'bg-violet-500' }
                            ].map(p => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setColorPalette(p.id)}
                                    className={`px-3 py-1.5 rounded-lg border text-xs flex items-center space-x-1.5 transition ${
                                        colorPalette === p.id
                                            ? 'border-cyan-500 bg-slate-800 text-cyan-400'
                                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <span className={`w-2.5 h-2.5 rounded-full ${p.color}`} />
                                    <span>{p.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Footer con Botones */}
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition flex items-center space-x-1.5"
                        >
                            <Check className="w-3.5 h-3.5" />
                            <span>{initialWidget ? 'Actualizar Widget' : 'Agregar al Tablero'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
