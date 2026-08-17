# ATLAS — Registro Maestro de Desarrollo

Bitácora viva para separar con precisión lo diseñado, implementado, probado, desplegado y verificado en producción.

## Convención de estados
- **DISEÑADO**: arquitectura o experiencia definida.
- **IMPLEMENTADO**: código incorporado al repositorio canónico.
- **PROBADO**: validaciones disponibles ejecutadas o revisión técnica verificable completada.
- **DESPLEGADO**: un proveedor aceptó la nueva versión.
- **VERIFICADO EN PRODUCCIÓN**: la URL real respondió con la nueva implementación.
- **BLOQUEADO**: existe una dependencia externa que impide avanzar a la siguiente etapa.

## 2026-08-17 — ATLAS Voice: auditoría previa a nuevos cambios

**Objetivo:** verificar la ruta canónica de ATLAS Voice antes de continuar con nuevas superficies.

**Revisión técnica realizada:**
- La ruta canónica existente es `/platform/settings/voice`; `/voice` funciona como alias/redirect según el validador de producción.
- La implementación canónica exige sesión, bloquea cámara/micrófono/geolocalización por política, no usa `getUserMedia`, utiliza `speechSynthesis` local cuando el navegador lo soporta y persiste preferencias en `localStorage`.
- Existen validadores dedicados: `scripts/validate-voice-settings.mjs` y `scripts/verify-voice-production.mjs`.
- El copy canónico indica correctamente que las preferencias se conservan en el navegador y que el micrófono no se activa desde esa pantalla.

**Limitaciones verificadas:**
- La auditoría visual en vivo del proyecto Lovable `/voice` no pudo ejecutarse mediante su agente porque el workspace se encuentra sin créditos.
- La ruta de despliegue automática de GitHub Actions continúa fallando antes de ejecutar pasos; el job más reciente no inició ningún step.
- Desde el runtime actual no fue posible resolver DNS directamente para realizar una prueba HTTP externa independiente de la URL canónica.

**Estado:** IMPLEMENTADO en el repositorio canónico; revisión estática completada. VERIFICACIÓN VISUAL EN PRODUCCIÓN todavía pendiente.

## 2026-08-17 — ATLAS Financial Intelligence desde especificación visual

**Objetivo:** transformar la referencia visual de ATLAS Financial Intelligence en una superficie de software real, sin usar la imagen como captura sustituta ni presentar números ficticios como producción.

**Módulo propietario:** Finance / Accounting.

**Ruta canónica nueva:** `/platform/finance/intelligence`.

**Alias:** `/platform/financial-intelligence` → redirect a la ruta canónica.

**API nueva:** `/api/finance/intelligence/summary`.

**Fuentes reutilizadas:**
- `finance_accounts`
- `finance_journal_entries`
- `finance_journal_lines`
- `finance_bills`
- `finance_invoices`
- `finance_bank_accounts`
- `finance_bank_transactions`
- `finance_budgets`
- `finance_budget_lines`

**Funciones implementadas:**
- Liquidez/saldo bancario únicamente cuando existen cuentas bancarias ATLAS activas.
- Ingresos y gastos del mes desde el libro mayor.
- Rentabilidad, eficiencia de cobro y crecimiento de ingresos derivados de datos reales.
- Activos, pasivos y patrimonio derivados de asientos contabilizados.
- Presupuesto vs. gasto real cuando existe un presupuesto activo.
- Series de 12 meses para ingresos/gastos y flujo de caja.
- Alertas transparentes para AP próximo a vencer, AR vencido, sobreconsumo presupuestario y ausencia de banca conectada.
- Exportación CSV desde los datos cargados.
- Navegación hacia Accounting, AR, AP, Banking, Budgets, Taxes, Payroll, Inventory y Reports.
- Diseño responsive de escritorio, tablet y móvil.
- Estados vacíos/honestos cuando una fuente no existe.
- El clima se marca explícitamente como no conectado; no se muestran temperaturas inventadas.

**Seguridad:**
- Requiere `module.read` mediante `requireTenantPermission`.
- Mantiene alcance por `organization_id` + `dba_id`.
- No expone secretos.
- No utiliza cámara, micrófono ni geolocalización.
- Solo hace `fetch` same-origin hacia la API propia de ATLAS.

**Pruebas incorporadas:** `scripts/validate-financial-intelligence.mjs`, integrado a `build:sovereign` y `build:prod`.

**Estado antes de commit:** código preparado para commit atómico. Despliegue y verificación de producción pendientes hasta disponer de una ruta autorizada de publicación que no dependa del GitHub Actions bloqueado.

## 2026-08-17 — Global Promo LLC Production ERP

**Objetivo:** convertir la propuesta operacional de Global Promo LLC en software interno funcional dentro de ATLAS usando Version 2 — Global Promo Production ERP como alcance inicial, sin blueprints, capturas sustitutas, métricas ficticias ni fuentes de verdad duplicadas.

**Módulo propietario:** Enterprise Operations / Global Promo Production ERP.

**Integraciones canónicas reutilizadas:** CRM para clientes/cotizaciones; Inventory para stock; Operations para proveedores/aprobaciones; Finance para invoices/AR/AP/GL; HR para referencias de operadores/inspectores; Audit Ledger para evidencia de mutaciones.

**Rutas internas implementadas:**
- `/platform/global-promo`
- `/platform/global-promo/jobs`
- `/platform/global-promo/artwork`
- `/platform/global-promo/embroidery`
- `/platform/global-promo/materials`
- `/platform/global-promo/purchasing`
- `/platform/global-promo/production`
- `/platform/global-promo/quality`
- `/platform/global-promo/packing`
- `/platform/global-promo/billing`
- `/platform/global-promo/costing`

**APIs principales:** `/api/global-promo/overview`, `/jobs`, `/jobs/:id`, `/jobs/:id/commercial-context`, `/jobs/:id/invoice`, `/jobs/:id/payments`, `/billing`, `/artwork`, `/artwork/:id/decision`, `/embroidery`, `/materials`, `/purchase-orders`, `/work-orders`, `/quality`, `/packages`, `/costing`.

**Persistencia especializada:** `global_promo_jobs`, `global_promo_artwork_versions`, `global_promo_embroidery_specs`, `global_promo_material_requirements`, `global_promo_purchase_orders`, `global_promo_purchase_order_lines`, `global_promo_work_orders`, `global_promo_quality_checks`, `global_promo_packages`, `global_promo_finance_links` y `finance_invoice_payments`.

**Flujo y funciones:** Request → Quoted → Artwork → Approval → Materials → Production → Quality Control → Packing → Ready → Delivered; artwork versionado y aprobación con evidencia; bordado con stitch count/cost; materiales; POs; work orders; QC; packing/tracking; invoice real en Finance desde quote; depósitos/pagos auditables; job costing desde fuentes reales.

**Hardening agregado durante revisión:**
- Customer/Quote se valida contra el mismo tenant y se rechaza mismatch.
- Purchase Orders rechazan referencias de Inventory de otro tenant.
- Packing requiere al menos un QC con `pass`; ya no puede avanzar sin evidencia de QC.
- Delivered requiere al menos un package registrado, al menos uno con estado `delivered` y cero packages todavía abiertos.
- Una vez creado un Finance invoice para el job, Customer/Quote queda bloqueado para evitar divergencia `Invoice A` ↔ `Quote B`.
- Payments usan ledger auditable y trigger de base de datos para rechazar sobrepagos o facturas no pagables.
- `finance_invoices.received_cents` se recalcula desde el ledger de pagos.
- Se restauró `/feeds/meta/atlas-catalog.csv` después de detectar una deriva accidental durante integración.

**Pruebas ejecutadas en runtime Node 22 disponible:**
- `node --check` del archivo exacto `modules/global-promo-integrity.js`: PASS.
- Prueba unitaria aislada de los nuevos gates: PASS 7/7 después de corregir un error de sintaxis que estaba únicamente en el primer harness de prueba, no en el módulo.
- Los invariantes se convirtieron en funciones puras reutilizadas por producción y se añadió `scripts/test-global-promo-integrity.mjs` para ejecutarlos permanentemente dentro de `validate:global-promo`.
- `validate:global-promo` está incluido en `build:sovereign` y `build:prod`.

**Reconciliación con main:** mientras se trabajaba, `main` avanzó e incorporó Company Operations y soporte `release:sovereign:edge`. La rama Global Promo fue actualizada semánticamente para conservar `companyOperationsRoutes`, `validate:company-operations`, `release:sovereign:edge` y, en paralelo, Global Promo y sus tests. No se debe borrar trabajo nuevo de `main` al integrar.

**Limitaciones todavía reales:** el runtime local no puede resolver `github.com`; el archive/tarball privado está bloqueado por permisos del GitHub App; por eso todavía no se ha ejecutado el `build:sovereign` completo de todo el repositorio. GitHub Actions sigue configurado solo para `workflow_dispatch` y no constituye la única puerta de producción.

**Rama:** `feature/global-promo-operations`.

**PR principal:** `#191 — Global Promo Production ERP — canonical ATLAS module`.

**Estado:** IMPLEMENTADO EN RAMA. PR DRAFT. HARDENING UNITARIO PROBADO. BUILD SOBERANO COMPLETO PENDIENTE. NO DESPLEGADO. NO VERIFICADO EN PRODUCCIÓN.

**URL objetivo:** `https://www.atlasenterprisesuite.com/platform/global-promo` después de integración, despliegue y verificación real.

## 2026-08-17 — Hallazgo de superficie pública / Voice

La superficie pública consultable de ATLAS mostró credenciales/código de demostración en contenido público. Las cadenas observadas no se localizaron en el `main` canónico mediante la búsqueda disponible, por lo que no se modificó autenticación a ciegas. El hallazgo queda pendiente de reconciliar con el artefacto/origen realmente desplegado antes de declarar cerrada la auditoría de producción de Voice.

## Próximo paso recomendado
1. Completar la reconciliación formal de `main` dentro de `feature/global-promo-operations` sin perder Company Operations, Sovereign Edge ni Global Promo.
2. Ejecutar `validate:global-promo` completo y `build:sovereign` en un runner Node 22 con acceso a la rama completa.
3. Corregir cualquier error antes de sacar el PR #191 de draft.
4. Integrar a `main` sin cambiar `worker-meta.js` como entrypoint ni debilitar seguridad/rollback.
5. Publicar mediante un adaptador autorizado reemplazable.
6. Verificar `/platform/global-promo`, todas sus subrutas, Billing & Payments y acceso desde `/dashboard` en la URL real antes de declarar LIVE.
7. Reconciliar la superficie pública de acceso/Voice con el origen realmente desplegado.