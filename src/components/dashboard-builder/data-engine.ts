import { WidgetConfig, WidgetFilter, AggregationFn } from './types';

export interface ProcessedDataResult {
    labels: string[];
    values: number[];
    kpiValue?: number;
    rows?: Record<string, any>[];
    allRows?: Record<string, any>[];
    totalCount: number;
    totalMetricSum?: number;
    totalTiquetesSum?: number;
    totalGlobalMetricSum?: number;
    totalGlobalTiquetesSum?: number;
}

/**
 * Aplica filtros específicos a las filas de datos
 */
export function applyWidgetFilters(rows: Record<string, any>[], filters?: WidgetFilter[]): Record<string, any>[] {
    if (!filters || filters.length === 0) return rows;

    return rows.filter(row => {
        return filters.every(f => {
            const rawVal = row[f.column];
            if (rawVal === undefined || rawVal === null) return false;

            const valStr = String(rawVal).toLowerCase();
            const filterStr = String(f.value).toLowerCase();

            switch (f.operator) {
                case 'equals':
                    return valStr === filterStr;
                case 'not_equals':
                    return valStr !== filterStr;
                case 'contains':
                    return valStr.includes(filterStr);
                case 'greater':
                    return Number(rawVal) > Number(f.value);
                case 'less':
                    return Number(rawVal) < Number(f.value);
                default:
                    return true;
            }
        });
    });
}

/**
 * Procesa la data para un widget según su configuración (agrupación, métrica, agregación)
 */
export function processWidgetData(rows: Record<string, any>[], widget: WidgetConfig): ProcessedDataResult {
    // 1. Filtrar si tiene filtros de widget
    const filteredRows = applyWidgetFilters(rows, widget.filters);

    // Si es tipo KPI (tarjeta métrica global)
    if (widget.type === 'kpi') {
        const kpiVal = calculateMetric(filteredRows, widget.metricColumn, widget.aggregation);
        return {
            labels: [widget.title],
            values: [kpiVal],
            kpiValue: kpiVal,
            totalCount: filteredRows.length
        };
    }

    // Si es tabla dinámica/agrupada
    if (widget.type === 'pivot_table') {
        if (!widget.dimensionColumn) {
            return {
                labels: [],
                values: [],
                rows: filteredRows.slice(0, widget.topN || 50),
                totalCount: filteredRows.length
            };
        }

        // Agrupar por dimensión
        const groups = groupByDimension(filteredRows, widget.dimensionColumn, widget.metricColumn, widget.aggregation);
        sortGroups(groups, widget.sortBy, widget.sortOrder);
        
        // Totales globales de toda la consulta (100% de la base de datos)
        const totalGlobalMetricSum = groups.reduce((acc, g) => acc + (g.value > 0 ? g.value : 0), 0);
        const totalGlobalTiquetesSum = groups.reduce((acc, g) => acc + g.count, 0);

        // Subconjunto según Top N seleccionado (ej: Top 20)
        const sliced = widget.topN && widget.topN > 0 ? groups.slice(0, widget.topN) : groups;
        const totalMetricSum = sliced.reduce((acc, g) => acc + (g.value > 0 ? g.value : 0), 0);
        const totalTiquetesSum = sliced.reduce((acc, g) => acc + g.count, 0);

        // Mapear todas las filas sin truncar (para exportación completa a PDF y Excel)
        const allRows = groups.map(g => {
            const pct = totalGlobalMetricSum > 0 ? (g.value / totalGlobalMetricSum) * 100 : 0;
            const pctTkt = totalGlobalTiquetesSum > 0 ? (g.count / totalGlobalTiquetesSum) * 100 : 0;
            return {
                [widget.dimensionColumn!]: g.label,
                [widget.metricColumn || 'conteo']: g.value,
                registros: g.count,
                tiquetes: g.count,
                sumatoriaTiquetes: g.count,
                porcentaje: Math.round(pct * 100) / 100,
                porcentajeTiquetes: Math.round(pctTkt * 100) / 100
            };
        });

        return {
            labels: sliced.map(g => g.label),
            values: sliced.map(g => g.value),
            rows: sliced.map(g => {
                const pct = totalGlobalMetricSum > 0 ? (g.value / totalGlobalMetricSum) * 100 : 0;
                const pctTkt = totalGlobalTiquetesSum > 0 ? (g.count / totalGlobalTiquetesSum) * 100 : 0;
                return {
                    [widget.dimensionColumn!]: g.label,
                    [widget.metricColumn || 'conteo']: g.value,
                    registros: g.count,
                    tiquetes: g.count,
                    sumatoriaTiquetes: g.count,
                    porcentaje: Math.round(pct * 100) / 100,
                    porcentajeTiquetes: Math.round(pctTkt * 100) / 100
                };
            }),
            allRows,
            totalCount: groups.length,
            totalMetricSum,
            totalTiquetesSum,
            totalGlobalMetricSum,
            totalGlobalTiquetesSum
        };
    }

    // Gráficos (bar, line, pie, doughnut, area)
    const dimension = widget.dimensionColumn || '';
    if (!dimension) {
        return { labels: [], values: [], totalCount: filteredRows.length };
    }

    const groups = groupByDimension(filteredRows, dimension, widget.metricColumn, widget.aggregation);
    sortGroups(groups, widget.sortBy, widget.sortOrder);
    const sliced = widget.topN && widget.topN > 0 ? groups.slice(0, widget.topN) : groups;

    return {
        labels: sliced.map(g => g.label),
        values: sliced.map(g => g.value),
        totalCount: groups.length
    };
}

/**
 * Calcula una función de agregación sobre una columna
 */
function calculateMetric(rows: Record<string, any>[], metricCol?: string, agg: AggregationFn = 'COUNT'): number {
    if (rows.length === 0) return 0;
    if (agg === 'COUNT' || !metricCol) return rows.length;

    const nums = rows
        .map(r => Number(r[metricCol]))
        .filter(n => !isNaN(n) && isFinite(n));

    if (nums.length === 0) return 0;

    switch (agg) {
        case 'SUM':
            return nums.reduce((acc, curr) => acc + curr, 0);
        case 'AVG':
            return nums.reduce((acc, curr) => acc + curr, 0) / nums.length;
        case 'MIN':
            return Math.min(...nums);
        case 'MAX':
            return Math.max(...nums);
        default:
            return nums.length;
    }
}

interface GroupItem {
    label: string;
    value: number;
    count: number;
}

/**
 * Agrupa filas por una dimensión (simple o compuesta separada por / o ,) y calcula la agregación solicitada
 */
function groupByDimension(
    rows: Record<string, any>[],
    dimCol: string,
    metricCol?: string,
    agg: AggregationFn = 'SUM'
): GroupItem[] {
    const isComposite = dimCol.includes(' / ') || dimCol.includes(',');
    const dimCols = isComposite ? dimCol.split(/[\/,]/).map(c => c.trim()).filter(Boolean) : [dimCol];
    const map = new Map<string, number[]>();

    for (const r of rows) {
        let label = '';
        if (isComposite) {
            const parts = dimCols.map(c => {
                const val = r[c];
                return val !== null && val !== undefined && String(val).trim() !== '' ? String(val).trim() : '(En Blanco)';
            });
            label = parts.join(' / ');
        } else {
            const rawDim = r[dimCol];
            label = rawDim !== null && rawDim !== undefined && String(rawDim).trim() !== ''
                ? String(rawDim).trim()
                : '(En Blanco)';
        }

        let numVal = 1;
        if (metricCol) {
            const parsed = Number(r[metricCol]);
            numVal = !isNaN(parsed) && isFinite(parsed) ? parsed : 0;
        }

        if (!map.has(label)) {
            map.set(label, []);
        }
        map.get(label)!.push(numVal);
    }

    const result: GroupItem[] = [];
    for (const [label, vals] of map.entries()) {
        let val = 0;
        if (agg === 'COUNT') {
            val = vals.length;
        } else if (agg === 'SUM') {
            val = vals.reduce((a, b) => a + b, 0);
        } else if (agg === 'AVG') {
            val = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        } else if (agg === 'MIN') {
            val = vals.length > 0 ? Math.min(...vals) : 0;
        } else if (agg === 'MAX') {
            val = vals.length > 0 ? Math.max(...vals) : 0;
        }

        result.push({
            label,
            value: Math.round(val * 100) / 100,
            count: vals.length
        });
    }

    return result;
}

/**
 * Ordena los grupos por dimensión o métrica
 */
function sortGroups(groups: GroupItem[], sortBy?: 'dimension' | 'metric', sortOrder?: 'asc' | 'desc') {
    const isAsc = sortOrder === 'asc';
    const byMetric = sortBy === 'metric';

    groups.sort((a, b) => {
        if (byMetric) {
            return isAsc ? a.value - b.value : b.value - a.value;
        } else {
            return isAsc ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label);
        }
    });
}

/**
 * Formatea valores numéricos con separadores de miles y decimales
 */
export function formatMetricNumber(val: number, isCurrency = false): string {
    if (isNaN(val)) return '0';
    if (isCurrency || Math.abs(val) >= 1000) {
        return new Intl.NumberFormat('es-CO', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 0
        }).format(val);
    }
    return String(Math.round(val * 100) / 100);
}
