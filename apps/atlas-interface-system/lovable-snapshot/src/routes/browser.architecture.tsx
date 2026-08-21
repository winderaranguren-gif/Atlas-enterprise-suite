import { createFileRoute } from "@tanstack/react-router";
import { Layers, Server, Smartphone, ShieldCheck } from "lucide-react";
import { PageHero, Panel, SectionHeading } from "@/components/atlas/primitives";

export const Route = createFileRoute("/browser/architecture")({
  head: () => ({
    meta: [
      { title: "Browser Architecture Note — ATLAS Browser" },
      {
        name: "description",
        content:
          "How the ATLAS Browser web workspace separates from a future native iOS browser shell, and what each layer is allowed to claim.",
      },
      { property: "og:title", content: "Browser Architecture Note — ATLAS Browser" },
      {
        property: "og:description",
        content:
          "Separation of the ATLAS web browsing workspace from a future native iOS browser application.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ArchitectureNote,
});

const LAYERS = [
  {
    icon: Layers,
    title: "Layer 1 — ATLAS Browser web workspace (this build)",
    can: [
      "Render ATLAS-owned routes inside the in-app content pane",
      "Classify a URL or document into accounting context types",
      "Create local evidence records in localStorage",
      "Open external URLs in the system browser via a user action",
    ],
    cannot: [
      "Embed arbitrary third-party sites (frame-ancestors / X-Frame-Options correctly block this)",
      "Act as an operating-system browser or default browser",
      "Store or transmit bank credentials",
      "Persist anything to a backend in this phase",
    ],
  },
  {
    icon: Smartphone,
    title: "Layer 2 — Future native iOS shell (not built)",
    can: [
      "Browse arbitrary sites through WKWebView",
      "Register as an http/https URL handler",
      "Apply declarative content blocking per profile",
      "Route downloads into the Evidence Inbox",
    ],
    cannot: [
      "Be described as an approved default browser before Apple grants the entitlement",
      "Bypass Apple review or platform policy",
    ],
  },
  {
    icon: Server,
    title: "Layer 3 — ATLAS secure core (integration target)",
    can: [
      "Own durable evidence storage, audit trails and reconciliation state",
      "Enforce Zero Trust access and least privilege on evidence",
      "Provide vendor and ledger association for classified documents",
    ],
    cannot: ["Be simulated by this visual layer — actions here are labelled prototype/preview"],
  },
];

function ArchitectureNote() {
  return (
    <div className="space-y-10">
      <PageHero
        eyebrow="ATLAS Browser · Documentation"
        icon={Layers}
        title="Web workspace vs. native browser"
        description="ATLAS Browser is a work-centric browsing layer, not a browser engine. This note fixes the boundary between what the current web build does, what a future native iOS shell would do, and what belongs to the ATLAS secure core."
      />

      <section className="space-y-4">
        <SectionHeading eyebrow="Boundaries" title="Three layers, three honest claims" />
        {LAYERS.map((layer) => (
          <Panel key={layer.title} className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-hairline bg-surface text-signal">
                <layer.icon className="size-5" />
              </span>
              <h3 className="min-w-0 text-base font-semibold">{layer.title}</h3>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-hairline bg-surface p-4">
                <p className="font-mono text-[10px] tracking-[0.2em] text-signal uppercase">Does</p>
                <ul className="mt-2.5 space-y-1.5 text-xs text-muted-foreground">
                  {layer.can.map((c) => (
                    <li key={c}>· {c}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-hairline bg-surface p-4">
                <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                  Never claims
                </p>
                <ul className="mt-2.5 space-y-1.5 text-xs text-muted-foreground">
                  {layer.cannot.map((c) => (
                    <li key={c}>· {c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Panel>
        ))}
      </section>

      <section className="space-y-4">
        <SectionHeading eyebrow="Data" title="Where prototype state lives" />
        <Panel className="p-5">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <span className="font-mono text-xs text-foreground">atlas.browser.evidence.v1</span> —
              locally created demo evidence records.
            </li>
            <li>
              <span className="font-mono text-xs text-foreground">atlas.browser.settings.v1</span> —
              browser preferences.
            </li>
            <li>
              <span className="font-mono text-xs text-foreground">atlas.browser.history.v1</span> —
              recent in-workspace navigations, only when history is enabled.
            </li>
            <li>
              <span className="font-mono text-xs text-foreground">atlas.browser.favorites.v1</span> —
              bookmarked portals and ATLAS routes.
            </li>
          </ul>
          <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-signal" />
            All four keys are cleared by “Clear local browsing data” in Browser Settings. No
            credentials, tokens or financial account numbers are stored by this module.
          </p>
        </Panel>
      </section>
    </div>
  );
}