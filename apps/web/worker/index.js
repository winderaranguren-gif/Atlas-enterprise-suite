const modules = [
  {
    id: "core",
    name: "ATLAS Core",
    status: "active",
    route: "/api/status",
    version: "0.1.0"
  },
  {
    id: "dashboard",
    name: "ATLAS Dashboard",
    status: "active",
    route: "/",
    version: "0.1.0"
  }
];

const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-atlas-runtime": "core-0.1.0"
    }
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/status") {
      return json({
        ok: true,
        system: "ATLAS Enterprise Suite",
        coreVersion: "0.1.0",
        architecture: "modular-monorepo",
        timestamp: new Date().toISOString()
      });
    }

    if (url.pathname === "/api/modules") {
      return json({ modules });
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ ok: false, error: "ATLAS_API_ROUTE_NOT_FOUND" }, 404);
    }

    return env.ASSETS.fetch(request);
  }
};
