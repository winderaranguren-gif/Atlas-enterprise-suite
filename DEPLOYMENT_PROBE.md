# ATLAS Cloudflare Deployment Probe

This file exists only to trigger and verify the GitHub → Cloudflare Workers preview pipeline for ATLAS v0.5.0.

Expected release gates:
- `npm run validate`
- `npm run build:cloudflare`
- Wrangler Worker + static assets upload
- `/healthz` reports `0.5.0`
- ATLAS Calendar loads Personal Intelligence cloud synchronization

Probe date: 2026-08-08
