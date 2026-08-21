import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  ExternalLink,
  Globe,
  Home,
  Lock,
  Plus,
  RotateCw,
  Save,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { DemoNotice, PageHero, Panel, SectionHeading } from "@/components/atlas/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  EVIDENCE_TYPES,
  INTERNAL_DESTINATIONS,
  PORTAL_PRESETS,
  RECENT_SITES,
  classifyUrl,
  describeTarget,
  isInternalTarget,
  normalizeUrl,
  suggestWorkflows,
  vendorFromUrl,
  type EvidenceType,
} from "@/lib/atlas/browser/data";
import { useBrowserSettings, useBrowsingHistory, useEvidence, useFavorites } from "@/lib/atlas/browser/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/browser/")({
  head: () => ({
    meta: [
      { title: "ATLAS Browser — work-centric browsing workspace" },
      {
        name: "description",
        content:
          "ATLAS Browser: an enterprise browsing workspace with tabs, portal presets, accounting context classification and a local evidence inbox.",
      },
      { property: "og:title", content: "ATLAS Browser — work-centric browsing workspace" },
      {
        property: "og:description",
        content:
          "Tabs, portal presets, accounting context classification and a local evidence inbox inside ATLAS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BrowserWorkspace,
});

type Tab = { id: string; url: string; title: string; history: string[]; cursor: number };

let tabSeq = 1;
const newTab = (url = "/", title = "New tab"): Tab => ({
  id: `tab-${tabSeq++}`,
  url,
  title,
  history: [url],
  cursor: 0,
});

function BrowserWorkspace() {
  const [tabs, setTabs] = useState<Tab[]>([newTab("/finance", "ATLAS Finance")]);
  const [activeId, setActiveId] = useState(() => tabs[0]!.id);
  const [address, setAddress] = useState("/finance");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<EvidenceType>("Other");
  const [lastAction, setLastAction] = useState<string | null>(null);

  const { settings } = useBrowserSettings();
  const { history, push } = useBrowsingHistory();
  const { favorites, toggle } = useFavorites();
  const { add } = useEvidence();

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0]!;
  const target = active.url;
  const meta = useMemo(() => describeTarget(target), [target]);
  const suggestions = useMemo(() => suggestWorkflows(target), [target]);
  const internal = isInternalTarget(target);
  const isFavorite = favorites.some((f) => f.url === target);

  function navigate(raw: string, title?: string) {
    const url = normalizeUrl(raw);
    if (!url) return;
    const label = title ?? describeTarget(url).label;
    setTabs((prev) =>
      prev.map((t) =>
        t.id === active.id
          ? {
              ...t,
              url,
              title: label,
              history: [...t.history.slice(0, t.cursor + 1), url],
              cursor: t.cursor + 1,
            }
          : t,
      ),
    );
    setAddress(url);
    if (settings.keepHistory) push({ url, title: label });
    if (settings.evidenceAutoClassify) setCategory(classifyUrl(url));
  }

  function step(delta: number) {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== active.id) return t;
        const cursor = Math.min(Math.max(t.cursor + delta, 0), t.history.length - 1);
        const url = t.history[cursor]!;
        setAddress(url);
        return { ...t, cursor, url, title: describeTarget(url).label };
      }),
    );
  }

  function openExternally() {
    if (internal) return;
    if (typeof window !== "undefined") window.open(target, "_blank", "noopener,noreferrer");
    setLastAction(`Opened ${meta.host} in the system browser.`);
  }

  function prototypeAction(label: string) {
    setLastAction(`${label} — local prototype only, nothing was sent to a backend.`);
    toast(label, { description: "Local prototype action. No backend persistence in this phase." });
  }

  function saveEvidence() {
    const record = add({
      url: target,
      title: active.title,
      type: category,
      vendor: vendorFromUrl(target),
      notes: notes.trim() || "DEMO record created from the ATLAS Browser workspace.",
      status: "Unfiled",
    });
    setNotes("");
    setLastAction(`Saved local evidence record ${record.id} (${record.type}).`);
    toast("Saved as evidence (local)", {
      description: "Stored in this browser only. Visible in the Evidence Inbox.",
    });
  }

  return (
    <div className="space-y-10">
      <PageHero
        eyebrow="Platform · Phase 1"
        icon={Compass}
        title="ATLAS Browser"
        description="A work-centric browsing layer for accounting and operations tasks. ATLAS routes render in the in-app pane; external sites open in the system browser with an ATLAS context panel beside them. This web build is not an operating-system browser."
        actions={
          <>
            <Button asChild size="sm" variant="outline" className="border-hairline bg-surface">
              <Link to="/browser/ios-readiness">iOS readiness</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-hairline bg-surface">
              <Link to="/browser/architecture">Architecture note</Link>
            </Button>
          </>
        }
      />

      {/* Browser chrome */}
      <Panel strong className="overflow-hidden">
        <div className="flex items-end gap-1 overflow-x-auto border-b border-hairline px-2 pt-2">
          {tabs.map((t) => (
            <div
              key={t.id}
              className={cn(
                "flex max-w-[220px] items-center gap-2 rounded-t-xl border border-b-0 border-hairline px-3 py-2 text-xs",
                t.id === activeId ? "bg-surface-strong text-foreground" : "bg-surface text-muted-foreground",
              )}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveId(t.id);
                  setAddress(t.url);
                }}
                className="min-w-0 truncate"
              >
                {t.title}
              </button>
              {tabs.length > 1 ? (
                <button
                  type="button"
                  aria-label={`Close ${t.title}`}
                  onClick={() => {
                    setTabs((prev) => prev.filter((x) => x.id !== t.id));
                    if (t.id === activeId) {
                      const next = tabs.find((x) => x.id !== t.id)!;
                      setActiveId(next.id);
                      setAddress(next.url);
                    }
                  }}
                  className="shrink-0 rounded hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          ))}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="New tab"
            className="mb-1 size-7"
            onClick={() => {
              const t = newTab("/", "New tab");
              setTabs((prev) => [...prev, t]);
              setActiveId(t.id);
              setAddress("/");
            }}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <form
          className="flex flex-wrap items-center gap-2 border-b border-hairline p-3"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(address);
          }}
        >
          <div className="flex shrink-0 items-center gap-1">
            <Button type="button" size="icon" variant="ghost" aria-label="Back" onClick={() => step(-1)} disabled={active.cursor === 0}>
              <ArrowLeft className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Forward"
              onClick={() => step(1)}
              disabled={active.cursor >= active.history.length - 1}
            >
              <ArrowRight className="size-4" />
            </Button>
            <Button type="button" size="icon" variant="ghost" aria-label="Reload" onClick={() => navigate(target, active.title)}>
              <RotateCw className="size-4" />
            </Button>
            <Button type="button" size="icon" variant="ghost" aria-label="Home" onClick={() => navigate("/", "Dashboard 360")}>
              <Home className="size-4" />
            </Button>
          </div>
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-hairline bg-surface px-3">
            <span
              className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] tracking-wider uppercase text-muted-foreground"
              title={internal ? "ATLAS-owned route" : "External origin — opens in system browser"}
            >
              {internal ? <Lock className="size-3.5 text-signal" /> : <Globe className="size-3.5" />}
              {internal ? "ATLAS" : "External"}
            </span>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              aria-label="Address or search"
              placeholder="Enter an ATLAS route (/finance) or a URL"
              className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button type="submit" size="sm" variant="outline" className="border-hairline bg-surface">
              Go
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={isFavorite ? "Remove bookmark" : "Add bookmark"}
              onClick={() => toggle({ url: target, title: active.title })}
            >
              <Star className={cn("size-4", isFavorite && "fill-signal text-signal")} />
            </Button>
          </div>
        </form>

        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Content pane */}
          <div className="min-h-[320px] rounded-2xl border border-hairline bg-surface p-5">
            {internal ? (
              <div className="space-y-4">
                <Badge variant="outline" className="border-signal/40 text-[10px] text-signal">
                  In-app content pane
                </Badge>
                <h2 className="text-lg font-semibold">{meta.label}</h2>
                <p className="text-sm text-muted-foreground">
                  ATLAS-owned routes are safe to render inside the workspace. Open it in the shell to
                  keep your tab context.
                </p>
                <Button asChild size="sm" variant="outline" className="border-hairline bg-surface">
                  <a href={target}>Open {meta.label} in ATLAS</a>
                </Button>
                <div className="flex flex-wrap gap-2 pt-2">
                  {INTERNAL_DESTINATIONS.map((d) => (
                    <Button
                      key={d.path}
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="border border-hairline"
                      onClick={() => navigate(d.path, d.label)}
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Badge variant="outline" className="border-hairline text-[10px] text-muted-foreground">
                  External origin
                </Badge>
                <h2 className="text-lg font-semibold break-all">{meta.host}</h2>
                <p className="text-sm text-muted-foreground">
                  Third-party sites cannot be embedded reliably in a web page — browsers block framing
                  by design, and ATLAS will not fake it. Open the site in your system browser and keep
                  the ATLAS context panel beside it.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={openExternally} className="gap-2">
                    <ExternalLink className="size-4" /> Open externally
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-hairline bg-surface"
                    onClick={() => prototypeAction("Copied task link")}
                  >
                    Copy task link
                  </Button>
                </div>
                <p className="rounded-xl border border-hairline bg-background/40 p-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Future native capability:</span> in
                  a native iOS shell, this pane becomes a WKWebView that renders the site in-app.
                  That target is not built — see{" "}
                  <Link to="/browser/ios-readiness" className="text-signal underline">
                    iOS readiness
                  </Link>
                  .
                </p>
              </div>
            )}
            <p className="mt-5 text-[11px] text-muted-foreground">
              Privacy indicator: trackers {settings.blockTrackers ? "blocked" : "allowed"} · third-party
              cookies {settings.blockThirdPartyCookies ? "blocked" : "allowed"} · history{" "}
              {settings.keepHistory ? "kept locally" : "off"}
            </p>
          </div>

          {/* Accounting context side panel */}
          <aside className="space-y-4 rounded-2xl border border-hairline bg-surface p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-signal" />
              <h3 className="text-sm font-semibold">Accounting Context</h3>
            </div>

            <div className="space-y-2">
              <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                Suggested workflows
              </p>
              {suggestions.map((s) => (
                <button
                  key={s.workflow}
                  type="button"
                  onClick={() => setCategory(s.type)}
                  className="w-full rounded-xl border border-hairline bg-background/40 p-3 text-left transition-colors hover:border-signal/40"
                >
                  <p className="text-xs font-semibold">{s.workflow}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{s.reason}</p>
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                Classification
              </label>
              <Select value={category} onValueChange={(v) => setCategory(v as EvidenceType)}>
                <SelectTrigger className="border-hairline bg-background/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVIDENCE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              aria-label="Context notes"
              placeholder="Notes for this task or document…"
              className="min-h-20 border-hairline bg-background/40 text-xs"
            />

            <div className="grid gap-2">
              <Button type="button" size="sm" className="gap-2" onClick={saveEvidence}>
                <Save className="size-4" /> Save as evidence
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-hairline bg-background/40"
                onClick={() => prototypeAction("Sent to reconciliation queue")}
              >
                Send to reconciliation
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-hairline bg-background/40"
                onClick={() => prototypeAction(`Associated vendor ${vendorFromUrl(target)}`)}
              >
                Associate vendor
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-hairline bg-background/40"
                onClick={() => prototypeAction("Created review item")}
              >
                Create review item
              </Button>
            </div>

            <p
              aria-live="polite"
              className="rounded-xl border border-hairline bg-background/40 p-3 text-[11px] text-muted-foreground"
            >
              {lastAction ?? "No prototype action taken yet in this session."}
            </p>
          </aside>
        </div>
      </Panel>

      <section className="space-y-5">
        <SectionHeading
          eyebrow="Portals"
          title="Smart portal presets"
          description="Deep links only. ATLAS never stores or requests portal or banking credentials — sign-in always happens on the provider's own surface."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {PORTAL_PRESETS.map((p) => (
            <Panel key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold">{p.name}</h3>
                <Badge variant="outline" className="border-hairline text-[10px] text-muted-foreground">
                  {p.category}
                </Badge>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{p.blurb}</p>
              <p className="mt-2 font-mono text-[10px] tracking-wider text-signal uppercase">
                {p.workflow}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-hairline bg-surface"
                  onClick={() => navigate(p.url, p.name)}
                >
                  Load in workspace
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="gap-1.5"
                  onClick={() => window.open(p.url, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="size-3.5" /> Open
                </Button>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">No credentials stored.</p>
            </Panel>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-5">
          <h3 className="text-sm font-semibold">Favorites</h3>
          <ul className="mt-3 space-y-2">
            {favorites.length === 0 ? (
              <li className="text-xs text-muted-foreground">No bookmarks yet.</li>
            ) : (
              favorites.map((f) => (
                <li key={f.url}>
                  <button
                    type="button"
                    onClick={() => navigate(f.url, f.title)}
                    className="w-full truncate rounded-lg border border-hairline bg-surface px-3 py-2 text-left text-xs hover:border-signal/40"
                  >
                    {f.title} <span className="text-muted-foreground">· {f.url}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </Panel>
        <Panel className="p-5">
          <h3 className="text-sm font-semibold">Recent sites</h3>
          <ul className="mt-3 space-y-2">
            {(history.length ? history : RECENT_SITES).slice(0, 6).map((h) => (
              <li key={h.url}>
                <button
                  type="button"
                  onClick={() => navigate(h.url, h.title)}
                  className="w-full truncate rounded-lg border border-hairline bg-surface px-3 py-2 text-left text-xs hover:border-signal/40"
                >
                  {h.title} <span className="text-muted-foreground">· {h.url}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] text-muted-foreground">
            {history.length ? "Stored locally in this browser." : "Illustrative demo list."}
          </p>
        </Panel>
      </section>

      <DemoNotice>
        The ATLAS Browser workspace is a visual/product layer. Evidence records, reconciliation
        actions and vendor associations are local prototype behaviour with no backend persistence.
      </DemoNotice>
    </div>
  );
}
