from __future__ import annotations

import hashlib
import hmac
import json
import os
import platform
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

NODE_ID = os.getenv("ATLAS_BRIDGE_NODE_ID", "winder-laptop-01")
VERSION = os.getenv("ATLAS_BRIDGE_VERSION", "1.0.0")
HOST = os.getenv("ATLAS_BRIDGE_HOST", "127.0.0.1")
PORT = int(os.getenv("ATLAS_BRIDGE_PORT", "8787"))
HEARTBEAT_URL = os.getenv("ATLAS_BRIDGE_HEARTBEAT_URL", "").strip()
NODE_SECRET = os.getenv("ATLAS_BRIDGE_NODE_SECRET", "")
HEARTBEAT_SECONDS = int(os.getenv("ATLAS_BRIDGE_HEARTBEAT_SECONDS", "30"))
TUNNEL_KIND = os.getenv("ATLAS_BRIDGE_TUNNEL_KIND", "cloudflare")
CAPABILITIES = [
    item.strip()
    for item in os.getenv("ATLAS_BRIDGE_CAPABILITIES", "voice,files,local-jobs").split(",")
    if item.strip()
]

STARTED_AT = time.time()
LAST_HEARTBEAT_OK: float | None = None
LAST_HEARTBEAT_ERROR: str | None = None


def now_unix() -> int:
    return int(time.time())


def system_payload() -> dict:
    return {
        "node_id": NODE_ID,
        "version": VERSION,
        "os": platform.system().lower(),
        "os_release": platform.release(),
        "architecture": platform.machine(),
        "bridge_port": PORT,
        "tunnel_kind": TUNNEL_KIND,
        "capabilities": CAPABILITIES,
        "timestamp": now_unix(),
    }


def canonical_body(payload: dict) -> bytes:
    return json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")


def sign(payload: dict) -> str:
    if not NODE_SECRET:
        raise RuntimeError("ATLAS_BRIDGE_NODE_SECRET is not configured")
    digest = hmac.new(
        NODE_SECRET.encode("utf-8"),
        canonical_body(payload),
        hashlib.sha256,
    ).hexdigest()
    return f"sha256={digest}"


def send_heartbeat() -> None:
    global LAST_HEARTBEAT_OK, LAST_HEARTBEAT_ERROR

    if not HEARTBEAT_URL:
        LAST_HEARTBEAT_ERROR = "ATLAS_BRIDGE_HEARTBEAT_URL is not configured"
        return

    payload = system_payload()
    body = canonical_body(payload)
    request = urllib.request.Request(
        HEARTBEAT_URL,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-ATLAS-Node": NODE_ID,
            "X-ATLAS-Signature": sign(payload),
            "User-Agent": f"ATLAS-Module-Bridge/{VERSION}",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            if 200 <= response.status < 300:
                LAST_HEARTBEAT_OK = time.time()
                LAST_HEARTBEAT_ERROR = None
            else:
                LAST_HEARTBEAT_ERROR = f"heartbeat HTTP {response.status}"
    except urllib.error.HTTPError as exc:
        LAST_HEARTBEAT_ERROR = f"heartbeat HTTP {exc.code}"
    except Exception as exc:  # noqa: BLE001
        LAST_HEARTBEAT_ERROR = f"{type(exc).__name__}: {exc}"


def heartbeat_loop() -> None:
    while True:
        try:
            send_heartbeat()
        except Exception as exc:  # noqa: BLE001
            global LAST_HEARTBEAT_ERROR
            LAST_HEARTBEAT_ERROR = f"{type(exc).__name__}: {exc}"
        time.sleep(max(5, HEARTBEAT_SECONDS))


class Handler(BaseHTTPRequestHandler):
    server_version = "ATLASModuleBridge/1.0"

    def _json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt: str, *args) -> None:
        print(f"[bridge-http] {self.address_string()} - {fmt % args}")

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._json(
                200,
                {
                    "ok": True,
                    "service": "atlas-module-bridge",
                    "node_id": NODE_ID,
                    "version": VERSION,
                    "uptime_seconds": int(time.time() - STARTED_AT),
                    "capabilities": CAPABILITIES,
                    "last_heartbeat_ok": LAST_HEARTBEAT_OK,
                    "last_heartbeat_error": LAST_HEARTBEAT_ERROR,
                },
            )
            return

        if self.path == "/capabilities":
            self._json(200, {"node_id": NODE_ID, "capabilities": CAPABILITIES})
            return

        self._json(404, {"ok": False, "error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        # v1 intentionally does not expose arbitrary command execution.
        # Future command endpoints must use an explicit allow-list and their own auth checks.
        self._json(403, {"ok": False, "error": "command_execution_not_enabled"})


def main() -> None:
    print(f"ATLAS Module Bridge {VERSION}")
    print(f"Node: {NODE_ID}")
    print(f"Listening locally on http://{HOST}:{PORT}")
    print("Public bind is intentionally disabled by default.")

    worker = threading.Thread(target=heartbeat_loop, name="atlas-heartbeat", daemon=True)
    worker.start()

    server = ThreadingHTTPServer((HOST, PORT), Handler)
    try:
        server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        print("Stopping ATLAS Module Bridge...")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
