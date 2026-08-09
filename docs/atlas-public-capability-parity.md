# ATLAS Public Capability Parity Plan

Source reviewed: https://atlas.gt/ (public marketing pages only).

## Rule

ATLAS may reproduce **publicly described functionality and workflows**, but must not copy proprietary source code, private implementations, visual assets, trademarks, copywriting, or branding from third parties. All implementations in this repository use ATLAS-native naming, architecture, UI, and code.

## ATLAS-native product mapping

- `ATLAS Automation Studio` — visual workflow / no-code automation engine.
- `ATLAS Field Sales` — mobile-first sales, collections, field activity, GPS evidence, delivery assignment, and reporting.
- `ATLAS Integration Hub` — API, database, webhook, payment, ERP/CRM, messaging, cloud, and analytics connectors.
- `ATLAS Analytics 360` — cross-module KPIs, dashboards, exports, and predictive hooks.
- `ATLAS Trust Layer` — audit trails, encryption helpers, role/SSO integration points, and security policy.
- `ATLAS Transformation Services` — process discovery, implementation, training, and continuous optimization runbooks.

## Public capability matrix

### Automation Studio
- [x] Visual workflow definition model
- [x] Trigger / condition / action execution simulator
- [x] Dynamic form builder
- [x] Conditional fields and validation rules
- [x] Interactive records / listings
- [x] CSV / JSON report export
- [x] Email-template configuration model
- [x] Dashboard / KPI cards
- [x] GPS capture using browser geolocation
- [x] File / photo attachment capture and local preview
- [x] Complete local audit trail
- [x] Offline-first local state
- [ ] Production database connectors (requires server-side credential vault / network adapters)
- [ ] Production REST/OAuth connector execution (requires secure proxy / credential vault)
- [ ] QR scanner and standards-compliant QR generator
- [ ] Interactive map provider / geofence engine
- [ ] Production Guatemala FEL/SAT integration (requires authorized provider credentials and compliance configuration)
- [ ] Production scheduled jobs / distributed worker engine

### Field Sales
- [x] Collections dashboard
- [x] Sales registration
- [x] Product catalog with availability
- [x] Executive dashboard
- [x] Payment-method capture (cash / check / transfer / card metadata only; no raw card storage)
- [x] Bank/reference traceability
- [x] Vehicle / driver assignment
- [x] Store pickup / delivery mode
- [x] GPS visit evidence
- [x] Photo / file evidence
- [x] CSV / JSON export
- [x] Offline local operation
- [ ] Bluetooth voucher printing adapter
- [ ] Payment processor tokenization and settlement
- [ ] Server sync / conflict resolution across multiple devices

### Platform and enterprise layer
- [x] Modular architecture pattern
- [x] Audit log pattern
- [x] API-first connector definitions
- [x] Web Crypto AES-GCM encrypted export utility
- [x] Multi-platform foundation already present in repository via Capacitor (Web / iOS / Android)
- [ ] Enterprise SSO provider wiring
- [ ] Central secrets manager
- [ ] Distributed analytics warehouse / ETL runtime
- [ ] ML/NLP inference provider wiring
- [ ] RPA agent runtime

## Security decisions

1. Never store full payment-card numbers, CVV, passwords, OAuth refresh tokens, or third-party database passwords in browser localStorage.
2. Connector secrets must move through a server-side encrypted credential vault before production.
3. Production encryption at rest must be enforced server-side. The browser AES-GCM helper is for encrypted exports and portable backups, not a substitute for backend controls.
4. SSO must use OIDC/SAML through approved identity providers and server-side session validation.
5. Every workflow run, field-sale change, export, connector test, and security event must create an auditable event.
6. GPS and camera access are opt-in and use browser permission prompts.

## Implementation status

This branch introduces the first operational ATLAS-native surface: `atlas-automation-field-ops.html` with its JS/CSS runtime. It intentionally labels infrastructure-dependent items as `adapter required` rather than pretending that external credentials or regulatory integrations are already live.
