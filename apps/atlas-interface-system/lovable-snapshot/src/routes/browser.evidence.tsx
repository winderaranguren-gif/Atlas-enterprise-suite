import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Inbox, Trash2, RotateCcw } from "lucide-react";
import { DemoNotice, PageHero, Panel, SectionHeading } from "@/components/atlas/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EVIDENCE_TYPES,
  RECONCILIATION_STATUSES,
  type ReconciliationStatus,
} from "@/lib/atlas/browser/data";
import { useEvidence } from "@/lib/atlas/browser/store";

export const Route = createFileRoute("/browser/evidence")({
  head: () => ({
    meta: [
      { title: "Evidence Inbox — ATLAS Browser" },
      {
        name: "description",
        content:
          "Locally created demo evidence records from the ATLAS Browser: URL, type, vendor, notes and reconciliation status.",
      },
      { property: "og:title", content: "Evidence Inbox — ATLAS Browser" },
      {
        property: "og:description",
        content: "Local demo evidence records with classification and reconciliation status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EvidenceInbox,
});

function EvidenceInbox() {
  const { records, update, remove, reset, clear, hydrated } = useEvidence();
  const [filter, setFilter] = useState<string>("All");
  const shown = filter === "All" ? records : records.filter((r) => r.type === filter);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="ATLAS Browser"
        icon={Inbox}
        title="Evidence Inbox"
        description="Every record here was created locally in this browser from the ATLAS Browser workspace. Nothing is stored on a server in this phase, and all seeded rows are marked DEMO."
        stats={[
          { label: "Records", value: String(records.length) },
          { label: "Unfiled", value: String(records.filter((r) => r.status === "Unfiled").length) },
          { label: "In review", value: String(records.filter((r) => r.status === "In review").length) },
          { label: "Reconciled", value: String(records.filter((r) => r.status === "Reconciled").length) },
        ]}
      />

      <SectionHeading
        eyebrow="Local store"
        title="Classified browsing evidence"
        action={
          <div className="flex flex-wrap gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[150px] border-hairline bg-surface">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All types</SelectItem>
                {EVIDENCE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="gap-1.5 border-hairline bg-surface" onClick={reset}>
              <RotateCcw className="size-3.5" /> Reset demo
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 border-hairline bg-surface" onClick={clear}>
              <Trash2 className="size-3.5" /> Clear all
            </Button>
          </div>
        }
      />

      <div className="space-y-3">
        {!hydrated ? (
          <Panel className="p-6 text-sm text-muted-foreground">Loading local records…</Panel>
        ) : shown.length === 0 ? (
          <Panel className="p-6 text-sm text-muted-foreground">
            No evidence records. Save one from the ATLAS Browser workspace.
          </Panel>
        ) : (
          shown.map((r) => (
            <Panel key={r.id} className="p-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{r.title}</h3>
                    <Badge variant="outline" className="border-hairline text-[10px] text-muted-foreground">
                      {r.type}
                    </Badge>
                    <Badge variant="outline" className="border-signal/40 text-[10px] text-signal">
                      DEMO
                    </Badge>
                  </div>
                  <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{r.url}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">{r.notes}</p>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    {r.vendor} · {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Select
                    value={r.status}
                    onValueChange={(v) => update(r.id, { status: v as ReconciliationStatus })}
                  >
                    <SelectTrigger className="w-[140px] border-hairline bg-surface" aria-label="Reconciliation status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECONCILIATION_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Delete ${r.title}`}
                    onClick={() => remove(r.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </Panel>
          ))
        )}
      </div>

      <DemoNotice>
        Records persist only in this browser's local storage and are removed by “Clear local browsing
        data” in Browser Settings.
      </DemoNotice>
    </div>
  );
}