---
name: zeus-external-db-protection
description: Regla de arquitectura crítica para tratar la base de datos Zeus ERP (ZeusAgencias_23) como una base externa e inmutable. Korex NUNCA debe modificar, alterar ni ejecutar ALTER/DROP/DELETE sobre objetos nativos existentes de Zeus ERP.
---

# Regla de Arquitectura y Protección Inviolable de Base de Datos Externa Zeus ERP (`zeus-external-db-protection`)

## 1. Principio Fundamental: Zeus ERP es una Base Externa Inmutable
- La base de datos de interfase de Zeus ERP (`ZeusAgencias_23`) es una **BASE DE DATOS EXTERNA** al sistema Korex y debe considerarse **INMUTABLE**.
- Korex NUNCA debe modificar, alterar, eliminar, reemplazar, recrear ni intervenir directamente sobre los objetos nativos existentes de Zeus ERP (tales como `spza_Factura_Crear`, `spza_Factura_Contabilizar`, `spza_Servicio_Vender`, `fac_factura`, `fac_servicios`, `TRANSAC`, etc.).
- Regla de oro: **Korex se adapta a Zeus ERP. Zeus ERP NO se adapta a Korex.**

---

## 2. Prohibición Absoluta de Modificaciones sobre Objetos Nativos de Zeus ERP
Queda estrictamente PROHIBIDO ejecutar desde Korex:
- `ALTER PROCEDURE` sobre Stored Procedures nativos de Zeus ERP (ej. `spza_Factura_Contabilizar`, `spza_Factura_Crear`, `spza_Servicio_Vender`).
- `ALTER TABLE`, `DROP TABLE`, `DELETE`, `TRUNCATE` sobre tablas nativas de Zeus ERP.
- `ALTER FUNCTION`, `DROP FUNCTION` sobre funciones nativas de Zeus ERP.
- `ALTER VIEW`, `DROP VIEW` sobre vistas nativas de Zeus ERP.
- Modificar triggers, índices, constraints o columnas nativas existentes.

---

## 3. Uso Exclusivo de Objetos Propios de Integración Korex
- Cuando sea necesario ejecutar lógica dentro de la base de datos de Zeus ERP para la integración, se deben usar **ESTRICTAMENTE PROCEDIMIENTOS ALMACENADOS PROPIOS DE KOREX/INTEGRACIÓN** (`spFacturacionesCrear`, `spCotizacionesCrear`).
- Los procedimientos propios de integración:
  1. Tienen nombres claramente identificables (`spFacturacionesCrear`, `spCotizacionesCrear`).
  2. Residen en `SQL/ZeusERP/` y son los ÚNICOS scripts autorizados para crearse o actualizarse.
  3. NUNCA alteran ni reemplazan SPs nativos de Zeus ERP.
  4. Reciben datos de Korex en formato XML e interactúan con la base externa mediante llamadas estándar o inserción autorizada.

---

## 4. Verificación Automatizada y Aislamiento de Despliegue
- `deploy/sync_zeus_erp.js` y `node scripts/validate_zeus_sps.js` deben verificar que únicamente los SPs propios de integración (`spFacturacionesCrear`, `spCotizacionesCrear`) sean sincronizados.
- Ninguna migración, actualizador o instalador debe modificar la estructura de objetos nativos de Zeus ERP.
