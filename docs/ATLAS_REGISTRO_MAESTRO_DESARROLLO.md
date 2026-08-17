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
- La ruta de despliegue automática de GitHub Actions continúa sin aportar evidencia del build requerido.
- La verificación visual completa de la URL canónica de Voice continúa pendiente.

**Estado:** IMPLEMENTADO en el repositorio canónico; revisión estática completada. VERIFICACIÓN VISUAL EN PRODUCCIÓN todavía pendiente.

## 2026-08-17 — ATLAS Financial Intelligence desde especificación visual

**Objetivo:** transformar la referencia visual de ATLAS Financial Intelligence en una superficie de software real, sin usar la imagen como captura sustituta ni presentar números ficticios como producción.

**Módulo propietario:** Finance / Accounting.

**Ruta canónica nueva:** `/platform/finance/intelligence`.

**Alias:** `/platform/financial-intelligence` → redirect a la ruta canónica.

**API nueva:** `/api/finance/intelligence/summary`.

**Fuentes reutilizadas:** `finance_accounts`, `finance_journal_entries`, `finance_journal_lines`, `finance_bills`, `finance_invoices`, `finance_bank_accounts`, `finance_bank_transactions`, `finance_budgets`, `finance_budget_lines`.

**Funciones implementadas:** liquidez cuando existen cuentas bancarias ATLAS; ingresos/gastos desde el libro mayor; rentabilidad y eficiencia de cobro; activos/pasivos/patrimonio; presupuesto vs. real; series de 12 meses; alertas AP/AR/presupuesto; exportación CSV; navegación a Accounting/AR/AP/Banking/Budgets/Taxes/Payroll/Inventory/Reports; responsive; estados vacíos honestos.

**Seguridad:** `module.read`, alcance `organization_id + dba_id`, sin exposición de secretos, sin cámara/micrófono/geolocalización y fetch same-origin.

**Pruebas incorporadas:** `scripts/validate-financial-intelligence.mjs`, integrado a `build:sovereign` y `build:prod`.

**Estado:** IMPLEMENTADO EN CÓDIGO. DESPLIEGUE Y VERIFICACIÓN DE PRODUCCIÓN PENDIENTES.

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
- Material requirements usan transiciones controladas; Production rechaza materiales existentes que todavía no estén allocated/issued/cancelled.
- Work Orders pueden planificarse en Materials/Production, pero ejecución y completion requieren que el job esté realmente en Production.
- Quality Control exige al menos un Work Order no cancelado completado y rechaza Work Orders todavía abiertos.
- QC solo puede registrarse cuando el job está en `quality_control`; si referencia un Work Order, este debe estar `completed`.
- Artwork solo se crea en fase `artwork`; decisiones de artwork solo se aceptan en `approval`.
- Un job que entró a Approval no puede salir manualmente a Materials sin artwork aprobado.
- Packing requiere al menos un QC con `pass`.
- Packages solo se crean mientras el job está en Packing. Si el job ya está Ready y necesita otro paquete, debe regresar primero a Packing mediante la transición permitida `ready → packing`.
- Los estados `packing/packed` de package pertenecen a la fase Packing; `shipped/delivered/exception` pertenecen a Ready/fulfillment.
- Ready exige al menos un package no cancelado y cero packages todavía en `packing` o `exception`.
- Delivered requiere al menos un package registrado, al menos uno con estado `delivered` y cero packages todavía abiertos.
- Una vez creado un Finance invoice para el job, Customer/Quote queda bloqueado para evitar divergencia `Invoice A` ↔ `Quote B`.
- Payments usan ledger auditable y trigger de base de datos para rechazar sobrepagos o facturas no pagables.
- `finance_invoices.received_cents` se deriva del ledger de pagos.
- Se restauró `/feeds/meta/atlas-catalog.csv` después de detectar una deriva accidental durante integración.

**Pruebas ejecutadas en runtime Node 22 disponible:**
- Node v22.16.0 utilizado para las pruebas de invariantes.
- `node --check` sobre el módulo de invariantes extraído y sobre el test harness: PASS.
- Primera prueba endpoint/invariant: PASS 7/7 después de corregir un error de sintaxis perteneciente únicamente al primer harness, no al código de producto.
- Suite ampliada de invariantes de Materials, Work Orders, Artwork/Approval, QC, Packing, Ready, packages/fulfillment, Delivery y commercial lock: PASS 49/49.
- Los invariantes están implementados como funciones reutilizadas por producción y reflejados en `scripts/test-global-promo-integrity.mjs`.
- `scripts/validate-global-promo.mjs` exige la presencia de los guards de fase y seguridad.
- `validate:global-promo` permanece incluido en `build:sovereign` y `build:prod`.

**Limitación todavía real:** el `validate:global-promo` completo contra un checkout materializado y el `build:sovereign` completo de todo el repositorio todavía no han sido ejecutados en un runner Node 22 con acceso íntegro a la rama. El runtime local no puede resolver `github.com` y el GitHub App no permite descargar el tarball privado. Por tanto no se declara el build completo como aprobado.

## 2026-08-17 — Global Promo: reconciliación limpia con main actual

**Problema detectado:** mientras Global Promo se desarrollaba, `main` avanzó e incorporó Company Operations y soporte de despliegue `release:sovereign:edge`. La rama original `feature/global-promo-operations` y el PR #191 quedaron divergentes; un PR temporal de sincronización #194 también resultó inadecuado para una integración limpia.

**Acción aplicada:** se evitó rebase destructivo, force-push y sobrescritura de trabajo nuevo. Se construyó mediante Git tree API un árbol nuevo tomando como base lógica el `main` actual y reutilizando por SHA únicamente los blobs de Global Promo y los archivos compartidos reconciliados.

**Main base verificado:** `b7daab78bfb7b0680f84471381cc8bbca1ef0150`.

**Árbol reconciliado inicial:** `394cf277def416b70d0be7aa3bccf97931e85b34`.

**Commit limpio inicial:** `a0b3f9b5ab100e0bd9dff1f7cd3d1f326053cdc9`, con `main` actual como padre directo.

**Rama canónica candidata:** `feature/global-promo-operations-mainline`.

**PR vigente:** `#195 — Global Promo Production ERP — reconciled canonical mainline`.

**Estado de GitHub verificado:** PR abierto, draft, `mergeable=true`, base `main`, base SHA `b7daab78bfb7b0680f84471381cc8bbca1ef0150`. Después de las pruebas financieras y UX de fase el head avanzó a `5d60c0d3537666af8d0a5f487d80a96916dd7b5d` antes de los commits UX posteriores; el PR continúa como única candidata de integración y permanece en draft hasta el build completo.

**Compatibilidad preservada:**
- `modules/company-operations.js` existe físicamente en la nueva rama y conserva la versión de `main`.
- `worker-meta.js` conserva `companyOperationsRoutes` y añade Global Promo.
- `package.json` conserva `validate:company-operations`, añade `validate:global-promo` y mantiene ambos dentro de las cadenas correspondientes.
- `release:sovereign:edge` permanece disponible.
- Los adaptadores `bundle`, `cloudflare` y `sovereign-edge` existen físicamente en la rama reconciliada.
- `wrangler.main` no fue modificado y `worker-meta.js` continúa siendo el entrypoint canónico.

**PRs anteriores:** #191 y #194 fueron cerrados sin merge como `superseded by #195`. Sus ramas/historial se conservan como evidencia y rollback; no deben fusionarse.

## 2026-08-17 — Global Promo: pagos atómicos y UX consciente de fases

**Objetivo financiero:** eliminar la ventana de inconsistencia entre registrar un pago y actualizar el estado de la factura.

**Cambio aplicado:**
- `GLOBAL_PROMO_PAYMENT_VALIDATE_TRIGGER_SQL` valida tenant, estado pagable y balance antes del INSERT.
- `GLOBAL_PROMO_PAYMENT_APPLY_TRIGGER_SQL` ejecuta AFTER INSERT y actualiza en la misma operación de base de datos `finance_invoices.received_cents`, `status` y `updated_at` desde la suma del ledger.
- `recordPayment` ya no hace un UPDATE manual separado de `received_cents/status`; inserta el ledger y vuelve a leer el estado aplicado por SQLite.
- El validador falla si reaparece el patrón antiguo de actualización manual no atómica.

**Pruebas financieras ejecutadas:** `scripts/test-global-promo-finance-integrity.mjs` usa Node 22 `node:sqlite` y verificó 8/8: pago parcial, pago total, rechazo posterior a paid, sobrepago, cross-tenant, invoice void, monto cero y reconciliación ledger ↔ invoice.

**Objetivo de UX:** evitar que un operador vea acciones que el backend ya sabe que son incompatibles con la fase del job.

**Cambio aplicado:** `modules/global-promo-commercial-ui.js` ahora incorpora una capa `data-global-promo-phase-ui` sobre las pantallas existentes. No crea endpoints ni un segundo estado. Filtra jobs reales por fase: Artwork=`artwork`; Work Orders=`materials|production`; QC=`quality_control`; Package creation=`packing`. También limita Work Orders ejecutables, decisiones de artwork, Work Orders elegibles para QC y estados de package según la fase real del job. MutationObserver mantiene los filtros después de re-renderizados de la UI base.

**Prueba de sintaxis UX:** el JavaScript exacto inyectado por la capa de fase pasó `node --check`.

**Validación permanente:** `scripts/validate-global-promo.mjs` exige la presencia de la capa de fase, sus selectores/rules y los triggers financieros atómicos. `validate:global-promo` ejecuta tanto `test:global-promo-integrity` como `test:global-promo-finance-integrity`.

**Estado actual exacto:** DISEÑADO ✅ · IMPLEMENTADO EN RAMA LIMPIA ✅ · WORKFLOW INVARIANTS 49/49 ✅ · FINANCE INTEGRITY 8/8 ✅ · UX PHASE SCRIPT SYNTAX ✅ · RECONCILIADO CON MAIN ✅ · PR #195 MERGEABLE/DRAFT ✅ · BUILD SOBERANO COMPLETO ❌ · MERGE A MAIN ❌ · DESPLIEGUE ❌ · VERIFICACIÓN EN PRODUCCIÓN ❌.

**URL objetivo:** `https://www.atlasenterprisesuite.com/platform/global-promo` después de validación completa, integración, despliegue y verificación real.

## 2026-08-17 — Hallazgo de superficie pública / Voice

La superficie pública consultable de ATLAS mostró credenciales/código de demostración en contenido público. Las cadenas observadas no se localizaron en el `main` canónico mediante la búsqueda disponible, por lo que no se modificó autenticación a ciegas. El hallazgo queda pendiente de reconciliar con el artefacto/origen realmente desplegado antes de declarar cerrada la auditoría de producción de Voice.

## Próximo paso recomendado
1. Mantener #195 como única ruta candidata de integración de Global Promo; #191 y #194 ya están cerrados sin merge.
2. Conseguir un runner Node 22 con acceso al checkout completo de `feature/global-promo-operations-mainline` y ejecutar `validate:global-promo` + `build:sovereign`.
3. Corregir cualquier error antes de sacar #195 de draft.
4. Integrar a `main` sin cambiar `worker-meta.js` como entrypoint ni debilitar seguridad/rollback.
5. Publicar mediante un adaptador autorizado reemplazable.
6. Verificar `/platform/global-promo`, todas sus subrutas, Billing & Payments y acceso desde `/dashboard` en la URL real antes de declarar LIVE.
7. Reconciliar la superficie pública de acceso/Voice con el origen realmente desplegado.