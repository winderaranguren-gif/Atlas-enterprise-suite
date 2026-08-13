# ATLAS Enterprise Suite

Clean rebuild baseline for ATLAS.

## Current phase
Foundation v0.1. No business modules are enabled yet.

## Goals
- Keep `main` minimal and stable.
- Add one module at a time.
- Validate every integration before the next module.
- Keep secrets and production credentials out of source control.

## Core endpoints
- `/` — baseline status page
- `/api/health` — runtime health response
