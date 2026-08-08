# ATLAS Repository Status — 2026-08-08

## Baseline

- Product: ATLAS Enterprise Suite
- Current package version: 0.5.0
- Default branch: `main`
- Deployment target: Cloudflare Worker + static assets
- Mobile foundation: Capacitor iOS/Android
- Global architecture: one shared ATLAS core with regional and country context layers

## Active architectural rules

1. Keep one ATLAS global core. Regional deployments are context/configuration layers, not cloned applications.
2. Navigation and modules must be discovered dynamically from available ATLAS capabilities.
3. Avoid fixed duplicated menus and disconnected pages.
4. Preserve responsive desktop/mobile behavior.
5. North America uses the original futuristic ATLAS visual identity.
6. Regional layers may override language, currency, compliance, public-sector workflows, design and integrations without forking the core.
7. Production-facing modules must report real blockers instead of silently claiming success.
8. Automatic technical-support actions are limited to safe/reversible operations; privileged, physical-access, security-boundary or irreversible work remains explicitly gated.

## Current functional foundations

- Core enterprise shell and multi-company workspace
- Accounting, AP, AR, GL, inventory and reporting
- HR and payroll foundation
- Freight and fleet intelligence
- Wallet, Ride, Marketplace and Rewards
- ATLAS Cars
- Health administrative tracking
- Public Safety and Community Hub
- Dynamic regional navigation runtime
- Technical Support and runbook engine
- ATLAS Calendar
- Private beta cloud/authentication foundation
- Cloudflare production build/deploy lifecycle
- PWA/service-worker foundation
- Capacitor mobile foundation

## Required release gates

Before describing a release as production-ready, validate:

- `npm run validate`
- production build generation
- production hostname health and API checks
- tenant and role isolation for cloud-backed data
- backup and recovery paths
- mobile build verification for the intended release target
- unresolved review findings on active code PRs

## Repository hygiene

Probe-only pull requests should be closed once their verification purpose is superseded by newer mainline checks. Functional fixes with unresolved review comments should remain unmerged until the findings are addressed and verification is complete.
