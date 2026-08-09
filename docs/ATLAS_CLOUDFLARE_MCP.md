# ATLAS Cloudflare MCP

ATLAS uses Cloudflare's managed remote MCP endpoint as the primary Cloudflare control plane instead of duplicating the Cloudflare API inside ATLAS.

## Endpoint

- Transport: Streamable HTTP
- Endpoint: `https://mcp.cloudflare.com/mcp`
- Preferred authentication: OAuth
- CI/automation fallback: scoped Cloudflare API token
- Repository secrets: prohibited

Cloudflare's managed MCP exposes the Cloudflare API through a compact tool surface and can perform both reads and authorized writes across products such as Workers, Builds, DNS, R2, D1, KV and Zero Trust.

## ATLAS control path

```text
MCP-capable client
       |
       v
ATLAS Cloudflare MCP policy
       |
       v
Cloudflare managed MCP
       |
       v
Cloudflare API
       |
       +--> preview/build/deployment/configuration
       |
       v
ATLAS Cloudflare -> GitHub Bridge
       |
       v
cloudflare-sync/<run-id> branch -> Draft PR -> validation -> main
```

## Safety boundary

1. Never store Cloudflare credentials in browser code, committed files, screenshots or logs.
2. Prefer OAuth for interactive users.
3. API tokens, when required for automation, must use the minimum permissions needed.
4. ATLAS preview operations may be automated after validation.
5. Production mutations require explicit approval and validation.
6. Destructive operations require explicit approval.
7. The Cloudflare -> GitHub bridge must not write directly to `main`.
8. Infrastructure files protected by the bridge remain protected from generated bundles.
9. Every mutation should be auditable with actor, operation, target, timestamp and result.

## Tool policy

ATLAS treats Cloudflare's MCP operations in three classes:

- **Read-safe**: list Workers, inspect deployments, builds, logs and configuration.
- **Write-reversible**: create/update preview versions, trigger builds, update non-production configuration.
- **Write-sensitive**: production deploys, DNS changes, secret changes, deletions and rollbacks. These require approval.

## Client registration

A compatible MCP client should register the remote endpoint directly. The repository file `mcp/atlas-cloudflare.remote.json` is the ATLAS policy descriptor; it contains no credential.

## Current limitation

This repository can prepare and validate the integration independently of the ChatGPT subscription tier. Whether a specific ChatGPT workspace can invoke custom/remote MCP write tools is a client entitlement issue, not an ATLAS architecture limitation.

## Verification checklist

- MCP endpoint reachable over HTTPS.
- OAuth or scoped API-token authentication completes outside the repository.
- Read-only Cloudflare query succeeds first.
- Preview write succeeds before any production write.
- Audit result recorded.
- GitHub bridge creates a branch/PR rather than writing directly to `main`.
- Production deploy remains gated.
