---
name: manual-updater
description: Instrucciones y flujo obligatorio para actualizar el Manual de Funcionamiento del Sistema (src/data/manual/modules.ts) cada vez que se agregue o modifique un desarrollo en AgenciasNew
---

# Flujo de Actualización Automática del Manual de Funcionamiento del Sistema

Este Skill define las reglas obligatorias que la IA y los desarrolladores deben seguir **cada vez que se cree, modifique o agregue una nueva opción, tabla maestra, procedimiento (SP), endpoint API o pantalla en el proyecto AgenciasNew**.

---

## 1. Regla Obligatoria tras Finalizar un Desarrollo

Al completar cualquier tarea que implique:
* Crear o modificar una pantalla o pestaña del Dashboard (`src/app/dashboard/*`).
* Crear una nueva tabla maestra o parámetro en el sistema (`SystemParameter`, `Master`, etc.).
* Crear o modificar un Procedimiento Almacenado (`SQL/SP/` o `SQL/Function/`).
* Crear o modificar una API Route (`src/app/api/*`).

**DEBE actualizarse inmediatamente el archivo de datos del manual**:
👉 [`src/data/manual/modules.ts`](file:///f:/Proyectos/AgenciasNew/src/data/manual/modules.ts)

---

## 2. Estándar de Redacción: 100% Funcional (Sin Jerga Técnica)

1. **PROHIBIDO incluir jerga técnica o código SQL en las descripciones del manual**:
   * NO colocar nombres crudos de funciones SQL (ej. NO escribir `fnCotizacionListar()` o `spCotizacionesCrear`).
   * NO mencionar cláusulas de código interno (ej. NO escribir `LEFT JOIN`, `HMAC-SHA256`, `XML XPath`, etc.).
2. **Código Amigable Comercial**:
   * Usar prefijos amigables como `COT-01`, `FAC-01`, `EJE-01`, `REP-01`, `LIC-01` o `MAE-01` a `MAE-XX`.
3. **Lenguaje Operativo**:
   * Escribir siempre en lenguaje descriptivo de negocio orientado al usuario final y administrador de la agencia.

---

## 3. Estructura Obligatoria de Registro en `src/data/manual/modules.ts`

Cada nuevo desarrollo u opción adicionada debe contar con la siguiente estructura completa:

```typescript
{
    code: 'MAE-26',                          // Código amigable comercial
    masterCode: 'NombreMasterBD',            // (Opcional) Código para filtrado automático con fnMasterList()
    name: 'Nombre Claro de la Nueva Opción',
    summary: 'Resumen ejecutivo de una línea sobre lo que realiza la opción.',
    concept: 'Explicación detallada del funcionamiento, propósito contable/comercial y comportamiento.',
    fields: [                                // Tabla de campos, botones y controles
        { 
            name: 'Nombre del Campo / Botón', 
            type: 'Tipo de Control (Texto, Selector, Switch, Imagen, etc.)', 
            description: 'Explicación de qué información requiere y qué hace al interactuar con él.' 
        }
    ],
    businessRules: [                        // Reglas de negocio y restricciones
        'Regla 1: Comportamiento o restricción de seguridad aplicable.'
    ],
    steps: [                                // Flujo operativo paso a paso
        {
            number: 1,
            title: 'Título del Paso 1',
            description: 'Explicación clara de cómo el usuario opera esta nueva función desde la pantalla.'
        }
    ]
}
```

---

## 4. Clasificación por Módulos Registrados

1. **`licensing`**: Licenciamiento y Seguridad (Exclusivo SUPERADMINISTRADOR).
2. **`quotations`**: Cotizaciones, itinerarios, liquidaciones y clientes.
3. **`invoices`**: Facturación de venta e integración Zeus ERP.
4. **`executions`**: Consola interactiva de ejecuciones y consultas.
5. **`reports`**: Reportes gerenciales y analítica.
6. **`config`**: Configuración global, sucursales, usuarios y las 25+ pestañas maestras.

---

## 5. Verificación de Integridad

Tras actualizar `src/data/manual/modules.ts`:
1. Ejecutar la verificación de tipos TypeScript: `npx tsc --noEmit`.
2. Verificar en `http://localhost:3001/dashboard/manual` que la nueva opción se muestre automáticamente con su descripción de campos y pasos.
