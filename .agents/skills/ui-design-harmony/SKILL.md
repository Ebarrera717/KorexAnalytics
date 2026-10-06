---
name: ui-design-harmony
description: Reglas y guía obligatoria de diseño de UI, tokens de colores, tipografía, iconos y estándar de botones en AgenciasNew.
---

# Skill de Validación de Diseño de UI - AgenciasNew

Este documento establece las directrices universales, tokens de estilo y reglas de consistencia de la interfaz de usuario (UI) para garantizar una experiencia visual 100% armónica, pulida y coherente en todos los módulos de AgenciasNew.

---

## 1. Reglas Generales de Botones

Todos los botones de la plataforma DEBEN utilizar exactamente el mismo patrón de clases Tailwind para la misma categoría de acción.

### A. Botón Principal de Creación / Acción Primaria (`+ Nuevo ...` / `+ Crear ...` / `+ Nueva ...`)
- **Propósito**: Botón de acción principal en el encabezado de las pantallas (ej. *+ Nuevo Registro*, *+ Nueva Pre-Cotización*, *+ Nueva Cotización*, *+ Nueva Factura*).
- **Clases Tailwind Obligatorias**:
  ```tsx
  className="px-5 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
  ```
- **Icono**: `<Plus className="w-5 h-5" />` (o icono principal de la acción con tamaño `w-5 h-5`).
- **Prohibición**: Queda strictly prohibido usar colores arbitrarios o no estándar como negro (`bg-zinc-900`), naranja (`bg-amber-500`), verde o tamaños dispares (`h-14`, `h-11`, `text-xs`) en botones de creación principal.

### B. Botones Secundarios / Imprimir / Carga Masiva / Filtros
- **Propósito**: Acciones secundarias o complementarias en el encabezado o barras de herramientas.
- **Clases Tailwind Obligatorias**:
  ```tsx
  className="px-5 h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-bold rounded-xl text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
  ```

### C. Botones de Confirmación en Modales (*Guardar*, *Confirmar Registro*)
- **Propósito**: Botón de acción principal dentro de modales de creación o edición.
- **Clases Tailwind Obligatorias**:
  ```tsx
  className="px-6 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
  ```

### D. Botones de Cancelar / Descartar / Peligro
- **Propósito**: Descartar cambios o eliminar registros.
- **Clases Tailwind Obligatorias (Cancelar/Descartar)**:
  ```tsx
  className="px-6 h-12 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-bold rounded-xl text-sm transition-all cursor-pointer"
  ```
- **Clases Tailwind Obligatorias (Eliminar/Peligro)**:
  ```tsx
  className="px-6 h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm shadow-md shadow-red-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
  ```

---

## 2. Reglas de Iconografía y Navegación

1. **Barra Lateral (Sidebar)**:
   - Los iconos de los ítems de navegación inactivos usan el tamaño unificado `<Icon className="w-5 h-5" />` sin colores de texto estáticos ni estridentes (como `text-amber-400` o `text-blue-400`).
   - El estado activo resalta el contenedor con `bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400`.

2. **Tarjetas de Selección de Maestros (`settings/page.tsx`)**:
   - Todos los iconos de pestañas o módulos maestros usan el tamaño unificado `w-4 h-4` y color armónico con la tipografía. Queda prohibido asignar colores estridentes a tarjetas individuales salvo que indiquen un estado dinámico (alerta/error).

---

## 3. Regla Obligatoria de Columna "ACCIONES" en Tablas de Datos (`[ : Acciones ]`)

Queda **estrictamente prohibido** colocar iconos horizontales sueltos (`FileCode`, `Printer`, `Edit2`, `Trash2`, etc.) directamente sobre la celda de la columna `ACCIONES` en las tablas de listados.

Todas las tablas de listados del sistema (*Cotizaciones*, *Historial de Cotizaciones*, *Facturación*, *Pre-Cotizaciones*, *Ejecuciones*, *Reportes*, *Maestros*) **DEBEN utilizar exclusivamente el botón desplegable unificado `[ : Acciones ]`**:

### A. Estructura del Botón Desplegable `[ : Acciones ]`
```tsx
<button
    onClick={(e) => {
        e.stopPropagation();
        setActiveMenuId(activeMenuId === row.id ? null : row.id);
    }}
    className="p-1.5 px-3 text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 rounded-xl transition-all font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
    title="Opciones"
>
    <MoreVertical className="w-4 h-4" />
    <span>Acciones</span>
</button>
```

### B. Estructura del Menú Flotante de Opciones
Debe desplegarse con un backdrop invisible para cerrar al hacer clic afuera y un contenedor animado con `AnimatePresence`:
```tsx
<AnimatePresence>
    {activeMenuId === row.id && (
        <>
            <div
                className="fixed inset-0 z-20 cursor-default"
                onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(null);
                }}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute right-6 top-12 z-30 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-1.5 space-y-0.5 text-left"
            >
                {/* Opciones tipadas con iconos y colores estandarizados */}
            </motion.div>
        </>
    )}
</AnimatePresence>
```

---

## 4. Lista de Verificación Pre-Entrega
- [ ] ¿Todos los botones de creación principal (+ Nuevo...) usan `bg-blue-600`, `h-12`, `px-5`, `rounded-xl`, `text-sm font-bold`?
- [ ] ¿Toda tabla de listado utiliza el botón desplegable `[ : Acciones ]` con `MoreVertical` en lugar de iconos horizontales sueltos?
- [ ] ¿Los iconos en la barra lateral mantienen un estilo limpio sin colores discordantes en estado inactivo?
- [ ] ¿Los modales usan el botón principal de confirmación azul y el secundario neutro/gris?
