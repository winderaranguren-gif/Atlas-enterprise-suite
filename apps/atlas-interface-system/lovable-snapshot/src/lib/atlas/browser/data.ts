/**
 * ATLAS Browser — clean-room demo data + local prototype logic.
 * Nothing here talks to a backend. All records live in the browser only.
 */

export type EvidenceType =
  | "Bank"
  | "Uber"
  | "Lyft"
  | "Instacart"
  | "Vendor"
  | "Statement"
  | "Receipt"
  | "Invoice"
  | "Tax"
  | "Other";

export const EVIDENCE_TYPES: EvidenceType[] = [
  "Bank",
  "Uber",
  "Lyft",
  "Instacart",
  "Vendor",
  "Statement",
  "Receipt",
  "Invoice",
  "Tax",
  "Other",
];

export type ReconciliationStatus = "Unfiled" | "Queued" | "In review" | "Reconciled";

export const RECONCILIATION_STATUSES: ReconciliationStatus[] = [
  "Unfiled",
  "Queued",
  "In review",
  "Reconciled",
];

export type EvidenceRecord = {
  id: string;
  url: string;
  title: string;
  type: EvidenceType;
  vendor: string;
  createdAt: string;
  notes: string;
  status: ReconciliationStatus;
};

export type Portal = {
  id: string;
  name: string;
  url: string;
  category: EvidenceType;
  blurb: string;
  workflow: string;
};

/** Portal presets. Deep links only — ATLAS never stores portal credentials. */
export const PORTAL_PRESETS: Portal[] = [
  {
    id: "bofa",
    name: "Bank of America",
    url: "https://www.bankofamerica.com/",
    category: "Bank",
    blurb: "Open the bank's own sign-in surface in the system browser.",
    workflow: "Bank reconciliation",
  },
  {
    id: "uber",
    name: "Uber",
    url: "https://riders.uber.com/trips",
    category: "Uber",
    blurb: "Trip receipts and business travel documentation.",
    workflow: "Uber reconciliation",
  },
  {
    id: "lyft",
    name: "Lyft",
    url: "https://www.lyft.com/rider/ride-history",
    category: "Lyft",
    blurb: "Ride history export for mileage and travel spend.",
    workflow: "Lyft reconciliation",
  },
  {
    id: "instacart",
    name: "Instacart",
    url: "https://www.instacart.com/store/account/orders",
    category: "Instacart",
    blurb: "Order receipts for supplies and pantry spend.",
    workflow: "Supplies reconciliation",
  },
  {
    id: "irs",
    name: "IRS / Tax",
    url: "https://www.irs.gov/",
    category: "Tax",
    blurb: "Filing calendars, notices and tax authority references.",
    workflow: "Tax readiness",
  },
  {
    id: "vendor",
    name: "Generic Vendor Portal",
    url: "https://example-vendor.com/invoices",
    category: "Vendor",
    blurb: "Any supplier portal — invoices, statements, contracts.",
    workflow: "Vendor invoice intake",
  },
];

/** ATLAS-internal destinations that are safe to render in the in-app pane. */
export const INTERNAL_DESTINATIONS = [
  { path: "/", label: "Dashboard 360" },
  { path: "/finance", label: "Finance" },
  { path: "/operations", label: "Operations" },
  { path: "/audit", label: "Audit Evidence" },
  { path: "/security", label: "ATLAS Security" },
  { path: "/privacy", label: "Privacy by Design" },
  { path: "/connect", label: "Connect" },
];

export const RECENT_SITES: { url: string; title: string }[] = [
  { url: "https://riders.uber.com/trips", title: "Uber — Trips" },
  { url: "https://www.bankofamerica.com/", title: "Bank of America" },
  { url: "https://example-vendor.com/statements/july.pdf", title: "Vendor statement (PDF)" },
  { url: "/finance", title: "ATLAS Finance" },
  { url: "https://www.irs.gov/", title: "IRS" },
];

export type Suggestion = {
  workflow: string;
  type: EvidenceType;
  reason: string;
};

const HOST_RULES: { match: RegExp; workflow: string; type: EvidenceType; reason: string }[] = [
  { match: /uber\./i, workflow: "Uber reconciliation", type: "Uber", reason: "Uber domain detected" },
  { match: /lyft\./i, workflow: "Lyft reconciliation", type: "Lyft", reason: "Lyft domain detected" },
  { match: /instacart\./i, workflow: "Supplies reconciliation", type: "Instacart", reason: "Instacart domain detected" },
  {
    match: /bankofamerica|chase|wellsfargo|bank/i,
    workflow: "Bank reconciliation",
    type: "Bank",
    reason: "Banking domain detected",
  },
  { match: /irs\.gov|tax/i, workflow: "Tax readiness", type: "Tax", reason: "Tax authority domain detected" },
];

const PATH_RULES: { match: RegExp; workflow: string; type: EvidenceType; reason: string }[] = [
  {
    match: /\.(pdf|csv|xlsx?|ofx|qfx)(\?|$)/i,
    workflow: "Save as evidence / statement",
    type: "Statement",
    reason: "Document file extension detected",
  },
  { match: /receipt/i, workflow: "Receipt capture", type: "Receipt", reason: "Receipt path detected" },
  { match: /invoice|bill/i, workflow: "Vendor invoice intake", type: "Invoice", reason: "Invoice path detected" },
  { match: /statement/i, workflow: "Statement import", type: "Statement", reason: "Statement path detected" },
];

export function isInternalTarget(raw: string) {
  return raw.startsWith("/");
}

export function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  if (value.startsWith("/")) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(value)) return `https://${value}`;
  // treat as a search term against the configured provider placeholder
  return `https://duckduckgo.com/?q=${encodeURIComponent(value)}`;
}

export function describeTarget(raw: string) {
  if (isInternalTarget(raw)) {
    const found = INTERNAL_DESTINATIONS.find((d) => d.path === raw);
    return { host: "atlas.internal", label: found?.label ?? raw, internal: true };
  }
  try {
    const u = new URL(raw);
    return { host: u.host, label: u.host + (u.pathname === "/" ? "" : u.pathname), internal: false };
  } catch {
    return { host: raw, label: raw, internal: false };
  }
}

/** Contextual, non-destructive workflow suggestions derived from the URL. */
export function suggestWorkflows(raw: string): Suggestion[] {
  if (!raw) return [];
  if (isInternalTarget(raw)) {
    return [
      {
        workflow: "Attach to ATLAS module context",
        type: "Other",
        reason: "ATLAS-internal route — renders in the in-app pane",
      },
    ];
  }
  const out: Suggestion[] = [];
  for (const rule of [...HOST_RULES, ...PATH_RULES]) {
    if (rule.match.test(raw)) {
      out.push({ workflow: rule.workflow, type: rule.type, reason: rule.reason });
    }
  }
  if (out.length === 0) {
    out.push({ workflow: "Classify manually", type: "Other", reason: "No pattern matched this URL" });
  }
  return out.slice(0, 3);
}

export function classifyUrl(raw: string): EvidenceType {
  return suggestWorkflows(raw)[0]?.type ?? "Other";
}

export function vendorFromUrl(raw: string) {
  if (isInternalTarget(raw)) return "ATLAS";
  const host = describeTarget(raw).host.replace(/^www\./, "");
  const core = host.split(".")[0] ?? host;
  return core.charAt(0).toUpperCase() + core.slice(1);
}

export const DEMO_EVIDENCE: EvidenceRecord[] = [
  {
    id: "ev-demo-1",
    url: "https://riders.uber.com/trips",
    title: "Uber — July business trips",
    type: "Uber",
    vendor: "Uber",
    createdAt: "2026-08-04T14:20:00.000Z",
    notes: "DEMO record. 6 trips flagged for travel policy review.",
    status: "Queued",
  },
  {
    id: "ev-demo-2",
    url: "https://example-vendor.com/statements/july.pdf",
    title: "Vendor statement — July (PDF)",
    type: "Statement",
    vendor: "Example-vendor",
    createdAt: "2026-08-06T09:05:00.000Z",
    notes: "DEMO record. Statement total to match against AP ledger.",
    status: "In review",
  },
  {
    id: "ev-demo-3",
    url: "https://www.bankofamerica.com/",
    title: "Bank portal session note",
    type: "Bank",
    vendor: "Bankofamerica",
    createdAt: "2026-08-11T17:41:00.000Z",
    notes: "DEMO record. Opened externally; no credentials handled by ATLAS.",
    status: "Unfiled",
  },
];

export type BrowserSettings = {
  searchProvider: string;
  externalLinks: "system" | "confirm" | "panel";
  blockTrackers: boolean;
  blockThirdPartyCookies: boolean;
  sendDoNotTrack: boolean;
  keepHistory: boolean;
  evidenceAutoClassify: boolean;
  downloadHandling: "evidence" | "ask" | "device";
};

export const DEFAULT_SETTINGS: BrowserSettings = {
  searchProvider: "DuckDuckGo (placeholder)",
  externalLinks: "confirm",
  blockTrackers: true,
  blockThirdPartyCookies: true,
  sendDoNotTrack: true,
  keepHistory: true,
  evidenceAutoClassify: true,
  downloadHandling: "evidence",
};

export const SEARCH_PROVIDERS = [
  "DuckDuckGo (placeholder)",
  "Bing (placeholder)",
  "Google (placeholder)",
  "ATLAS Search (future)",
];