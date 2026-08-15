# ATLAS Meta / WhatsApp Catalog Handoff

## Automated ATLAS side

ATLAS exposes a scheduled Meta-compatible catalog feed containing the current 30 public catalog entries, launch pricing, descriptions, product IDs and ATLAS-hosted approved visuals.

- Feed: `https://atlasenterprisesuite.com/feeds/meta/atlas-catalog.csv`
- Diagnostic JSON: `https://atlasenterprisesuite.com/feeds/meta/atlas-catalog.json`
- Status: `https://atlasenterprisesuite.com/feeds/meta/status`
- Source of truth: `modules/meta-catalog.js`
- Runtime wrapper: `worker-meta.js`

No Meta password, user access token, system-user token, WhatsApp verification code or reusable secret is stored in this repository.

## One-time account-owner action

1. In Meta Commerce Manager, open the catalog intended for ATLAS (or create one if none exists).
2. Add a Data Feed / scheduled feed and use the ATLAS feed URL above. Choose the most frequent schedule appropriate for the account.
3. In Meta/WhatsApp business settings, associate that catalog with the correct WhatsApp Business Account / business phone number.
4. Make the catalog visible in WhatsApp commerce settings. Cart may be enabled or disabled according to the desired sales flow.
5. Complete any Meta business verification, permission or WhatsApp code prompt shown to the account owner.

After the scheduled feed is connected, product updates are maintained in ATLAS and Meta retrieves them from the feed instead of requiring item-by-item copy/paste.

## Security boundary

Never paste Meta passwords, one-time codes, app secrets or access tokens into documentation, issues, commits or chat. Account-owner authorization must happen in Meta's own authorization UI.
