# ATLAS Future Installation Hardening Checklist

Use this checklist for every future ATLAS installation, deployment, environment rebuild, and module rollout. These items come from issues already detected and fixed during Cloudflare/ATLAS Cars reviews.

## Cloudflare / Worker routing

- Keep `assets.run_worker_first: true` when frontend security headers are applied in the Worker.
- Do not restrict `run_worker_first` to only `/api/*` if the Worker is responsible for wrapping static responses with security headers.
- Ensure all frontend/static responses pass through the Worker when headers such as `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Cross-Origin-Opener-Policy`, and `Permissions-Policy` are enforced there.
- Explicitly return JSON `404` for unmatched `/api` and `/api/*` routes before falling through to Static Assets.
- Never allow SPA fallback (`index.html`) to masquerade as a successful API response.
- Validate `/api/health` and `/api/version` independently after deployment.

## Internationalization

- Language controls must translate the actual interface, not just the button label.
- Update static labels, dynamic telemetry, architecture cards, safety text, sensor text, controls, titles, and accessibility labels when language changes.
- Update `document.documentElement.lang` when switching languages.
- Persist the selected language when appropriate.

## Theme / contrast

- Validate button and control contrast independently in dark and light themes.
- Do not reuse a fixed dark button background with dark light-theme text.
- Primary, secondary, language, simulation, reset, and theme controls must remain readable in every supported theme.

## Safety-state consistency

- Top-level safety state must reflect all relevant domains, not only sensor health.
- Low battery / low SOC must affect the overall status when the energy domain is degraded.
- Do not display “all domains nominal” if BMS, energy, sensor, or another critical domain is degraded.
- Keep local domain state and global summary state consistent.

## Accessibility

- Icon-only controls must have an accessible name using `aria-label`, visible text, or equivalent semantics.
- Theme controls must identify their action clearly for screen readers and speech-control users.
- Accessible labels should follow the active language.

## Release gate

Before merging or declaring an installation complete:

1. Build succeeds.
2. Deployment succeeds.
3. `/api/health` returns expected JSON and HTTP status.
4. `/api/version` returns expected JSON and HTTP status.
5. Unknown `/api/*` route returns JSON 404, not `index.html`.
6. `/`, HTML, CSS, JS, service worker, and other assets load correctly.
7. Security headers are present on frontend responses.
8. ES/EN switching changes the actual UI and document language.
9. Light/dark themes pass readability checks.
10. Safety summary matches sensor and energy-domain state.
11. Icon-only controls have accessible names.
12. No production merge until all checks are green.
