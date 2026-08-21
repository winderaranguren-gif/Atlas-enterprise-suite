import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Settings2, Trash2, Apple } from "lucide-react";
import { DemoNotice, PageHero, Panel, SectionHeading } from "@/components/atlas/primitives";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SEARCH_PROVIDERS, type BrowserSettings } from "@/lib/atlas/browser/data";
import { clearAllBrowserData, useBrowserSettings } from "@/lib/atlas/browser/store";

export const Route = createFileRoute("/browser/settings")({
  head: () => ({
    meta: [
      { title: "Browser Settings — ATLAS Browser" },
      {
        name: "description",
        content:
          "ATLAS Browser settings: search provider, external link behaviour, privacy controls, evidence handling and iOS default browser readiness.",
      },
      { property: "og:title", content: "Browser Settings — ATLAS Browser" },
      {
        property: "og:description",
        content: "Search provider, external links, privacy controls and evidence handling for ATLAS Browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BrowserSettingsPage,
});

const TOGGLES: { key: keyof BrowserSettings; label: string; detail: string }[] = [
  { key: "blockTrackers", label: "Block known trackers", detail: "Prototype preference; enforced by the native shell's rule lists." },
  { key: "blockThirdPartyCookies", label: "Block third-party cookies", detail: "Applied per browsing profile in the future native shell." },
  { key: "sendDoNotTrack", label: "Send Do Not Track", detail: "Advisory signal only." },
  { key: "keepHistory", label: "Keep local recent sites", detail: "Stores recent workspace navigations in this browser." },
  { key: "evidenceAutoClassify", label: "Auto-classify evidence", detail: "Pre-fills the accounting context type from the URL pattern." },
];

function BrowserSettingsPage() {
  const { settings, set, reset } = useBrowserSettings();
  const [cleared, setCleared] = useState(false);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="ATLAS Browser"
        icon={Settings2}
        title="Browser Settings"
        description="Preferences for the ATLAS browsing workspace. Everything is stored locally in this browser; none of it is synced or enforced by a backend in this phase."
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel className="space-y-4 p-5">
          <SectionHeading eyebrow="Search" title="Default search provider" />
          <Select value={settings.searchProvider} onValueChange={(v) => set("searchProvider", v)}>
            <SelectTrigger className="border-hairline bg-surface" aria-label="Default search provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEARCH_PROVIDERS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Placeholder selection. Search routing is implemented by the future native shell.
          </p>

          <SectionHeading eyebrow="Links" title="Open external links" />
          <Select
            value={settings.externalLinks}
            onValueChange={(v) => set("externalLinks", v as BrowserSettings["externalLinks"])}
          >
            <SelectTrigger className="border-hairline bg-surface" aria-label="External link behaviour">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">Always in the system browser</SelectItem>
              <SelectItem value="confirm">Ask before leaving ATLAS</SelectItem>
              <SelectItem value="panel">Stay in workspace with context panel</SelectItem>
            </SelectContent>
          </Select>

          <SectionHeading eyebrow="Downloads" title="Download & evidence handling" />
          <Select
            value={settings.downloadHandling}
            onValueChange={(v) => set("downloadHandling", v as BrowserSettings["downloadHandling"])}
          >
            <SelectTrigger className="border-hairline bg-surface" aria-label="Download handling">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="evidence">Route documents to the Evidence Inbox</SelectItem>
              <SelectItem value="ask">Ask each time</SelectItem>
              <SelectItem value="device">Keep on device only</SelectItem>
            </SelectContent>
          </Select>
        </Panel>

        <Panel className="space-y-4 p-5">
          <SectionHeading eyebrow="Privacy" title="Privacy controls" />
          <div className="space-y-3">
            {TOGGLES.map((t) => (
              <div key={t.key} className="flex items-start justify-between gap-4 rounded-xl border border-hairline bg-surface p-3.5">
                <div className="min-w-0">
                  <Label htmlFor={t.key} className="text-sm">
                    {t.label}
                  </Label>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{t.detail}</p>
                </div>
                <Switch
                  id={t.key}
                  checked={settings[t.key] as boolean}
                  onCheckedChange={(v) => set(t.key, v as never)}
                />
              </div>
            ))}
          </div>

          <SectionHeading eyebrow="Data" title="Clear local browsing data" />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-hairline bg-surface"
              onClick={() => {
                clearAllBrowserData();
                reset();
                setCleared(true);
              }}
            >
              <Trash2 className="size-3.5" /> Clear evidence, history, favorites & settings
            </Button>
          </div>
          <p aria-live="polite" className="text-xs text-muted-foreground">
            {cleared
              ? "Local ATLAS Browser data cleared. Reload to reseed demo records."
              : "Removes the four atlas.browser.* local storage keys."}
          </p>
        </Panel>
      </section>

      <section className="space-y-4">
        <SectionHeading eyebrow="Native" title="iOS Default Browser Readiness" />
        <Panel className="space-y-3 p-5">
          <p className="text-sm text-muted-foreground">
            This web build is groundwork only. It is not an iOS browser and cannot be set as the iOS
            default browser. Becoming a candidate for Apple's default-browser entitlement requires a
            native application with a real browsing surface.
          </p>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {[
              "Swift/SwiftUI iOS app target",
              "WKWebView browsing surface with ATLAS chrome",
              "Registered http/https URL handling",
              "Universal links into ATLAS modules",
              "Keychain scope for ATLAS sessions only — never bank credentials",
              "Download/share sheet handling into the Evidence Inbox",
              "Content blocking and per-profile privacy architecture",
              "App-bound domain decisions for ATLAS-owned domains",
              "Apple default-browser entitlement application",
              "App Store review readiness and privacy manifest",
            ].map((i) => (
              <li key={i}>· {i} — future work</li>
            ))}
          </ul>
          <Button asChild size="sm" variant="outline" className="gap-1.5 border-hairline bg-surface">
            <Link to="/browser/ios-readiness">
              <Apple className="size-3.5" /> Open full readiness checklist
            </Link>
          </Button>
        </Panel>
        <DemoNotice>
          Settings affect this prototype's local behaviour and labelling only.
        </DemoNotice>
      </section>
    </div>
  );
}