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

## Próximo paso recomendado
1. Commit atómico de Financial Intelligence + wiring + validación.
2. Ejecutar el build soberano en un runtime con acceso al repositorio y Node 22.
3. Publicar mediante el adaptador directo disponible; Cloudflare requiere credenciales directas cuando se use ese adaptador.
4. Verificar `/platform/settings/voice` y `/platform/finance/intelligence` en la URL real antes de declarar LIVE.
