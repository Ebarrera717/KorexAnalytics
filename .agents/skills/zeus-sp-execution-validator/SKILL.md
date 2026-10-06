---
name: zeus-sp-execution-validator
description: Protocolo y regla universal para la identificación obligatoria de la base de datos activa de Zeus ERP (Parámetro BaseSQLServer -> ZeusAgencias_23, NUNCA Korex_pruebas) y la validación automatizada de Stored Procedures (spFacturacionesCrear, spCotizacionesCrear) al finalizar cualquier desarrollo.
---

# Skill: Validación y Ejecución Obligatoria de Procedimientos en Zeus ERP (`zeus-sp-execution-validator`)

Este Skill establece el protocolo y las directrices obligatorias de arquitectura para garantizar que todo Stored Procedure (SP) o función destinado a Zeus ERP sea compilado, inyectado y validado en la **Base de Datos Externa Real de Zeus ERP** (`BaseSQLServer`), prohibiendo estrictamente confusiones con la base interna de pruebas de Korex (`Korex_pruebas`).

---

## 1. Principio Fundamental: Separación Estricta de Bases de Datos

En el ecosistema AgenciasNew conviven dos bases de datos en SQL Server con roles completamente diferentes:

1. **Base Principal de Korex (`Korex_pruebas` / `DATABASE_URL_SQLSERVER` en `.env`)**:
   - Almacena la operación interna, maestros, usuarios, cotizaciones, facturas, movimientos y auditoría de Korex.
   - **NUNCA contiene las tablas operativas internas del ERP Zeus** (`FacturasItems`, `CotizacionServicios`, etc.).
   - **PROHIBIDO** inyectar o ejecutar los SPs de integración de Zeus ERP (`spFacturacionesCrear`, `spCotizacionesCrear`) en esta base de datos.

2. **Base Externa Protegida de Zeus ERP (`ZeusAgencias_23` / Parámetro `BaseSQLServer`)**:
   - Es la base de datos real del ERP Zeus configurada en **Parámetros del Sistema (`/dashboard/settings` -> `BaseSQLServer`)**.
   - En este entorno es **`ZeusAgencias_23`**.
   - Aquí residen los procedimientos `dbo.spza_Factura_Crear`, `dbo.spza_Cotizacion_Crear`, `dbo.spza_Servicio_Vender` y sus tablas correspondientes.
   - **TODO Stored Procedure de exportación hacia Zeus ERP (`spFacturacionesCrear`, `spCotizacionesCrear`) DEBE residir y ejecutarse única y exclusivamente en esta base de datos.**

```text
┌──────────────────────────────────────────────────────────────────┐
│                   MAPA DE BASES DE DATOS SQL SERVER              │
├─────────────────────────────────┬────────────────────────────────┤
│ Base Interna Korex              │ Base Externa Zeus ERP          │
│ (Korex_pruebas)                 │ (ZeusAgencias_23)              │
├─────────────────────────────────┼────────────────────────────────┤
│ • Operación interna de Korex    │ • Motor oficial de Zeus ERP    │
│ • Tablas Prisma / Maestros      │ • dbo.spFacturacionesCrear     │
│ • Importación Excel             │ • dbo.spCotizacionesCrear      │
│ • NO ejecutar SPs de Zeus ERP   │ • Configurada en BaseSQLServer │
└─────────────────────────────────┴────────────────────────────────┘
```

---

## 2. Regla Obligatoria de Finalización de Desarrollo

Cada vez que se complete un desarrollo, corrección o ajuste que involucre integración con Zeus ERP, procedimientos almacenados en `SQL/ZeusERP/`, o tablas contables:

1. **Compilación e Inyección Inmediata en Zeus ERP**:
   Se debe ejecutar el compilador e inyector específico hacia la base de Zeus ERP (`ZeusAgencias_23`):
   ```bash
   node scripts/validate_zeus_sps.js
   ```

2. **Verificación de Presencia (Error T-SQL #2812)**:
   El script verifica automáticamente que tanto `dbo.spFacturacionesCrear` como `dbo.spCotizacionesCrear` existan (`OBJECT_ID(...) IS NOT NULL`) y compilen sin errores en `ZeusAgencias_23`. Si alguno falta o falló en la compilación, lo repara e inyecta inmediatamente.

3. **Garantía Pre-Prueba**:
   Queda estrictamente **PROHIBIDO** indicar al usuario que un desarrollo está listo o probar la exportación desde la interfaz web sin haber ejecutado `node scripts/validate_zeus_sps.js` con resultado exitoso (`Estado: 0`).

---

## 3. Integración en el Pipeline Automatizado

El validador de SPs de Zeus ERP forma parte integral del flujo de verificación general de AgenciasNew:
- `node scripts/validate_zeus_sps.js`: Auditoría e inyección específica en `ZeusAgencias_23`.
- `node deploy/gen_schema_json.js`: Compilación dual PostgreSQL + SQL Server.
- `node scripts/validate_full_suite.js`: Suite completa de 11 capas de verificación.

---

## 4. Checklist de Validación del Skill

- [ ] ¿Se verificó que el SP objetivo pertenezca a la carpeta `SQL/ZeusERP/`?
- [ ] ¿Se garantizó que la base destino sea la configurada en `BaseSQLServer` (`ZeusAgencias_23`) y NO `Korex_pruebas`?
- [ ] ¿Se ejecutó `node scripts/validate_zeus_sps.js` y arrojó `✅ [OK]: 'dbo.spFacturacionesCrear'` y `✅ [OK]: 'dbo.spCotizacionesCrear'`?
- [ ] ¿Se probó la exportación real con `Estado: 0` antes de dar por terminada la tarea?
