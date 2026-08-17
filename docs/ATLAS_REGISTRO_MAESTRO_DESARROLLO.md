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

**Auditoría pública adicional del 17 de agosto de 2026:**
- `https://atlasenterprisesuite.com/` respondió públicamente y muestra la superficie de acceso actual.
- La lectura pública disponible mostró credenciales de demostración y un código de verificación fijo dentro del contenido HTML de esa superficie. Esto debe tratarse como una discrepancia de seguridad/producción si ese acceso permite cualquier dato o acción significativa.
- Las búsquedas en el repositorio canónico por las cadenas públicas de demo no encontraron coincidencias, por lo que no se modificó autenticación a ciegas. El hallazgo puede corresponder a una versión de producción divergente, un artefacto previo o una capa no representada por el `main` actual.
- La comprobación HTTP directa de `/platform/settings/voice` no produjo una respuesta utilizable desde la herramienta pública en esta sesión; por tanto no se declara verificación visual completa de Voice.

**Limitaciones verificadas:**
- La auditoría visual en vivo del proyecto Lovable `/voice` no pudo ejecutarse mediante su agente porque el workspace se encuentra sin créditos.
- La ruta de despliegue automática de GitHub Actions continúa sin ejecutar el build requerido.
- El runtime local disponible no puede resolver `github.com`, por lo que no fue posible clonar el repositorio privado y ejecutar allí los validadores Node 22.

**Estado:** IMPLEMENTADO en el repositorio canónico; revisión estática completada. VERIFICACIÓN VISUAL EN PRODUCCIÓN todavía pendiente. Hallazgo de exposición de credenciales/código de demo pendiente de reconciliar con la fuente real desplegada.

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

**Estado:** IMPLEMENTADO en código; despliegue y verificación de producción pendientes hasta disponer de una ruta autorizada de publicación que no dependa del GitHub Actions bloqueado.

## 2026-08-17 — Global Promo LLC Production ERP

**Objetivo:** convertir la propuesta de operaciones de Global Promo LLC en software interno funcional dentro de ATLAS, tomando la Versión 2 — Global Promo Production ERP como alcance recomendado y evitando blueprints, imágenes sustitutas, botones falsos y fuentes de verdad duplicadas.

**Módulo propietario:** Enterprise Operations / Global Promo Production ERP.

**Módulos relacionados y reutilizados:**
- CRM para clientes y cotizaciones.
- Inventory para artículos, ubicaciones y movimientos físicos de stock.
- Operations para proveedores y aprobaciones compartidas.
- Finance / Accounting para invoices, Accounts Receivable, Accounts Payable y General Ledger.
- HR para referencias de operadores e inspectores cuando estén disponibles en el tenant.
- Audit Ledger para evidencia de mutaciones operativas y financieras.

**Rutas internas implementadas en la rama:**
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

**APIs implementadas:**
- `/api/global-promo/overview`
- `/api/global-promo/jobs`
- `/api/global-promo/jobs/:id`
- `/api/global-promo/jobs/:id/commercial-context`
- `/api/global-promo/jobs/:id/invoice`
- `/api/global-promo/jobs/:id/payments`
- `/api/global-promo/billing`
- `/api/global-promo/artwork`
- `/api/global-promo/artwork/:id/decision`
- `/api/global-promo/embroidery`
- `/api/global-promo/materials`
- `/api/global-promo/purchase-orders`
- `/api/global-promo/work-orders`
- `/api/global-promo/quality`
- `/api/global-promo/packages`
- `/api/global-promo/costing`

**Persistencia especializada incorporada:**
- `global_promo_jobs`
- `global_promo_artwork_versions`
- `global_promo_embroidery_specs`
- `global_promo_material_requirements`
- `global_promo_purchase_orders`
- `global_promo_purchase_order_lines`
- `global_promo_work_orders`
- `global_promo_quality_checks`
- `global_promo_packages`
- `global_promo_finance_links`
- `finance_invoice_payments` como ledger auditable general contra las facturas canónicas de Finance.

**Funciones implementadas:**
- Jobs de producción con ciclo controlado Request → Quoted → Artwork → Approval → Materials → Production → Quality Control → Packing → Ready → Delivered.
- Enlace posterior de una solicitud a cliente y cotización CRM, con avance automático de Request a Quoted cuando se vincula una cotización válida.
- Validación para impedir que una cotización de otro cliente o tenant se enlace al job.
- Versionado de artwork, envío a decisión, aprobación/rechazo, evidencia de aprobación y superseding de versiones previas.
- Registros especializados de bordado con stitch count, cantidad, digitizing cost, costo interno por 1,000 stitches y costo estimado derivado.
- Requerimientos de materiales vinculables al maestro de Inventory sin crear un segundo stock ledger.
- Purchase Orders con líneas, totales, estados y aprobación restringida por rol.
- Preflight de Purchase Orders para impedir referencias a `inventory_items` ajenos al tenant.
- Work Orders con operación, cantidad, operador, máquina, programación, tiempos, labor rate y machine cost.
- Quality Control con pass/fail/rework, cantidades, defectos, inspector y evidencia.
- Packing y delivery con package number, carrier, service level, tracking y estados controlados.
- Billing & Payments con creación de una factura real en `finance_invoices` a partir del total de la cotización CRM enlazada; un job solo puede vincular una factura canónica.
- Registro de depósitos/pagos contra esa misma factura de Finance. El ledger `finance_invoice_payments` es la evidencia detallada y `finance_invoices.received_cents` se deriva de la suma del ledger.
- Trigger de base de datos para impedir pagos contra facturas no pagables y sobrepagos incluso ante concurrencia.
- La interfaz de Billing distingue explícitamente registrar un pago ya recibido de procesarlo por tarjeta/ACH. No se simula procesamiento bancario; ese paso requerirá una integración de pagos autorizada.
- Job Costing con revenue proveniente únicamente de la cotización CRM enlazada y costos derivados de compras/materiales, bordado, mano de obra y máquina. Cuando falta revenue real, se mantiene como no disponible; no se inventan métricas.
- Entrada desde el dashboard canónico de ATLAS hacia Global Promo ERP.

**Reglas de integridad y seguridad:**
- Todas las entidades nuevas mantienen `organization_id` + `dba_id`.
- Las APIs usan `requireTenantPermission` y las mutaciones registran `appendAuditLedger` cuando corresponde.
- La superficie `/platform/global-promo*` exige sesión de navegador válida.
- No se exponen secretos ni credenciales en frontend del nuevo módulo.
- No se modifica el `wrangler.main`; producción continúa usando `worker-meta.js` como entrypoint canónico.
- No se alteraron DNS ni se eliminó autenticación para incorporar el módulo.
- Las transiciones de estado inválidas se rechazan en servidor.
- QC, work orders y packages aplican bloqueos de avance cuando el flujo registrado todavía no permite pasar a la siguiente etapa.
- Se corrigió durante la revisión una regresión accidental en la ruta del feed Meta y se restauró exactamente `/feeds/meta/atlas-catalog.csv` antes de cerrar el diff.
- Se separó el error de identidad del error de inicialización de Global Promo para no mostrar mensajes engañosos de seguridad cuando el problema real sea del runtime del módulo.

**Validación incorporada al repositorio:**
- `scripts/validate-global-promo.mjs` comprueba tablas, APIs, rutas, controles, wiring, protección de sesión, integridad comercial, factura/pagos, trigger anti-overpayment, preservación del feed Meta y ausencia de marcadores estáticos básicos.
- `validate:global-promo` ejecuta `node --check` sobre todos los módulos Global Promo, Billing/Finance handoff y `worker-meta.js` antes del validador estructural.
- `validate:global-promo` está incorporado tanto a `build:sovereign` como a `build:prod`.

**Pruebas / ejecución real:**
- Revisión del diff: la rama está por delante de `main`, sin commits por detrás y sin modificaciones de DNS o `wrangler.main`.
- El PR es mergeable según GitHub.
- No existe workflow asociado al commit actual; GitHub Actions no ejecutó el validador.
- Se intentó una validación soberana local mediante acceso directo al repositorio, pero el runtime disponible devolvió `Could not resolve host: github.com`; por tanto no se declara el build Node 22 como ejecutado.
- No se declara PROBADO integralmente mientras el validador no pueda ejecutarse en un runtime con la rama completa.

**Rama de trabajo:** `feature/global-promo-operations`.

**Pull Request:** `#191 — Global Promo Production ERP — canonical ATLAS module`.

**Estado:** IMPLEMENTADO EN RAMA / PR DRAFT. DIFF REVISADO. BUILD COMPLETO NO EJECUTADO. NO DESPLEGADO. NO VERIFICADO EN PRODUCCIÓN.

**URL objetivo después de merge y despliegue:** `https://www.atlasenterprisesuite.com/platform/global-promo`.

## Próximo paso recomendado
1. Ejecutar `validate:global-promo` y `build:sovereign` en un runtime Node 22 con acceso a la rama completa.
2. Corregir cualquier error que aparezca; únicamente después mover el PR #191 fuera de draft.
3. Integrar en `main` sin cambiar `worker-meta.js` como entrypoint ni la política de rollback.
4. Publicar mediante el adaptador autorizado disponible; Cloudflare debe seguir siendo reemplazable y no la fuente de verdad.
5. Verificar en producción `/platform/global-promo`, cada subruta, Billing & Payments y el acceso desde `/dashboard` antes de declarar el módulo LIVE.
6. Reconciliar la superficie pública actual de acceso que muestra credenciales/código de demo con la fuente desplegada real antes de considerar resuelta la auditoría de seguridad/Voice.
7. Mantener pendiente la verificación de producción de ATLAS Voice y Financial Intelligence hasta que la URL real responda con evidencia verificable.
