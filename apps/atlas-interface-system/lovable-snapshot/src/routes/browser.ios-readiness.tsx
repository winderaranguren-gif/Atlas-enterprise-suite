import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Apple,
  Smartphone,
  ShieldAlert,
  KeyRound,
  Link2,
  Download,
  EyeOff,
  Globe2,
  BadgeCheck,
  ClipboardList,
} from "lucide-react";
import {
  CapabilityCard,
  DemoNotice,
  PageHero,
  Panel,
  SectionHeading,
} from "@/components/atlas/primitives";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/browser/ios-readiness")({
  head: () => ({
    meta: [
      { title: "iOS Browser Readiness — ATLAS Browser" },
      {
        name: "description",
        content:
          "Architecture and readiness checklist for a future native ATLAS iOS browser shell: WKWebView, URL handling, Keychain, content blocking and Apple default-browser requirements.",
      },
      { property: "og:title", content: "iOS Browser Readiness — ATLAS Browser" },
      {
        property: "og:description",
        content:
          "Readiness architecture for a future native ATLAS iOS browser shell. Not completed native functionality.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IosReadiness,
});

type Item = { id: string; title: string; detail: string; owner: string };

const SECTIONS: { group: string; items: Item[] }[] = [
  {
    group: "App target",
    items: [
      {
        id: "swift",
        title: "Swift / SwiftUI app target",
        detail:
          "Dedicated iOS target with the ATLAS design tokens ported to SwiftUI; shared route map with this web workspace.",
        owner: "Native platform",
      },
      {
        id: "wkwebview",
        title: "WKWebView browsing surface",
        detail:
          "Browsing engine is WKWebView, wrapped by ATLAS chrome (tabs, address bar, evidence rail). This is where arbitrary third-party sites can render — the web build cannot.",
        owner: "Native platform",
      },
      {
        id: "urlhandling",
        title: "http / https URL handling",
        detail:
          "Register CFBundleURLTypes plus Info.plist declarations so the app can be offered as a handler for web URLs.",
        owner: "Native platform",
      },
    ],
  },
  {
    group: "Integration",
    items: [
      {
        id: "universal",
        title: "Universal links & deep links into ATLAS modules",
        detail:
          "apple-app-site-association hosted on the ATLAS domain; /finance, /audit, /browser/evidence resolve natively.",
        owner: "Native + web",
      },
      {
        id: "downloads",
        title: "Download & share sheet handling",
        detail:
          "WKDownloadDelegate routes statements/receipts into the ATLAS Evidence Inbox; UIActivityViewController for share out.",
        owner: "Native platform",
      },
    ],
  },
  {
    group: "Security & privacy",
    items: [
      {
        id: "keychain",
        title: "Keychain-backed secure storage",
        detail:
          "Only ATLAS session material in Keychain with biometric gating. ATLAS must never store bank credentials — banking sign-in stays on the bank's own surface.",
        owner: "Security",
      },
      {
        id: "blocking",
        title: "Content blocking & privacy architecture",
        detail:
          "WKContentRuleList tracker/cookie rules, per-tab data stores, private-session isolation, no cross-tab identifier sharing.",
        owner: "Security",
      },
      {
        id: "appbound",
        title: "App-bound domain decisions",
        detail:
          "Evaluate WKAppBoundDomains for ATLAS-owned domains only; document the trade-off against script injection for third-party sites.",
        owner: "Security",
      },
    ],
  },
  {
    group: "Apple process",
    items: [
      {
        id: "entitlement",
        title: "Default-browser entitlement application",
        detail:
          "Apple's managed default-browser entitlement requires a real browsing engine surface, URL handling and Apple approval. Application is a future milestone, not a shipped capability.",
        owner: "Program",
      },
      {
        id: "review",
        title: "App Store review readiness",
        detail:
          "Privacy manifest, data-collection disclosures, content-blocking documentation, review notes describing the enterprise accounting workflow.",
        owner: "Program",
      },
    ],
  },
];

function IosReadiness() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const total = SECTIONS.reduce((n, s) => n + s.items.length, 0);
  const completed = Object.values(done).filter(Boolean).length;

  return (
    <div className="space-y-10">
      <PageHero
        eyebrow="ATLAS Browser · Readiness"
        icon={Apple}
        title="iOS Default Browser Readiness"
        description="This page is architecture and planning only. The current ATLAS Browser is a web workspace — it is not an iOS browser and cannot be set as the iOS default browser. Everything below describes what a future native ATLAS iOS shell would need."
      />

      <Panel className="flex flex-wrap items-center gap-3 border-signal/40 p-5">
        <ShieldAlert className="size-5 shrink-0 text-signal" />
        <p className="min-w-0 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Truthful status:</span> no native target
          exists yet. Nothing on this page implies Apple approval, an entitlement, or shipped native
          browsing.
        </p>
      </Panel>

      <section className="space-y-5">
        <SectionHeading
          eyebrow="Checklist"
          title="Future native shell — implementation checklist"
          description="Local planning checkboxes. State is not persisted or reported anywhere."
          action={
            <Badge variant="outline" className="border-hairline font-mono text-[11px]">
              {completed}/{total} marked
            </Badge>
          }
        />
        <div className="space-y-4">
          {SECTIONS.map((section) => (
            <Panel key={section.group} className="p-5">
              <p className="font-mono text-[11px] tracking-[0.2em] text-signal uppercase">
                {section.group}
              </p>
              <ul className="mt-4 space-y-3">
                {section.items.map((item) => (
                  <li key={item.id} className="flex gap-3 rounded-xl border border-hairline bg-surface p-3.5">
                    <Checkbox
                      id={item.id}
                      checked={!!done[item.id]}
                      onCheckedChange={(v) => setDone((p) => ({ ...p, [item.id]: v === true }))}
                      className="mt-0.5"
                      aria-label={`Mark ${item.title} as planned`}
                    />
                    <div className="min-w-0">
                      <label htmlFor={item.id} className="text-sm font-semibold">
                        {item.title}
                      </label>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
                      <span className="mt-2 inline-block rounded-full border border-hairline px-2 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                        {item.owner}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <SectionHeading eyebrow="Architecture" title="What the native shell adds" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <CapabilityCard
            icon={Smartphone}
            title="Real browsing engine"
            description="WKWebView renders third-party sites that browsers correctly refuse to embed in a web page."
            points={["Tabs backed by web views", "Per-tab data stores"]}
            status="Future work"
          />
          <CapabilityCard
            icon={Link2}
            title="System URL routing"
            description="Registered http/https handling plus universal links straight into ATLAS modules."
            points={["Deep links to /audit", "Handoff from mail and chat"]}
            status="Future work"
          />
          <CapabilityCard
            icon={KeyRound}
            title="Keychain boundary"
            description="ATLAS session material only. Bank credentials never enter ATLAS."
            points={["Biometric gate", "No credential capture"]}
            status="Future work"
          />
          <CapabilityCard
            icon={EyeOff}
            title="Content blocking"
            description="Declarative rule lists for trackers and third-party cookies."
            points={["Rule list compilation", "Per-profile isolation"]}
            status="Future work"
          />
          <CapabilityCard
            icon={Download}
            title="Downloads to evidence"
            description="Statements and receipts land in the Evidence Inbox instead of a loose files folder."
            points={["WKDownloadDelegate", "Share sheet export"]}
            status="Future work"
          />
          <CapabilityCard
            icon={Globe2}
            title="App-bound domains"
            description="Tighter script boundaries for ATLAS-owned domains, documented trade-offs elsewhere."
            points={["ATLAS domains only", "Documented exceptions"]}
            status="Future work"
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading eyebrow="Program" title="Milestones toward an entitlement application" />
        <Panel className="p-5">
          <ol className="space-y-3 text-sm text-muted-foreground">
            {[
              "Ship the ATLAS Browser web workspace (this phase) — chrome, evidence, classification, settings.",
              "Build the SwiftUI + WKWebView shell reusing this route map and design tokens.",
              "Implement URL handling, universal links, downloads and content blocking.",
              "Complete the security review: Keychain scope, no bank credential handling, audit trail.",
              "Prepare privacy manifest and review notes, then apply for the default-browser entitlement.",
            ].map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-hairline bg-surface font-mono text-[11px] text-signal">
                  {i + 1}
                </span>
                <span className="min-w-0">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <BadgeCheck className="size-4 text-signal" />
            Phase 1 of 5 in progress.
            <ClipboardList className="ml-2 size-4" />
            Readiness document, not a claim of completion.
          </div>
        </Panel>
        <DemoNotice>
          Checklist content is architectural guidance authored for ATLAS and contains no Apple
          proprietary material.
        </DemoNotice>
      </section>
    </div>
  );
}