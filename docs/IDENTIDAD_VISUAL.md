# GUÍA DE IDENTIDAD VISUAL Y DISEÑO - KOREX ANALYTICS

---

## 1. CONCEPTO Y DIFERENCIACIÓN VISUAL

**Korex Analytics** posee una personalidad visual moderna, analítica y técnica, distanciándose del diseño de AgenciasNew.

```text
AGENCIASNEW: Azul clásico (#2563eb) • Enfoque administrativo de viajes • Tarjetas comerciales
KOREX ANALYTICS: Azul Petróleo (#0f172a / #1e293b) • Turquesa Eléctrico (#06b6d4 / #0891b2) • Alta Densidad de Datos
```

---

## 2. PALETA DE COLORES OFICIAL

| Token | Nombre del Color | Hex / Valor Tailwind | Uso Principal |
|---|---|---|---|
| `--color-primary-dark` | Azul Petróleo Profundo | `#0f172a` (`slate-900`) | Barra lateral, encabezados maestros, navegación. |
| `--color-primary` | Azul Oscuro Tecnológico | `#1e293b` (`slate-800`) | Superficies principales, tarjetas de métricas. |
| `--color-accent` | Turquesa Analítico | `#06b6d4` (`cyan-500`) | Botones de ejecución, elementos activos, métricas clave. |
| `--color-accent-hover` | Turquesa Intenso | `#0891b2` (`cyan-600`) | Estado hover de botones de acción y enlaces. |
| `--color-background` | Gris Frío Claro | `#f8fafc` (`slate-50`) | Fondo general de la aplicación. |
| `--color-surface` | Blanco Nieve | `#ffffff` | Contenido de tablas, formularios y modales. |
| `--color-text-main` | Carbón Slate | `#0f172a` (`slate-900`) | Tipografía principal y títulos de datos. |
| `--color-text-muted` | Gris Medio | `#64748b` (`slate-50`) | Etiquetas secundarias, placeholders y metadatos. |
| `--color-success` | Verde Esmeralda | `#10b981` (`emerald-500`)| Estado Finalizado con Éxito. |
| `--color-warning` | Ámbar Cálido | `#f59e0b` (`amber-500`) | Advertencias, parámetros faltantes. |
| `--color-error` | Rojo Carmesí | `#ef4444` (`red-500`) | Error de ejecución, fallos de conexión. |

---

## 3. TOKENS DE DISEÑO CSS CENTRALIZADOS

```css
:root {
  --primary: #0f172a;
  --primary-light: #1e293b;
  --accent: #06b6d4;
  --accent-hover: #0891b2;
  --background: #f8fafc;
  --surface: #ffffff;
  --border: #e2e8f0;
  --text: #0f172a;
  --text-muted: #64748b;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #0284c7;
}
```

---

## 4. ESTÁNDAR DE BOTONES Y COMPONENTES

### Botón Principal de Ejecución (`Ejecutar Proceso`)
```tsx
className="px-6 h-12 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
```

### Botón Secundario (`Guardar Preset` / `Exportar`)
```tsx
className="px-5 h-12 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
```

### Badge de Estado de Ejecución
```tsx
// Finalizada
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
  <CheckCircle2 className="w-3.5 h-3.5" /> Finalizada
</span>

// En Ejecución
<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> En ejecución
</span>
```
