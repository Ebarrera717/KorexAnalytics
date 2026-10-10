import { WidgetConfig, WidgetFilter, AggregationFn } from './types';

export interface ProcessedDataResult {
    labels: string[];
    values: number[];
    kpiValue?: number;
    rows?: Record<string, any>[];
    allRows?: Record<string, any>[];
    totalCount: number;
    totalMetricSum?: number;
    totalSumatoria?: number;
    totalTiquetesSum?: number; // compatibilidad
    totalGlobalMetricSum?: number;
    totalGlobalSumatoria?: number;
    totalGlobalTiquetesSum?: number; // compatibilidad
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

        // Agrupar por dimensión (soporta agrupación jerárquica padre-hijo si es compuesta como Usuario / TipoServicio)
        const groups = groupByDimension(filteredRows, widget.dimensionColumn, widget.metricColumn, widget.aggregation);
        sortGroups(groups, widget.sortBy, widget.sortOrder);
        
        // Totales globales de toda la consulta (100% de la base de datos)
        const totalGlobalMetricSum = groups.reduce((acc, g) => acc + (g.value > 0 ? g.value : 0), 0);
        const totalGlobalSumatoria = groups.reduce((acc, g) => acc + g.count, 0);

        // Subconjunto según Top N seleccionado (ej: Top 20)
        const sliced = widget.topN && widget.topN > 0 ? groups.slice(0, widget.topN) : groups;
        const totalMetricSum = sliced.reduce((acc, g) => acc + (g.value > 0 ? g.value : 0), 0);
        const totalSumatoria = sliced.reduce((acc, g) => acc + g.count, 0);

        const mapRow = (g: GroupItem) => {
            const pct = totalGlobalMetricSum > 0 ? (g.value / totalGlobalMetricSum) * 100 : 0;
            const pctSum = totalGlobalSumatoria > 0 ? (g.count / totalGlobalSumatoria) * 100 : 0;

            const mappedChildren = g.children?.map(ch => {
                const chPct = totalGlobalMetricSum > 0 ? (ch.value / totalGlobalMetricSum) * 100 : 0;
                const chPctSum = totalGlobalSumatoria > 0 ? (ch.count / totalGlobalSumatoria) * 100 : 0;
                return {
                    [widget.dimensionColumn!]: ch.label,
                    [widget.metricColumn || 'conteo']: ch.value,
                    registros: ch.count,
                    sumatoria: ch.count,
                    sumatoriaTiquetes: ch.count, // compat
                    porcentaje: Math.round(chPct * 100) / 100,
                    porcentajeSumatoria: Math.round(chPctSum * 100) / 100,
                    porcentajeTiquetes: Math.round(chPctSum * 100) / 100, // compat
                    isChild: true
                };
            });

            return {
                [widget.dimensionColumn!]: g.label,
                [widget.metricColumn || 'conteo']: g.value,
                registros: g.count,
                sumatoria: g.count,
                sumatoriaTiquetes: g.count, // compat
                porcentaje: Math.round(pct * 100) / 100,
                porcentajeSumatoria: Math.round(pctSum * 100) / 100,
                porcentajeTiquetes: Math.round(pctSum * 100) / 100, // compat
                isParentGroup: !!g.isParentGroup,
                children: mappedChildren
            };
        };

        const allRows = groups.map(mapRow);
        const rows = sliced.map(mapRow);

        return {
            labels: sliced.map(g => g.label),
            values: sliced.map(g => g.value),
            rows,
            allRows,
            totalCount: groups.length,
            totalMetricSum,
            totalSumatoria,
            totalTiquetesSum: totalSumatoria,
            totalGlobalMetricSum,
            totalGlobalSumatoria,
            totalGlobalTiquetesSum: totalGlobalSumatoria
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

interface GroupChildItem {
    label: string;
    value: number;
    count: number;
}

interface GroupItem {
    label: string;
    value: number;
    count: number;
    isParentGroup?: boolean;
    children?: GroupChildItem[];
}

/**
 * Calcula agregación sobre un arreglo de números
 */
function aggregateNumberArray(vals: number[], agg: AggregationFn): number {
    if (agg === 'COUNT') return vals.length;
    if (agg === 'SUM') return vals.reduce((a, b) => a + b, 0);
    if (agg === 'AVG') return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    if (agg === 'MIN') return vals.length > 0 ? Math.min(...vals) : 0;
    if (agg === 'MAX') return vals.length > 0 ? Math.max(...vals) : 0;
    return vals.length;
}

/**
 * Agrupa filas por una dimensión (simple o compuesta separada por / o ,) y calcula la agregación solicitada
 * Si es compuesta (ej: Usuario / TipoServicio), agrupa jerárquicamente: el usuario aparece una sola vez
 * como padre y dentro de él sus tipos de servicios detallados.
 */
function groupByDimension(
    rows: Record<string, any>[],
    dimCol: string,
    metricCol?: string,
    agg: AggregationFn = 'SUM'
): GroupItem[] {
    const isComposite = dimCol.includes(' / ') || dimCol.includes(',');
    const dimCols = isComposite ? dimCol.split(/[\/,]/).map(c => c.trim()).filter(Boolean) : [dimCol];

    // Caso Jerárquico: Dimensión compuesta (ej. Usuario / TipoServicio)
    if (isComposite && dimCols.length >= 2) {
        const parentCol = dimCols[0];
        const childCols = dimCols.slice(1);

        // parentLabel -> { allVals: number[], childMap: Map<childLabel, number[]> }
        const parentMap = new Map<string, { allVals: number[]; childMap: Map<string, number[]> }>();

        for (const r of rows) {
            const rawParent = r[parentCol];
            const parentLabel = rawParent !== null && rawParent !== undefined && String(rawParent).trim() !== ''
                ? String(rawParent).trim()
                : '(En Blanco)';

            const childParts = childCols.map(c => {
                const val = r[c];
                return val !== null && val !== undefined && String(val).trim() !== '' ? String(val).trim() : '(En Blanco)';
            });
            const childLabel = childParts.join(' / ');

            let numVal = 1;
            if (metricCol) {
                const parsed = Number(r[metricCol]);
                numVal = !isNaN(parsed) && isFinite(parsed) ? parsed : 0;
            }

            if (!parentMap.has(parentLabel)) {
                parentMap.set(parentLabel, { allVals: [], childMap: new Map() });
            }
            const pEntry = parentMap.get(parentLabel)!;
            pEntry.allVals.push(numVal);

            if (!pEntry.childMap.has(childLabel)) {
                pEntry.childMap.set(childLabel, []);
            }
            pEntry.childMap.get(childLabel)!.push(numVal);
        }

        const result: GroupItem[] = [];
        for (const [pLabel, pEntry] of parentMap.entries()) {
            const parentVal = aggregateNumberArray(pEntry.allVals, agg);
            const children: GroupChildItem[] = [];

            for (const [cLabel, cVals] of pEntry.childMap.entries()) {
                const childVal = aggregateNumberArray(cVals, agg);
                children.push({
                    label: cLabel,
                    value: Math.round(childVal * 100) / 100,
                    count: cVals.length
                });
            }

            // Ordenar hijos por valor descendente por defecto
            children.sort((a, b) => b.value - a.value || b.count - a.count);

            result.push({
                label: pLabel,
                value: Math.round(parentVal * 100) / 100,
                count: pEntry.allVals.length,
                isParentGroup: true,
                children
            });
        }

        return result;
    }

    // Caso Simple: Dimensión única
    const map = new Map<string, number[]>();

    for (const r of rows) {
        const rawDim = r[dimCol];
        const label = rawDim !== null && rawDim !== undefined && String(rawDim).trim() !== ''
            ? String(rawDim).trim()
            : '(En Blanco)';

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
        const val = aggregateNumberArray(vals, agg);
        result.push({
            label,
            value: Math.round(val * 100) / 100,
            count: vals.length
        });
    }

    return result;
}

/**
 * Ordena los grupos por dimensión o métrica (y sus hijos si los tiene)
 */
function sortGroups(groups: GroupItem[], sortBy?: 'dimension' | 'metric', sortOrder?: 'asc' | 'desc') {
    const isAsc = sortOrder === 'asc';
    const byMetric = sortBy === 'metric';

    groups.sort((a, b) => {
        if (byMetric) {
            return isAsc ? a.value - b.value : b.value - a.value;
        } else {
            return isAsc 
                ? a.label.localeCompare(b.label, 'es', { numeric: true }) 
                : b.label.localeCompare(a.label, 'es', { numeric: true });
        }
    });

    // Ordenar hijos también
    for (const g of groups) {
        if (g.children && g.children.length > 0) {
            g.children.sort((a, b) => {
                if (byMetric) {
                    return isAsc ? a.value - b.value : b.value - a.value;
                } else {
                    return isAsc 
                        ? a.label.localeCompare(b.label, 'es', { numeric: true }) 
                        : b.label.localeCompare(a.label, 'es', { numeric: true });
                }
            });
        }
    }
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
