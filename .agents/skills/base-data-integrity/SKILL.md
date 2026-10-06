---
name: base-data-integrity
description: Protocolo obligatorio y reglas de prevención para garantizar la sintaxis limpia de DDL SQL, integridad de Prisma ORM y la carga 100% libre de errores en los filtros y desplegables de Cotizaciones y Facturación (base-data).
---

# Regla Universal de Integridad de Datos Base y Desplegables - AgenciasNew

Este Skill define las reglas y el protocolo de prevención estricto para evitar que los desplegables, maestros y filtros de las pantallas de **Cotizaciones (`/dashboard/quotations/new`)** y **Facturación (`/dashboard/invoices/new`)** queden en blanco o devuelvan errores HTTP 500.

---

## 1. Causa Raíz Identificada

1. **Sintaxis DDL Errónea en SQL**: Sentencias `IF NOT EXISTS` sueltas o `CREATE TABLE` truncados fuera de bloques PL/pgSQL `DO $$ BEGIN ... END $$;` en [`SQL/Table/Alter_New_Columns.sql`](file:///f:/Proyectos/AgenciasNew/SQL/Table/Alter_New_Columns.sql). Esto causaba que PostgreSQL abortara la ejecución del script.
2. **Columnas Faltantes en Introspección**: Si la columna (ejemplo: `"isActive"`) no se agrega a PostgreSQL ni se sincroniza en `prisma/schema.prisma`, Prisma ORM falla en runtime con `Unknown argument isActive`.
3. **Falla de API en Cascada (HTTP 500)**: La API `/api/quotations/base-data` arrojaba error 500, haciendo que los componentes desplegables (Cliente, Sucursal, Implant, Vendedor, Tiqueteador, Destino, Moneda, Impuestos) en el frontend recibieran arreglos vacíos `[]`.

---

## 2. Protocolo Obligatorio de Desarrollo (Regla de 4 Capas)

### Capa 1: Sintaxis DDL Estricta en `Alter_New_Columns.sql`
- **Uso Obligatorio de `DO $$ BEGIN ... END $$;`**: Toda sentencia PL/pgSQL (`IF NOT EXISTS...`, `FOREACH...`, etc.) DEBE estar estrictamente contenida dentro del bloque universal de PL/pgSQL.
- **Inclusión Universal de Maestros**: Al agregar una columna compartida (como `"isActive"`), se DEBE verificar que la tabla objetivo esté declarada en el array de tablas universales `tables TEXT[]` en `Alter_New_Columns.sql`:
  ```sql
  tables TEXT[] := ARRAY[
      'ChargeAndTax', 'Client', 'User', 'Branch', 'Implant', 'Provider', 'Prestadora',
      'Seller', 'Product', 'Airport', 'City', 'Country', 'CreditCard',
      'Currency', 'MasterVariable', 'ProviderType', 'Combo',
      'TicketType', 'TicketPrinter', 'Payment', 'DocumentResolution', 'TransactionConsecutive',
      'QuotationState', 'QuotationFormat', 'InterfaceExtractParam'
  ];
  ```

### Capa 2: Prisma Schema & Regeneración (`npx prisma generate`)
- Declarar la columna en el modelo correspondiente en [`prisma/schema.prisma`](file:///f:/Proyectos/AgenciasNew/prisma/schema.prisma) (ejemplo: `isActive Boolean @default(true)`).
- Ejecutar la sincronización y regeneración de cliente:
  ```bash
  node deploy/gen_schema_json.js
  ```

### Capa 3: Manejo Seguro de Nulos en Prisma Queries (`where: { isActive: { not: false } }`)
- En APIs de carga inicial como [`/api/quotations/base-data`](file:///f:/Proyectos/AgenciasNew/src/app/api/quotations/base-data/route.ts) e [`/api/invoices/base-data`](file:///f:/Proyectos/AgenciasNew/src/app/api/invoices/base-data/route.ts), utilizar siempre filtros defensivos que soporten registros antiguos donde el campo pueda ser `NULL` o `TRUE`:
  ```ts
  (prisma as any).implant?.findMany({
      where: { isActive: { not: false } },
      select: { id: true, code: true, name: true, branchId: true }
  })
  ```

### Capa 4: Verificación Obligatoria Pre-Entrega (Prueba Sintética HTTP 200)
- Antes de dar por concluida cualquier tarea o desarrollo, se DEBE ejecutar la siguiente prueba automatizada local para confirmar que `/api/quotations/base-data` responda con **HTTP 200** y conteos positivos en todos sus catálogos:
  ```bash
  node -e "fetch('http://localhost:3001/api/quotations/base-data').then(r=>r.json()).then(console.log)"
  ```
- Se debe verificar que devuelva un objeto estructurado con `branches`, `providers`, `products`, `sellers`, `implants`, `quotationStates`, `taxes`, `cities` y `parameters` **SIN ERRORES**.

---

## 3. Lista de Comprobación Pre-Commit (Checklist Anti-Fallas)

- [ ] ¿`Alter_New_Columns.sql` ejecutó sin advertencias ni syntax errors en PostgreSQL local?
- [ ] ¿El modelo de Prisma en `prisma/schema.prisma` contiene los campos nuevos declarados?
- [ ] ¿Se ejecutó `node deploy/gen_schema_json.js`?
- [ ] ¿Se probó la API `/api/quotations/base-data` y devolvió `200 OK` con todos los catálogos llenos?
