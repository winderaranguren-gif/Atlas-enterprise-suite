# ATLAS Global Country Editions

ATLAS uses one canonical Cloudflare Worker and produces country-aware editions at the edge. It does not fork the product or create independent sources of truth.

## Routes

- `/global` detects the visitor with `request.cf.country`.
- `/global/{iso-code}` opens a specific ISO 3166-1 alpha-2 edition.
- `/api/global/context` returns the detected country, timezone, city and Cloudflare colo when available.
- `/api/global/countries` returns the complete supported registry.

## Safety boundary

`localization: available` means ATLAS can select a country, language baseline, currency baseline and route. `compliance: requires-validation` means tax, payroll, accounting, privacy, identity, health, banking and payment rules are not represented as production-ready until reviewed for that jurisdiction.

Cloudflare special codes `XX` (unknown) and `T1` (Tor) use the neutral global experience and never infer a regulated configuration.
