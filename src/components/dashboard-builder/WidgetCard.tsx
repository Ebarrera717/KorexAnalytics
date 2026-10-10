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
    Layers,
    FileSpreadsheet,
    FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';

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

    // Exportar SOLO esta tabla o widget a Excel (con el 100% de la información real)
    const handleExportWidgetExcel = () => {
        const rowsToExport = processed.allRows || processed.rows;
        if (!rowsToExport || rowsToExport.length === 0) {
            alert('No hay datos disponibles para exportar.');
            return;
        }

        const wb = XLSX.utils.book_new();
        const sheetData: any[] = [];

        rowsToExport.forEach(r => {
            const isParent = !!r.isParentGroup;
            const hasChildren = isParent && Array.isArray(r.children) && r.children.length > 0;

            if (isParent) {
                // Fila del Padre (ej: Usuario)
                sheetData.push({
                    [widget.dimensionColumn || 'Dimensión']: `[USUARIO] ${r[widget.dimensionColumn!]}`,
                    [`${widget.aggregation} (${widget.metricColumn || 'Valor'})`]: r[widget.metricColumn || 'conteo'],
                    'Participación (%)': `${r.porcentaje ?? 0}%`,
                    'Sumatoria': r.sumatoria ?? r.sumatoriaTiquetes ?? r.registros ?? 0,
                    'Participación Sumatoria (%)': `${r.porcentajeSumatoria ?? r.porcentajeTiquetes ?? 0}%`
                });

                if (hasChildren) {
                    r.children.forEach((ch: any) => {
                        sheetData.push({
                            [widget.dimensionColumn || 'Dimensión']: `    └── ${ch[widget.dimensionColumn!]}`,
                            [`${widget.aggregation} (${widget.metricColumn || 'Valor'})`]: ch[widget.metricColumn || 'conteo'],
                            'Participación (%)': `${ch.porcentaje ?? 0}%`,
                            'Sumatoria': ch.sumatoria ?? ch.sumatoriaTiquetes ?? ch.registros ?? 0,
                            'Participación Sumatoria (%)': `${ch.porcentajeSumatoria ?? ch.porcentajeTiquetes ?? 0}%`
                        });
                    });
                }
            } else {
                sheetData.push({
                    [widget.dimensionColumn || 'Dimensión']: r[widget.dimensionColumn!],
                    [`${widget.aggregation} (${widget.metricColumn || 'Valor'})`]: r[widget.metricColumn || 'conteo'],
                    'Participación (%)': `${r.porcentaje ?? 0}%`,
                    'Sumatoria': r.sumatoria ?? r.sumatoriaTiquetes ?? r.registros ?? 0,
                    'Participación Sumatoria (%)': `${r.porcentajeSumatoria ?? r.porcentajeTiquetes ?? 0}%`
                });
            }
        });

        // Agregar fila de Total General exacto
        sheetData.push({
            [widget.dimensionColumn || 'Dimensión']: `TOTAL (${processed.totalCount} grupos)`,
            [`${widget.aggregation} (${widget.metricColumn || 'Valor'})`]: processed.totalGlobalMetricSum ?? processed.totalMetricSum ?? 0,
            'Participación (%)': '100.00%',
            'Sumatoria': processed.totalGlobalSumatoria ?? processed.totalGlobalTiquetesSum ?? processed.totalSumatoria ?? processed.totalTiquetesSum ?? 0,
            'Participación Sumatoria (%)': '100.00%'
        });

        const ws = XLSX.utils.json_to_sheet(sheetData);
        const safeTitle = (widget.title.replace(/[\/\\?*:[\]]/g, '').trim() || 'Reporte').substring(0, 30);
        XLSX.utils.book_append_sheet(wb, ws, safeTitle);
        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `${safeTitle}_${dateStr}.xlsx`);
    };

    // Exportar SOLO esta tabla a PDF (abriendo ventana con toda la data completa sin límite de scroll)
    const handleExportWidgetPDF = () => {
        const rowsToExport = processed.allRows || processed.rows;
        if (!rowsToExport || rowsToExport.length === 0) {
            alert('No hay datos disponibles para exportar.');
            return;
        }

        const printWindow = window.open('', '_blank', 'width=1100,height=850');
        if (!printWindow) {
            alert('Por favor permita ventanas emergentes para generar el PDF.');
            return;
        }

        const title = widget.title;
        const totalVal = formatMetricNumber(processed.totalGlobalMetricSum ?? processed.totalMetricSum ?? 0);
        const totalSum = formatMetricNumber(processed.totalGlobalSumatoria ?? processed.totalGlobalTiquetesSum ?? processed.totalSumatoria ?? processed.totalTiquetesSum ?? 0);

        let rowsHtml = '';
        rowsToExport.forEach((r, idx) => {
            const dim = r[widget.dimensionColumn!] ?? '';
            const metric = formatMetricNumber(r[widget.metricColumn || 'conteo']);
            const pct = r.porcentaje !== undefined ? `${r.porcentaje.toFixed(2)}%` : '0%';
            const sumVal = formatMetricNumber(r.sumatoria ?? r.sumatoriaTiquetes ?? r.registros ?? 0);
            const pctSum = (r.porcentajeSumatoria !== undefined ? r.porcentajeSumatoria : r.porcentajeTiquetes) !== undefined
                ? `${(r.porcentajeSumatoria ?? r.porcentajeTiquetes).toFixed(2)}%`
                : '0%';

            const isParent = !!r.isParentGroup;
            const hasChildren = isParent && Array.isArray(r.children) && r.children.length > 0;

            if (isParent) {
                rowsHtml += `
                    <tr style="border-top: 2px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; background-color: #f1f5f9; font-size: 11px; font-weight: 700;">
                        <td style="padding: 7px 10px; color: #475569; font-family: monospace; text-align: center;">${idx + 1}</td>
                        <td style="padding: 7px 10px; color: #0f172a;"><strong>[USUARIO] ${dim}</strong></td>
                        <td style="padding: 7px 10px; text-align: right; font-family: monospace; font-weight: 700; color: #0284c7;">${metric}</td>
                        <td style="padding: 7px 10px; text-align: right; font-weight: 700; color: #059669;">${pct}</td>
                        <td style="padding: 7px 10px; text-align: right; font-family: monospace; font-weight: 700; color: #d97706; background-color: #fef3c7;">${sumVal}</td>
                        <td style="padding: 7px 10px; text-align: right; font-weight: 700; color: #b45309;">${pctSum}</td>
                    </tr>
                `;
                if (hasChildren) {
                    r.children.forEach((ch: any) => {
                        const chDim = ch[widget.dimensionColumn!] ?? '';
                        const chMetric = formatMetricNumber(ch[widget.metricColumn || 'conteo']);
                        const chPct = ch.porcentaje !== undefined ? `${ch.porcentaje.toFixed(2)}%` : '0%';
                        const chSumVal = formatMetricNumber(ch.sumatoria ?? ch.sumatoriaTiquetes ?? ch.registros ?? 0);
                        const chPctSum = (ch.porcentajeSumatoria !== undefined ? ch.porcentajeSumatoria : ch.porcentajeTiquetes) !== undefined
                            ? `${(ch.porcentajeSumatoria ?? ch.porcentajeTiquetes).toFixed(2)}%`
                            : '0%';

                        rowsHtml += `
                            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px; color: #475569;">
                                <td></td>
                                <td style="padding: 5px 10px 5px 28px; color: #334155;">└── ${chDim}</td>
                                <td style="padding: 5px 10px; text-align: right; font-family: monospace; color: #0284c7;">${chMetric}</td>
                                <td style="padding: 5px 10px; text-align: right; color: #059669;">${chPct}</td>
                                <td style="padding: 5px 10px; text-align: right; font-family: monospace; color: #d97706; background-color: #fffbeb;">${chSumVal}</td>
                                <td style="padding: 5px 10px; text-align: right; color: #b45309;">${chPctSum}</td>
                            </tr>
                        `;
                    });
                }
            } else {
                rowsHtml += `
                    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                        <td style="padding: 7px 10px; color: #64748b; font-family: monospace; text-align: center;">${idx + 1}</td>
                        <td style="padding: 7px 10px; font-weight: 600; color: #1e293b;">${dim}</td>
                        <td style="padding: 7px 10px; text-align: right; font-family: monospace; font-weight: 700; color: #0284c7;">${metric}</td>
                        <td style="padding: 7px 10px; text-align: right; font-weight: 600; color: #059669;">${pct}</td>
                        <td style="padding: 7px 10px; text-align: right; font-family: monospace; font-weight: 700; color: #d97706; background-color: #fef3c7;">${sumVal}</td>
                        <td style="padding: 7px 10px; text-align: right; font-weight: 600; color: #b45309;">${pctSum}</td>
                    </tr>
                `;
            }
        });

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>${title} - Reporte Completo</title>
                <style>
                    @page { size: landscape; margin: 15mm; }
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 20px; color: #1e293b; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; }
                    .title { font-size: 18px; font-weight: 800; color: #0f172a; }
                    .subtitle { font-size: 12px; color: #64748b; margin-top: 3px; }
                    .date { font-size: 11px; color: #64748b; text-align: right; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th { background-color: #0f172a; color: #ffffff; padding: 9px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
                    tfoot tr { background-color: #f1f5f9; border-top: 2px solid #0f172a; font-weight: 800; font-size: 12px; }
                    tfoot td { padding: 9px 10px; }
                    @media print {
                        .no-print { display: none !important; }
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="no-print" style="margin-bottom: 16px; display: flex; gap: 10px;">
                    <button onclick="window.print()" style="padding: 8px 16px; background: #0284c7; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
                        Imprimir / Guardar como PDF
                    </button>
                    <button onclick="window.close()" style="padding: 8px 16px; background: #64748b; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
                        Cerrar Ventana
                    </button>
                </div>

                <div class="header">
                    <div>
                        <div class="title">${title}</div>
                        <div class="subtitle">Dimensión: ${widget.dimensionColumn || 'Dimensión'} • Métrica: ${widget.aggregation} (${widget.metricColumn || 'Valor'}) • Universo Completo (${rowsToExport.length} grupos)</div>
                    </div>
                    <div class="date">
                        <div><strong>KOREX ANALYTICS</strong></div>
                        <div>Fecha: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 40px; text-align: center;">#</th>
                            <th style="text-align: left;">${widget.dimensionColumn || 'Dimensión'}</th>
                            <th style="text-align: right;">${widget.aggregation} (${widget.metricColumn || 'Valor'})</th>
                            <th style="text-align: right;">Participación (%)</th>
                            <th style="text-align: right;">Sumatoria</th>
                            <th style="text-align: right;">Participación (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2" style="color: #0284c7;">TOTAL (${processed.totalCount} grupos evaluados)</td>
                            <td style="text-align: right; color: #0284c7; font-family: monospace;">${totalVal}</td>
                            <td style="text-align: right; color: #059669;">100.00%</td>
                            <td style="text-align: right; color: #d97706; background-color: #fef3c7; font-family: monospace;">${totalSum}</td>
                            <td style="text-align: right; color: #b45309;">100.00%</td>
                        </tr>
                    </tfoot>
                </table>

                <script>
                    window.onload = function() {
                        setTimeout(function() { window.print(); }, 350);
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    };

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

                <div className="flex items-center space-x-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    {/* Botones de Exportación Directa del Widget (Excel y PDF con 100% de la información real) */}
                    {widget.type === 'pivot_table' && (
                        <>
                            <button
                                onClick={handleExportWidgetExcel}
                                title="Exportar esta tabla completa a Excel (.xlsx)"
                                className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold flex items-center space-x-1 transition"
                            >
                                <FileSpreadsheet className="w-3 h-3" />
                                <span>Excel</span>
                            </button>
                            <button
                                onClick={handleExportWidgetPDF}
                                title="Exportar esta tabla completa a PDF (todos los registros, sin límite de scroll)"
                                className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 rounded text-[10px] font-bold flex items-center space-x-1 transition"
                            >
                                <FileText className="w-3 h-3" />
                                <span>PDF</span>
                            </button>
                        </>
                    )}

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
                            {formatMetricNumber(processed.totalCount)} registros evaluados
                        </div>
                    </div>
                ) : widget.type === 'pivot_table' ? (
                    <div className="overflow-x-auto max-h-[300px] rounded border border-slate-800/80 shadow-inner">
                        <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-slate-950 text-[10px] uppercase tracking-wider text-slate-400 sticky top-0 z-10 border-b border-slate-800">
                                <tr>
                                    <th className="px-3 py-2 font-bold text-slate-300">{widget.dimensionColumn || 'Dimensión'}</th>
                                    <th className="px-3 py-2 text-right font-bold text-cyan-300">
                                        {widget.aggregation} ({widget.metricColumn || 'Valor'})
                                    </th>
                                    <th className="px-3 py-2 text-right font-semibold text-slate-300">Participación (%)</th>
                                    <th className="px-3 py-2 text-right font-bold text-amber-300 bg-amber-500/10 border-l border-r border-amber-500/20">
                                        Sumatoria
                                    </th>
                                    <th className="px-3 py-2 text-right font-semibold text-slate-300">Participación (%)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {processed.rows && processed.rows.length > 0 ? (
                                    processed.rows.map((row, idx) => {
                                        const isParent = !!row.isParentGroup;
                                        const hasChildren = isParent && Array.isArray(row.children) && row.children.length > 0;
                                        return (
                                            <React.Fragment key={idx}>
                                                {/* Fila del Padre (ej: Usuario con su subtotal global) */}
                                                <tr className={`transition-colors ${isParent ? 'bg-slate-900/90 hover:bg-slate-850 font-semibold border-t border-slate-700/60' : 'hover:bg-slate-800/50'}`}>
                                                    <td className="px-3 py-1.5 font-medium text-slate-200">
                                                        <div className="flex items-center space-x-1.5">
                                                            {isParent && (
                                                                <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-1.5 py-0.5 rounded font-mono font-bold tracking-wider">
                                                                    USUARIO
                                                                </span>
                                                            )}
                                                            <span className={isParent ? 'text-white font-bold tracking-wide' : ''}>
                                                                {row[widget.dimensionColumn!]}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right font-mono text-cyan-400 font-bold">
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
                                                    <td className="px-3 py-1.5 text-right font-mono text-amber-300 font-bold bg-amber-500/5 border-l border-r border-amber-500/15">
                                                        {formatMetricNumber(row.sumatoria ?? row.sumatoriaTiquetes ?? row.registros)}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right font-mono">
                                                        <div className="flex items-center justify-end space-x-1.5">
                                                            <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                                <div
                                                                    className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full"
                                                                    style={{ width: `${Math.min(row.porcentajeSumatoria ?? row.porcentajeTiquetes ?? 0, 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-amber-400 font-bold text-[11px]">
                                                                {row.porcentajeSumatoria !== undefined
                                                                    ? `${row.porcentajeSumatoria.toFixed(2)}%`
                                                                    : (row.porcentajeTiquetes !== undefined ? `${row.porcentajeTiquetes.toFixed(2)}%` : '0%')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Detalle de Tipos de Servicio dentro del Usuario */}
                                                {hasChildren && row.children.map((child: any, cIdx: number) => (
                                                    <tr key={`${idx}-${cIdx}`} className="bg-slate-950/40 hover:bg-slate-900/60 transition-colors text-slate-300">
                                                        <td className="pl-6 pr-3 py-1 font-normal">
                                                            <div className="flex items-center space-x-2">
                                                                <span className="text-slate-600 font-mono text-xs select-none">└──</span>
                                                                <span className="text-slate-300 text-[11px] font-medium">{child[widget.dimensionColumn!]}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-1 text-right font-mono text-cyan-300/90 text-[11px]">
                                                            {formatMetricNumber(child[widget.metricColumn || 'conteo'])}
                                                        </td>
                                                        <td className="px-3 py-1 text-right font-mono text-[11px]">
                                                            <div className="flex items-center justify-end space-x-1.5">
                                                                <div className="w-10 bg-slate-800 rounded-full h-1 overflow-hidden">
                                                                    <div
                                                                        className="bg-cyan-500/70 h-full rounded-full"
                                                                        style={{ width: `${Math.min(child.porcentaje || 0, 100)}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-emerald-400/90 text-[10px]">
                                                                    {child.porcentaje !== undefined ? `${child.porcentaje.toFixed(2)}%` : '0%'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-1 text-right font-mono text-amber-300/90 bg-amber-500/5 border-l border-r border-amber-500/10 text-[11px]">
                                                            {formatMetricNumber(child.sumatoria ?? child.sumatoriaTiquetes ?? child.registros)}
                                                        </td>
                                                        <td className="px-3 py-1 text-right font-mono text-[11px]">
                                                            <div className="flex items-center justify-end space-x-1.5">
                                                                <div className="w-10 bg-slate-800 rounded-full h-1 overflow-hidden">
                                                                    <div
                                                                        className="bg-amber-500/70 h-full rounded-full"
                                                                        style={{ width: `${Math.min(child.porcentajeSumatoria ?? child.porcentajeTiquetes ?? 0, 100)}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-amber-400/90 text-[10px]">
                                                                    {child.porcentajeSumatoria !== undefined
                                                                        ? `${child.porcentajeSumatoria.toFixed(2)}%`
                                                                        : (child.porcentajeTiquetes !== undefined ? `${child.porcentajeTiquetes.toFixed(2)}%` : '0%')}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-6 text-slate-500">
                                            Sin datos disponibles
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {processed.rows && processed.rows.length > 0 && (
                                <tfoot className="bg-slate-950 font-bold text-slate-100 border-t-2 border-slate-700 sticky bottom-0 z-10 text-[11px]">
                                    <tr className="bg-slate-950">
                                        <td className="px-3 py-2 text-cyan-400 font-black">
                                            TOTAL ({processed.totalCount} {processed.totalCount === 1 ? 'grupo' : 'grupos'})
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-cyan-300 font-black text-xs">
                                            {formatMetricNumber(processed.totalGlobalMetricSum ?? processed.totalMetricSum ?? 0)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-emerald-400 font-bold">
                                            100.00%
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-amber-300 font-black bg-amber-500/10 border-l border-r border-amber-500/20 text-xs">
                                            {formatMetricNumber(processed.totalGlobalSumatoria ?? processed.totalGlobalTiquetesSum ?? processed.totalSumatoria ?? processed.totalTiquetesSum ?? 0)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-amber-400 font-bold">
                                            100.00%
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
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
