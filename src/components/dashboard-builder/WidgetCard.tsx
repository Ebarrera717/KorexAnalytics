'use client';

import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    LogarithmicScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { WidgetConfig } from './types';
import { processWidgetData, formatMetricNumber } from './data-engine';
import {
    BarChart2,
    TrendingUp,
    PieChart,
    Table,
    Trash2,
    Edit3,
    Maximize2,
    Activity,
    DollarSign,
    Layers
} from 'lucide-react';

// Registrar módulos necesarios de Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    LogarithmicScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface WidgetCardProps {
    widget: WidgetConfig;
    data: Record<string, any>[];
    onEdit: (widget: WidgetConfig) => void;
    onDelete: (id: string) => void;
}

// Paleta Neón de Alto Contraste con colores individuales llamativos para cada elemento
const VIVID_COLORS = [
    { bg: '#06b6d4', border: '#22d3ee', name: 'Cyan Neón' },
    { bg: '#f59e0b', border: '#fbbf24', name: 'Ámbar Intenso' },
    { bg: '#10b981', border: '#34d399', name: 'Verde Esmeralda' },
    { bg: '#ec4899', border: '#f472b6', name: 'Rosa Eléctrico' },
    { bg: '#8b5cf6', border: '#a78bfa', name: 'Violeta Neón' },
    { bg: '#3b82f6', border: '#60a5fa', name: 'Azul Real' },
    { bg: '#f97316', border: '#fb923c', name: 'Naranja Fuego' },
    { bg: '#14b8a6', border: '#2dd4bf', name: 'Teal Brillante' },
    { bg: '#ef4444', border: '#f87171', name: 'Rojo Rubí' },
    { bg: '#eab308', border: '#fde047', name: 'Amarillo Lima' }
];

const PALETTES: Record<string, { bg: string[]; border: string[] }> = {
    vivid: {
        bg: VIVID_COLORS.map(c => c.bg),
        border: VIVID_COLORS.map(c => c.border)
    },
    multi: {
        bg: VIVID_COLORS.map(c => c.bg),
        border: VIVID_COLORS.map(c => c.border)
    },
    cyan: {
        bg: ['#06b6d4', '#22d3ee', '#0891b2', '#0e7490'],
        border: ['#22d3ee', '#67e8f9', '#06b6d4', '#0891b2']
    },
    emerald: {
        bg: ['#10b981', '#34d399', '#059669', '#047857'],
        border: ['#34d399', '#6ee7b7', '#10b981', '#059669']
    },
    amber: {
        bg: ['#f59e0b', '#fbbf24', '#d97706', '#b45309'],
        border: ['#fbbf24', '#fde68a', '#f59e0b', '#d97706']
    },
    violet: {
        bg: ['#8b5cf6', '#a78bfa', '#7c3aed', '#6d28d9'],
        border: ['#a78bfa', '#c4b5fd', '#8b5cf6', '#7c3aed']
    },
    blue: {
        bg: ['#3b82f6', '#60a5fa', '#2563eb', '#1d4ed8'],
        border: ['#60a5fa', '#93c5fd', '#3b82f6', '#2563eb']
    }
};

export const WidgetCard: React.FC<WidgetCardProps> = ({ widget, data, onEdit, onDelete }) => {
    const processed = React.useMemo(() => {
        return processWidgetData(data, widget);
    }, [data, widget]);

    // Para gráficos de barras, pastel o dona, usamos la paleta VIVID por defecto para que cada elemento tenga un color diferente y llamativo
    const isMultiColorWidget = widget.type === 'bar' || widget.type === 'pie' || widget.type === 'doughnut';
    const effectivePalette = isMultiColorWidget && (!widget.colorPalette || widget.colorPalette === 'blue' || widget.colorPalette === 'cyan')
        ? PALETTES.vivid
        : (PALETTES[widget.colorPalette || 'vivid'] || PALETTES.vivid);

    const chartOptions: any = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: widget.type === 'pie' || widget.type === 'doughnut',
                position: 'bottom',
                labels: {
                    color: '#f8fafc',
                    font: { size: 11, family: 'Inter, system-ui, sans-serif', weight: '700' },
                    boxWidth: 14,
                    padding: 12,
                    generateLabels: function(chart: any) {
                        const overrides = (ChartJS.overrides as any)[widget.type];
                        const original = overrides?.plugins?.legend?.labels?.generateLabels?.(chart) || [];
                        return original.map((item: any, idx: number) => {
                            const val = processed.values[idx] || 0;
                            const pct = totalSum > 0 ? ((val / totalSum) * 100).toFixed(2) : '0';
                            item.text = `${item.text} (${pct}%)`;
                            return item;
                        });
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.98)',
                titleColor: '#f8fafc',
                bodyColor: '#38bdf8',
                borderColor: 'rgba(56, 189, 248, 0.5)',
                borderWidth: 2,
                padding: 14,
                callbacks: {
                    label: function (context: any) {
                        const val = context.parsed.y !== undefined ? context.parsed.y : context.parsed;
                        const pctStr = context.dataset?.percentageMap?.[context.dataIndex]
                            ? ` (${context.dataset.percentageMap[context.dataIndex]}%)`
                            : '';
                        return ` ${formatMetricNumber(val)} ${pctStr}`;
                    }
                }
            }
        },
        scales:
            widget.type === 'pie' || widget.type === 'doughnut'
                ? undefined
                : {
                      x: {
                          grid: { color: 'rgba(255, 255, 255, 0.08)' },
                          ticks: {
                              color: '#cbd5e1',
                              font: { size: 10, weight: '700' },
                              maxRotation: 35,
                              minRotation: 0
                          }
                      },
                      y: {
                          type: processed.values.length > 0 && processed.values.every(v => v > 0) ? 'logarithmic' : 'linear',
                          grid: { color: 'rgba(255, 255, 255, 0.08)' },
                          ticks: {
                              color: '#cbd5e1',
                              font: { size: 10, weight: '600' },
                              callback: (v: any) => formatMetricNumber(v)
                          }
                      }
                  }
    };

    // Generar arreglo de colores llamativos donde CADA BARRA tiene un color diferente garantizado
    const itemColorsBg = processed.labels.map((_, i) => VIVID_COLORS[i % VIVID_COLORS.length].bg);
    const itemColorsBorder = processed.labels.map((_, i) => VIVID_COLORS[i % VIVID_COLORS.length].border);

    // Calcular mapa de porcentajes para el tooltip del gráfico
    const totalSum = processed.values.reduce((a, b) => a + (b > 0 ? b : 0), 0);
    const percentageMap = processed.values.map(v => (totalSum > 0 ? ((v / totalSum) * 100).toFixed(2) : '0'));

    const chartData = {
        labels: processed.labels,
        datasets: [
            {
                label: widget.title,
                data: processed.values,
                backgroundColor:
                    widget.type === 'line' || widget.type === 'area'
                        ? effectivePalette.bg[0]
                        : itemColorsBg,
                borderColor:
                    widget.type === 'line' || widget.type === 'area'
                        ? effectivePalette.border[0]
                        : widget.type === 'doughnut' || widget.type === 'pie'
                        ? '#090d16'
                        : itemColorsBorder,
                borderWidth: widget.type === 'doughnut' || widget.type === 'pie' ? 3 : 2,
                borderRadius: widget.type === 'bar' ? 6 : 0,
                spacing: widget.type === 'doughnut' ? 2 : 0,
                fill: widget.type === 'area',
                tension: 0.35,
                percentageMap
            }
        ]
    };

    // Ancho de grilla CSS
    const widthClasses = {
        full: 'col-span-12',
        half: 'col-span-12 lg:col-span-6',
        third: 'col-span-12 lg:col-span-4',
        quarter: 'col-span-12 sm:col-span-6 lg:col-span-3'
    }[widget.width || (widget.type === 'kpi' ? 'quarter' : 'half')];

    // Estilos de color llamativos para tarjetas KPI
    const kpiGradient = widget.title.toLowerCase().includes('tarifa')
        ? 'from-amber-400 to-orange-500'
        : widget.title.toLowerCase().includes('total')
        ? 'from-emerald-400 to-teal-400'
        : widget.title.toLowerCase().includes('registro')
        ? 'from-cyan-400 to-blue-400'
        : 'from-fuchsia-400 to-pink-500';

    return (
        <div className={`${widthClasses} bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 flex flex-col justify-between shadow-lg shadow-black/30 transition-all duration-200 group`}>
            {/* Header del Widget */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60">
                <div className="flex items-center space-x-2 min-w-0">
                    <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs shrink-0">
                        {widget.type === 'kpi' && <TrendingUp className="w-3.5 h-3.5" />}
                        {widget.type === 'bar' && <BarChart2 className="w-3.5 h-3.5" />}
                        {(widget.type === 'line' || widget.type === 'area') && <Activity className="w-3.5 h-3.5" />}
                        {(widget.type === 'pie' || widget.type === 'doughnut') && <PieChart className="w-3.5 h-3.5" />}
                        {widget.type === 'pivot_table' && <Table className="w-3.5 h-3.5" />}
                    </span>
                    <div className="truncate">
                        <h4 className="text-xs font-semibold text-slate-100 truncate">{widget.title}</h4>
                        <p className="text-[10px] text-slate-400 truncate">
                            {widget.type === 'kpi'
                                ? `${widget.aggregation} de ${widget.metricColumn || 'registros'}`
                                : `${widget.aggregation}(${widget.metricColumn || '*'}) por ${widget.dimensionColumn || 'Categoría'}`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(widget)}
                        title="Editar Widget"
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded transition"
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => onDelete(widget.id)}
                        title="Eliminar Widget"
                        className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Contenido / Cuerpo del Widget */}
            <div className="flex-1 flex flex-col justify-center min-h-[160px] py-2">
                {widget.type === 'kpi' ? (
                    <div className="text-center py-4">
                        <div className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${kpiGradient} tracking-tight drop-shadow-sm`}>
                            {formatMetricNumber(processed.kpiValue || 0)}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 font-medium">
                            {processed.totalCount} registros evaluados
                        </div>
                    </div>
                ) : widget.type === 'pivot_table' ? (
                    <div className="overflow-x-auto max-h-[220px] rounded border border-slate-800/80">
                        <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-400 sticky top-0">
                                <tr>
                                    <th className="px-3 py-2">{widget.dimensionColumn || 'Dimensión'}</th>
                                    <th className="px-3 py-2 text-right">
                                        {widget.aggregation} ({widget.metricColumn || 'Valor'})
                                    </th>
                                    <th className="px-3 py-2 text-right">Participación (%)</th>
                                    <th className="px-3 py-2 text-right">Registros</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {processed.rows && processed.rows.length > 0 ? (
                                    processed.rows.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-800/40">
                                            <td className="px-3 py-1.5 font-medium text-slate-200">
                                                {row[widget.dimensionColumn!]}
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-mono text-cyan-400 font-semibold">
                                                {formatMetricNumber(row[widget.metricColumn || 'conteo'])}
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-mono">
                                                <div className="flex items-center justify-end space-x-1.5">
                                                    <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full"
                                                            style={{ width: `${Math.min(row.porcentaje || 0, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-emerald-400 font-bold text-[11px]">
                                                        {row.porcentaje !== undefined ? `${row.porcentaje.toFixed(2)}%` : '0%'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-mono text-slate-400">
                                                {row.registros}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="text-center py-4 text-slate-500">
                                            Sin datos disponibles
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="h-[250px] w-full">
                        {processed.labels.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-xs text-slate-500">
                                No se encontraron datos para graficar
                            </div>
                        ) : widget.type === 'bar' ? (
                            <Bar data={chartData} options={chartOptions} />
                        ) : widget.type === 'line' || widget.type === 'area' ? (
                            <Line data={chartData} options={chartOptions} />
                        ) : widget.type === 'pie' ? (
                            <Pie data={chartData} options={chartOptions} />
                        ) : widget.type === 'doughnut' ? (
                            <Doughnut data={chartData} options={chartOptions} />
                        ) : null}
                    </div>
                )}
            </div>

            {/* Footer con info de orden y Top N */}
            {widget.type !== 'kpi' && (
                <div className="pt-2 mt-1 border-t border-slate-800/40 flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                        Top {widget.topN && widget.topN > 0 ? widget.topN : 'Todos'} | Orden:{' '}
                        {widget.sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
                    </span>
                    <span className="font-mono text-slate-400">{processed.labels.length} grupos</span>
                </div>
            )}
        </div>
    );
};
