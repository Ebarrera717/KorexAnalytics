export type WidgetType = 'kpi' | 'bar' | 'line' | 'pie' | 'doughnut' | 'area' | 'pivot_table';

export type AggregationFn = 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX';

export interface WidgetFilter {
    column: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater' | 'less';
    value: string | number;
}

export interface WidgetConfig {
    id: string;
    title: string;
    type: WidgetType;
    dimensionColumn?: string;      // Campo para Eje X / Categoría
    metricColumn?: string;         // Campo numérico para Eje Y / Cálculo
    aggregation: AggregationFn;    // Función de agregación
    sortBy?: 'dimension' | 'metric';
    sortOrder?: 'asc' | 'desc';
    topN?: number;                 // Limitar a Top 5, 10, 15... (0 = todos)
    colorPalette?: string;         // 'cyan' | 'blue' | 'emerald' | 'amber' | 'violet' | 'multi'
    kpiIcon?: string;              // Nombre de icono para KPI
    width?: 'full' | 'half' | 'third' | 'quarter'; // Tamaño en grilla
    height?: number;               // Altura personalizada en px (opcional)
    showPercentage?: boolean;      // Mostrar columna y cálculo de % de participación
    percentageBase?: number;       // Base total para calcular el porcentaje
    filters?: WidgetFilter[];      // Filtros a nivel de widget
}

export interface DashboardConfig {
    id?: number;
    procedureId: number;
    userId?: number;
    name: string;
    description?: string;
    isDefault?: boolean;
    widgets: WidgetConfig[];
    globalFilters?: {
        dateColumn?: string;
        dateFrom?: string;
        dateTo?: string;
        categoryColumn?: string;
        selectedCategories?: string[];
    };
}
