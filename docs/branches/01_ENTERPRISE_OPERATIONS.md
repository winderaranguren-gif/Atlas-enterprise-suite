# Branch 01 — Enterprise & Operations

**Parent:** ATLAS Master Index & Genealogy  
**Lineage:** Human mission → ATLAS OS / Core → Enterprise & Operations  
**Status:** living branch dossier  
**Rule:** this branch owns execution of business operations. Finance, HR, Knowledge and regulated payment execution remain authoritative in their own branches and are referenced, not duplicated.

---

## 1. Branch purpose

Enterprise & Operations turns ATLAS Core identity, tenant isolation, audit and shared context into coordinated business execution. Its fruit is not “a dashboard”; its fruit is a traceable business action: a customer relationship advanced, a task completed, an approval decided, inventory moved, a project delivered, a fleet activity recorded, a document governed or a management report produced.

## 2. Roots inherited

- One ecosystem; no disconnected module islands.
- User + Organization + DBA scope.
- Explicit permissions; deny by default.
- Append-only audit evidence for material mutations.
- Honest maturity claims.
- External providers are adapters, not ATLAS sources of truth.
- Multi-language/global context is shared through ATLAS Core rather than reimplemented here.

## 3. Trunk dependencies

| Trunk service | Required use |
|---|---|
| Authentication / session | Every protected workspace and API |
| Organization + DBA | Exact tenant scope for all business records |
| RBAC / tenant guard | `module.read` / `module.write` plus action evidence |
| Audit Ledger | Mutation evidence across CRM, Operations, Inventory, Projects, Documents and Transportation |
| HR People | Assignees, project owners, drivers and other person references |
| Finance | Financial system of record; Enterprise may consume but must not duplicate it |
| Global Context | Locale, language, region and timezone |
| Release / QA | Branch claims are only “ripe” after environment verification |

## 4. Canonical sub-branches

### 4.1 Enterprise Administration — WORKING FRUIT

**Purpose:** organization administration and governance surfaces.

**Current route:** `/platform/enterprise-suite`  
**Connected authoritative surfaces:** Access Control, Audit & Security, Settings.  
**Fruit:** users can navigate company administration, organization structure, access and audit controls under the shared ATLAS identity model.

**Boundary:** company/DBA identity belongs to ATLAS Core. Enterprise Administration is the business-facing control surface, not a second organization database.

### 4.2 CRM & Sales Relationships — WORKING FRUIT

**Current route:** `/platform/crm`  
**System of record:** CRM tables introduced by `migrations/0005_crm.sql`.  
**Runtime:** `modules/crm.js` plus CRM account/contact/opportunity/activity/automation components.  
**Fruit:** tenant-scoped customer/company/contact relationships, opportunities, activities and pipeline accountability.

**Important boundary:** a CRM opportunity is not an accounting invoice, fulfillment order or general-ledger entry.

### 4.3 Operations Control — WORKING FRUIT

**Current route:** `/platform/operations` and protected child routes.  
**System of record:** `migrations/0012_operations_core.sql`.  
**Runtime:** `modules/operations.js`.

**Persisted objects:** 
- `operations_tasks`
- `operations_workflows`
- `operations_workflow_steps`
- `operations_approvals`
- `operations_vendors`
- `operations_compliance_items`

**Fruit:** accountable tasks, repeatable workflows, approval decisions, vendor/compliance visibility and operating overview. Mutations pass tenant authorization and write audit evidence.

### 4.4 Inventory — WORKING FRUIT

**Current route:** `/platform/inventory` and child routes.  
**System of record:** `migrations/0013_inventory_core.sql`.  
**Runtime:** `modules/inventory.js` and `modules/inventory-counts.js`.

**Persisted objects:**
- `inventory_items`
- `inventory_locations`
- `inventory_movements`
- `inventory_counts`
- `inventory_count_lines`

**Fruit:** product/item identity, stock by location, receipts/issues/adjustments/transfers, reorder visibility and controlled physical counts.

**Invariant:** inventory balance is derived from traceable movements; it must never become a free-floating editable number.

### 4.5 Projects — WORKING FRUIT

**Current route:** `/platform/projects`.  
**System of record:** `migrations/0015_projects_core.sql`.  
**Runtime:** `modules/projects.js`.

**Persisted objects:**
- `projects`
- `project_members`
- `project_milestones`
- `project_tasks`
- `project_costs`

**Fruit:** project planning, ownership, milestones, resources, tasks, time/cost tracking and portfolio overview. Project costs can reference external records without replacing Finance as accounting authority.

### 4.6 Transportation / Fleet — WORKING FRUIT

**Current route:** `/platform/transportation`.  
**Runtime:** `modules/transportation.js` and transportation safety components.  
**System of record:** transportation/fleet schema managed by `ensureTransportationSchema`.

**Fruit:** vehicles, trips, driver assignment, maintenance, fuel and operating fleet metrics under Organization/DBA scope.

**Boundary:** transportation owns fleet operations. RideOS / consumer-driver intelligence remains a Mobility branch capability; accounting treatment of costs remains Finance.

### 4.7 Documents — WORKING FRUIT

**Current route:** `/platform/documents`.  
**Runtime:** `modules/documents.js`.  
**System of record:** document schema managed by `ensureDocumentsSchema`.

**Persisted concepts:** document records, versions, templates and approval records.

**Fruit:** controlled document creation, version history, review/approval, templates and archive with audit evidence.

**Boundary:** Forms Control may generate structured form output; Documents owns controlled business-document lifecycle. Binding legal signature execution remains partner-bound until a validated signature system exists.

### 4.8 Reports & Analytics — WORKING FRUIT

**Current route:** `/platform/reports`.  
**Runtime:** `modules/reports.js`.

**Source model:** read-only derivation from authoritative ATLAS ledgers/systems including Finance, HR, Operations, Inventory, Transportation and Projects.

**Fruit:** executive and domain reporting derived from selected Organization/DBA data rather than placeholder metrics.

**Invariant:** Reports may aggregate and calculate; it does not become a second ledger.

### 4.9 Sales Orders / Quotes — GREEN FRUIT

CRM already supports relationship/opportunity flow, but a complete canonical quote → accepted quote → sales order → fulfillment → invoice chain is not yet evidenced as its own durable Enterprise transaction model.

**Required lineage:** CRM opportunity → commercial quote/order → Inventory fulfillment → Documents evidence → Finance invoice/AR.

**Do not claim:** full order management merely because CRM contains opportunities or because Finance can issue invoices.

### 4.10 Purchasing / Procurement — GREEN FRUIT

Operations already contains vendors and compliance; Finance owns bills/AP; Inventory owns receipts. The missing fruit is a durable procurement chain such as request → approval → purchase order → receipt → vendor bill reconciliation.

**Required lineage:** Operations request/approval → Procurement PO → Inventory receipt → Finance AP.

### 4.11 Partner & Negotiation Hub — SEED / GREEN FRUIT

Historical ATLAS architecture defines pricing, volume, rebates, SLA, credit, contracts, insurance, APIs and exclusivity negotiations. It should evolve from existing CRM accounts + Operations vendors + Documents contracts rather than create duplicate counterparties.

### 4.12 Elevator Operations — ARTIFACT-VERIFIED FRUIT

A dedicated Elevator Operations MVP exists in the ATLAS Library. It belongs genealogically under Enterprise & Operations → Industry Solutions → Facilities / Field Operations. It must reuse Core identity, Operations workflows/tasks/approvals, Documents and reporting when promoted into the canonical runtime.

### 4.13 Hospitality — GREEN FRUIT / INDUSTRY SOLUTION

Hotel guest, runner, catering, room-access and staff coordination concepts belong here as an industry solution. The branch should compose Enterprise/Operations/CRM/Documents rather than create a separate identity, task or document system.

---

## 5. Authoritative object ownership

| Object | Owner branch/system | Enterprise relationship |
|---|---|---|
| User, Organization, DBA, Membership | ATLAS Core | consumes |
| Customer/company/contact/opportunity | CRM | owns |
| Vendor operational profile/compliance | Operations | owns |
| Employee/candidate/contractor person | HR / People | references |
| Task/workflow/approval | Operations | owns |
| Inventory item/location/movement/count | Inventory | owns |
| Project/milestone/project task/cost | Projects | owns |
| Vehicle/trip/maintenance/fuel | Transportation | owns |
| Document/version/template/approval | Documents | owns |
| GL/AP/AR/bank/invoice/bill | Finance | consumes / references only |
| Dashboard KPI / executive report | Reports | derives; never owns source transaction |

## 6. Fruit chain examples

### Customer-to-cash lineage
`CRM opportunity → [future canonical quote/order] → Inventory/fulfillment → Finance invoice/AR → Reports`

### Procure-to-pay lineage
`Operations request/approval → [future procurement PO] → Inventory receipt → Finance AP → Reports`

### Project delivery lineage
`Project → members/milestones/tasks → Operations approvals/workflows → project cost references → Finance + Reports`

### Controlled-document lineage
`Business event → Documents draft/version → approval → approved/archive → Audit Ledger`

### Fleet operations lineage
`Vehicle + authorized driver → trip → fuel/maintenance → Reports → Finance cost reference when applicable`

## 7. Maturity matrix

| Sub-branch | Source runtime | Durable schema | Tenant guard | Audit mutations | Current classification |
|---|---:|---:|---:|---:|---|
| Enterprise Administration | Yes | Core-owned | Yes | Core/audit | WORKING FRUIT |
| CRM | Yes | Yes | Yes | Yes | WORKING FRUIT |
| Operations | Yes | Yes | Yes | Yes | WORKING FRUIT |
| Inventory | Yes | Yes | Yes | Yes | WORKING FRUIT |
| Projects | Yes | Yes | Yes | Yes | WORKING FRUIT |
| Transportation | Yes | Yes | Yes | Yes | WORKING FRUIT |
| Documents | Yes | Yes | Yes | Yes | WORKING FRUIT |
| Reports | Yes | Derived | Yes | Read-only | WORKING FRUIT |
| Quotes / Sales Orders | Partial lineage | Not yet proven | — | — | GREEN FRUIT |
| Procurement / PO | Partial lineage | Not yet proven | — | — | GREEN FRUIT |
| Partner & Negotiation Hub | Concept + reusable parents | Not canonical | — | — | SEED / GREEN |
| Elevator Operations | Library MVP | Artifact-specific | Artifact-specific | Artifact-specific | ARTIFACT-VERIFIED |
| Hospitality | Design/proposal lineage | Not canonical | — | — | GREEN FRUIT |

**Production note:** WORKING FRUIT means implemented in canonical source with its expected data/security contract. It does **not** mean the current public production environment has been independently verified at this exact commit. “RIPE / LIVE” requires the production verifier and environment evidence.

## 8. Pruning rules

1. No new customer/vendor master if CRM/Operations already owns the counterparty.
2. No new task engine if Operations already owns business tasks/workflows/approvals.
3. No inventory quantity mutation outside the Inventory movement ledger.
4. No financial ledger inside Projects, Transportation, CRM or Reports.
5. No duplicate document-version system in Forms, HR, Projects or industry solutions.
6. No industry solution may fork identity, Organization/DBA, RBAC or Audit Ledger.
7. “Ready” UI labels must never be treated as proof of persistence or production availability.

## 9. Next fruit sequence for this branch

### E1 — Canonical commercial transaction spine
Define durable Quote / Sales Order entities and state transitions, linked to CRM account/opportunity, Inventory fulfillment and Finance invoicing.

### E2 — Canonical procurement spine
Define Purchase Request / Purchase Order / receipt matching, linked to Operations approvals/vendor compliance, Inventory receipts and Finance AP.

### E3 — Enterprise cross-reference contract
Standardize `reference_type` / `reference_id` lineage across CRM, Operations, Inventory, Projects, Documents, Transportation and Finance so a transaction can be traced end-to-end.

### E4 — Enterprise activity graph
Expose a read-only timeline for an account/project/order/vendor showing related tasks, documents, inventory, finance and audit evidence without duplicating source records.

### E5 — Industry composition layer
Promote Elevator and Hospitality as compositions of the canonical branch systems, with industry-specific fields only where required.

## 10. Definition of ripe fruit

An Enterprise & Operations sub-branch becomes **RIPE FRUIT** for production only when all applicable conditions are true:

- canonical route exists;
- system of record is explicit;
- tenant guard is enforced;
- writes are audited;
- schema migration/ensure function is available;
- validation gate covers the capability;
- production verifier proves the deployed release identity and expected behavior;
- no placeholder metrics or unsupported third-party connection claims remain.
