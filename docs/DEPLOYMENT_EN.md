# ATLAS Core — Controlled Deployment

## Environments

- Local: development on a workstation.
- Preview: private validation before affecting the main release.
- Production: approved public domain.

## Included preparation

`vercel.json` enables clean URLs, prevents connection configuration from being cached, and adds baseline security headers. Its policy permits connections only to the same site, the jsDelivr-hosted SDK, and the Supabase project.

## Deployment sequence

1. Push the private repository to GitHub.
2. Import the repository into Vercel.
3. Deploy to Preview first.
4. Configure `atlas-config.js` with the Supabase URL and publishable key.
5. Test login, tenant isolation, documents, backups, and recovery.
6. Connect the domain only after Private Beta approval.

## Prohibited

- Never publish the Supabase secret key.
- Never store real data in the local demo.
- Never market accounting, payroll, banking, or health functions as production-ready without their required tests and reviews.
