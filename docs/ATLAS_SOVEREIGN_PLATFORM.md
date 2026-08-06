# ATLAS Sovereign Platform

## Objective
Build an ATLAS-owned, self-hostable operating layer for backend services, publishing, business email, professional media production, storage, backup, identity, audit, and recovery.

## Non-negotiable design rule
ATLAS must remain portable and operable without vendor lock-in. External providers may be optional transport or infrastructure layers, but ATLAS owns the data model, application logic, workflows, encryption policy, audit trail, export formats, and recovery process.

## 1. ATLAS Core Backend

### Services
- Identity and access management
- Multi-tenant organizations and companies
- Role-based access control
- API gateway
- Workflow engine
- Notification service
- Document service
- Media service
- Email service
- Search and indexing
- Audit and provenance
- Billing and metering
- Backup and recovery

### Recommended self-hosted stack
- API: TypeScript with Fastify or NestJS
- Database: PostgreSQL
- Queue: Redis-compatible queue
- Object storage: S3-compatible storage such as MinIO
- Search: PostgreSQL full-text initially; OpenSearch-compatible layer later
- Authentication: ATLAS-owned identity service with passkeys, TOTP, recovery codes, and optional external identity federation
- Reverse proxy: Caddy or Nginx
- Containers: Docker Compose initially; Kubernetes-compatible deployment later

### Core requirements
- Tenant isolation
- Row-level authorization
- Immutable-style audit events
- Encryption in transit and at rest
- Idempotent APIs
- Versioned migrations
- Rate limiting
- Health checks
- Structured logs
- Metrics and alerting
- Disaster recovery drills

## 2. ATLAS Publish

### Purpose
Allow ATLAS users to create and publish websites, landing pages, portals, forms, reports, catalogs, dashboards, and public knowledge pages without depending on an external site builder.

### Functions
- Visual page builder
- Reusable components
- Responsive previews
- Custom domains
- SEO metadata
- Forms and lead capture
- Authentication-protected pages
- Scheduled publishing
- Version history
- Rollback
- Multi-language content
- Static export
- Server-rendered applications
- Analytics owned by ATLAS
- Accessibility validation
- Legal and privacy templates

### Runtime
- ATLAS stores source content and layout as structured JSON
- Renderer produces static HTML/CSS/JS or server-rendered pages
- Deployment targets can include an ATLAS-owned server, customer server, or optional external infrastructure
- Every release receives a version identifier and rollback point

## 3. ATLAS Mail

### Scope
ATLAS can own the mailbox interface, accounts, permissions, templates, search, archiving, routing rules, CRM linkage, and audit history.

### Required infrastructure
Business email still relies on open Internet mail standards and domain DNS. The self-hosted implementation must support:
- SMTP submission and delivery
- IMAP or JMAP mailbox access
- SPF
- DKIM
- DMARC
- TLS
- Spam and malware filtering
- Bounce handling
- Reputation monitoring
- Abuse prevention
- Backup and retention

### Modules
- Domain and mailbox administration
- Shared inboxes
- Aliases and groups
- Email composer
- Templates
- Signatures
- Scheduling
- Approval workflow
- CRM and accounting linkage
- Search and retention
- Legal hold
- Delivery status
- Phishing and anomaly detection

### Boundary
ATLAS can self-host the mail system, but successful global delivery still depends on public DNS, recipient mail systems, IP reputation, and Internet routing. These are protocols and infrastructure dependencies, not software lock-in.

## 4. ATLAS Studio

### Purpose
Create professional videos, presentations, advertisements, product explainers, training media, reels, voiceovers, subtitles, and branded assets.

### Pipeline
1. Brief and audience definition
2. Script generation
3. Storyboard
4. Shot list
5. Asset library
6. Voice track
7. Motion design
8. Video composition
9. Captions and translations
10. Brand and compliance review
11. Render presets
12. Export and publishing

### Engine
- Timeline editor
- Scene graph
- Templates
- Brand kits
- Keyframes
- Transitions
- Lower thirds
- Charts and data-driven scenes
- Subtitle editor
- Audio normalization
- Multi-format rendering
- FFmpeg-based render workers
- GPU-accelerated effects when available
- Project versioning
- Render queue
- Review and approval links

### AI boundary
ATLAS may use locally hosted or replaceable models for scripts, voices, images, and video assistance. Generated output must be labeled internally with model provenance, license information, and approval status.

## 5. ATLAS Vault and Backup

### Backup policy
- Continuous database write-ahead-log archiving
- Hourly incremental backups
- Daily encrypted snapshots
- Weekly full backups
- Monthly immutable archive
- At least three copies
- At least two storage media or failure domains
- At least one offline or logically isolated copy
- Geographic separation when available

### Recovery objectives
- Initial target RPO: 1 hour
- Initial target RTO: 4 hours
- Critical identity and financial services target RPO: 15 minutes after production hardening
- Recovery tests every month

### Functions
- Backup dashboard
- Encryption key rotation
- Snapshot catalog
- Point-in-time recovery
- File version recovery
- Tenant-level export
- Full-system restoration
- Integrity verification
- Restore rehearsal
- Incident journal

## 6. Data ownership and portability

Every ATLAS module must support:
- JSON export
- CSV export where tabular
- PDF or HTML reports
- Media source export
- Database backup
- Open API access
- Documented schemas
- No hidden proprietary-only data format

## 7. Security model

- Zero-trust service access
- Least privilege
- Passkeys and MFA
- Session revocation
- Device and location risk signals
- Secret vault
- Signed webhooks
- Content scanning
- Dependency scanning
- Security headers
- Tamper-evident audit logs
- Field-level protection for sensitive data
- Separate production, staging, and development environments

## 8. Delivery phases

### Phase A — Foundation
- PostgreSQL backend
- Authentication
- Organizations and roles
- API gateway
- Audit service
- Object storage
- Backup service

### Phase B — ATLAS Publish
- Page schema
- Builder
- Renderer
- Domain manager
- Versioning and rollback

### Phase C — ATLAS Mail
- Mailbox UI
- Domain administration
- SMTP/IMAP or JMAP integration
- Templates, signatures, shared inboxes, and CRM links

### Phase D — ATLAS Studio
- Script, storyboard, asset manager, timeline, FFmpeg render queue, captions, presets, and approvals

### Phase E — Hardening
- Automated tests
- Load testing
- Penetration testing
- Disaster-recovery drills
- Monitoring
- Deployment automation
- User acceptance testing

## 9. Definition of complete

No component is labeled production-ready until it has:
- Functional tests
- Authorization tests
- Tenant-isolation tests
- Backup and restore test
- Failure-mode test
- Audit verification
- Security review
- Documentation
- Acceptance criteria signed off

## 10. Immediate repository target

The existing ATLAS local MVP remains the user-interface surface. The sovereign platform should be added as a separate backend workspace with this target structure:

```text
/apps
  /web
  /api
  /worker
  /mail-ui
  /studio
/packages
  /auth
  /database
  /audit
  /storage
  /publishing
  /mail
  /media
  /backup
  /ui
/infrastructure
  /docker
  /migrations
  /monitoring
  /backup
/docs
  /architecture
  /security
  /operations
  /acceptance
```

This document defines the permanent architecture standard for ATLAS-owned publishing, mail, media, backend, and backup capabilities.