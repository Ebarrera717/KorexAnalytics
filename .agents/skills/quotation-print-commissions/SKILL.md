---
name: quotation-print-commissions
description: Reglas generales de arquitectura y patrones abstractos para el manejo dinámico de reportes, reemplazo universal de tablas estáticas en plantillas HTML y precisión de valores financieros en AgenciasNew.
---

# Skill General: Generación de Reportes, Cálculo Financiero y Reemplazo Dinámico de Plantillas

Esta Skill establece los **principios generales y universales de arquitectura** para la generación de reportes impresos, reemplazo de tablas dinámicas y preservación de precisión financiera en AgenciasNew.

---

## 1. Principio General de Presentación de Valores Financieros (`public.fnRptCotizacion`)

En cualquier vista, función de reporte o documento impreso del sistema:
- **Consistencia de Valores Comerciales (VALOR BASE)**: Las columnas representativas de importes base de venta (ejemplo: `tarifaNeta` / `VALOR BASE`) deben retornar **siempre el valor comercial total de venta del producto (`qp.price`)** configurado en la aplicación, evitando divisiones de costos netos por número de pasajeros o tarifas unitarias de proveedores.
- **Jerarquía de Coalescencia**:
  ```sql
  COALESCE(NULLIF(qp.price, 0), qpt_explicit_amount_sum, qp.cost, 0)::double precision AS "tarifaNeta"
  ```
- **Integridad Relacional (`LEFT JOIN`)**: Toda consulta de encabezados e ítems debe usar obligatoriamente `LEFT JOIN` hacia tablas hijas y maestras (`QuotationProduct`, `Client`, `User`, `Branch`, `Implant`). NUNCA usar `INNER JOIN` para evitar la ocultación accidental de documentos o registros en reportes.

---

## 2. Patron Universal de Reemplazo Dinámico de Tablas en HTML (`export-excel/route.ts`)

Al procesar plantillas impresas HTML cargadas desde bases de datos o conversiones de hojas de cálculo Excel que contengan filas estáticas o de prueba:

- **Colapso Multifila Mediante Expresiones Regulares**: Para evitar la duplicación de filas cuando una plantilla almacena múltiples registros estáticos o de muestra, el patrón de búsqueda DEBE capturar **desde la fila del encabezado hasta el cierre del cuerpo de la tabla (`</tbody>` o `</table>`)**, reemplazando $N$ filas de muestra por una única estructura dinámica tipada:
  ```ts
  const tablePattern = /(HEADER_PATTERN[\s\S]*?<\/tr>)([\s\S]*?)(<\/tbody>|<\/table>)/i;
  compiledHtml = compiledHtml.replace(tablePattern, (match, headerRow, oldRows, closingTag) => {
      return headerRow + singleDynamicRow + closingTag;
  });
  ```
- **Pasarela Universal de Personalizaciones**: Todo motor de renderizado de reportes debe procesar los tokens de reemplazo (`{{variable}}`) independientemente de si el documento utiliza una plantilla predeterminada o una plantilla personalizada guardada por el usuario.

---

## 3. Principio General de Preservación de Directorios en Scripts de Empaquetado (`Generar_Empaquetado.ps1`)

Al automatizar la copia de artefactos de compilación (como la estructura de Next.js standalone `.next/server` y `.next/static`):

- **Verificación Previa de Directorios Destino**: Se debe verificar y crear explícitamente cualquier directorio destino de subcarpetas estáticas antes de ejecutar comandos de copia de archivos masivos (`Copy-Item` en PowerShell):
  ```powershell
  if (-not (Test-Path "$ReleaseDir\.next\static")) { 
      New-Item -ItemType Directory -Path "$ReleaseDir\.next\static" -Force | Out-Null 
  }
  Copy-Item ".\.next\static\*" -Destination "$ReleaseDir\.next\static" -Recurse -Force
  ```
- *Propósito General*: Evita que comandos de copia de sistema operativo interpreten rutas relativas como nombres de archivo y destruyan carpetas del servidor adyacentes (prevención universal de errores `ENOENT` por archivos descalzados en producción).

---

## 4. Script General de Mantenimiento de Plantillas en BD

Sentencia genérica para sanear y actualizar cualquier plantilla desfasada en PostgreSQL:

```sql
UPDATE public."QuotationPrintDefaultTemplate"
SET html = regexp_replace(
    html,
    '(% COMI?SI[OÓ]N COLAREO[\s\S]*?TOTAL COMI?SI[OÓ]N[\s\S]*?<\/tr>)([\s\S]*?)(<\/tbody>|<\/table>)',
    '\1<tr><td style="padding: 4px;">{{comisionPropiaPercentage}}</td><td style="padding: 4px;">{{comisionPropiaValue}}</td><td style="padding: 4px;">{{comisionFreelancePercentage}}</td><td style="padding: 4px;">{{comisionFreelanceValue}}</td><td style="padding: 4px;">{{utilidad}}</td></tr>\3',
    'i'
)
WHERE html ILIKE '%COMISION COLAREO%';
```
