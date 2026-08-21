# ATLAS Mobile Identity regression guard

This guard exists because the platform-links fallback once rendered as a fixed bottom-right launcher on pages without the standard sidebar, obscuring Identity controls on narrow iPhone viewports.

The CI workflow `.github/workflows/validate-mobile-identity.yml` verifies that `/identity` renders platform links inside the normal document flow, keeps the mobile breakpoint, uses static positioning on narrow screens, and does not inject the legacy fixed launcher.
