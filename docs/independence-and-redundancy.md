# ATLAS independence and redundancy

ATLAS integrations are replaceable adapters, not product dependencies.

## Repository strategy

- Primary working repository: GitHub.
- Secondary mirror: GitLab Free after the owner connects a GitLab account.
- Recovery copy: encrypted local repository on the authorized ATLAS device.
- No credentials, private conversations, personal files, or production secrets are mirrored.

## Deployment strategy

- Cloudflare remains the current public runtime.
- Deployment providers must consume the same validated build artifact.
- A provider outage must not remove the source repository or local recovery copy.
- Promotion to production requires validation and an auditable approval.

## Performance Optimizer boundary

The cloud module only creates safe optimization plans. Native ATLAS OS adapters may
suspend or resume processes when the operating system grants permission. Recording,
video-call, system, security, and backup processes are protected. Termination,
deletion, payments, and security changes always require explicit approval.

## Pending external authorization

Creating a GitLab mirror or a Supabase project requires an authenticated owner
account. Configuration must never fabricate access or store credentials in source.
