import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/browser")({
  component: BrowserLayout,
});

const TABS = [
  { to: "/browser", label: "Workspace", exact: true },
  { to: "/browser/evidence", label: "Evidence Inbox", exact: false },
  { to: "/browser/settings", label: "Settings", exact: false },
  { to: "/browser/ios-readiness", label: "iOS Readiness", exact: false },
  { to: "/browser/architecture", label: "Architecture note", exact: false },
] as const;

function BrowserLayout() {
  return (
    <div className="space-y-8">
      <nav
        aria-label="ATLAS Browser sections"
        className="glass -mx-1 flex gap-1 overflow-x-auto rounded-2xl p-1.5"
      >
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            activeOptions={{ exact: t.exact }}
            activeProps={{ className: "bg-surface-strong text-foreground" }}
            inactiveProps={{ className: "text-muted-foreground" }}
            className="rounded-xl px-3.5 py-2 text-sm whitespace-nowrap transition-colors hover:bg-surface hover:text-foreground"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}