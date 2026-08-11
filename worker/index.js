function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "ATLAS",
        runtime: "cloudflare-worker",
        deployedSha: env.ATLAS_DEPLOYED_SHA || null,
        defaultLanguage: env.ATLAS_DEFAULT_LANGUAGE || "en",
        operational: false,
        status: "baseline-only"
      });
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ ok: false, error: "not_implemented" }, 501);
    }

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("ATLAS", { status: 200 });
  }
};
