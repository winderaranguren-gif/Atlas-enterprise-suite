# ATLAS Sovereign Vault

This vault is the recovery control plane for ATLAS Enterprise Suite.

## Active protection

- Source of truth: private GitHub repository.
- Daily cloud snapshot: GitHub Actions artifact, SHA-256 verified, 90-day retention.
- Secrets are explicitly excluded from snapshots.
- Restore verification checks archive integrity and presence of the recovery manifest.

## Google Drive replica

Root folder: `ATLAS Sovereign Vault`

- Root ID: `142xVkMjKWTykUFJ0Md7D3T-KRymNoWM_`
- Snapshots ID: `12YSTzNJgxu07DYq145St7nGpd5ltJtox`
- Recovery ID: `1w6OeBU5KayaTF3OfiRF7PW6YC6vnDQkd`
- Manifests ID: `1AeOHz0NpYMQz_djnKODJHPk30_eXLpdu`

The Drive folders are provisioned. Automated binary replication to Drive requires a non-interactive Drive service credential or another authorized upload mechanism; do not place that credential in this repository.

## Recovery

Build a snapshot:

```bash
chmod +x scripts/atlas-backup.sh scripts/atlas-verify.sh
scripts/atlas-backup.sh .
```

Verify it:

```bash
ARCHIVE="$(ls -1t .atlas-backups/atlas-backup-*.tar.gz | head -n1)"
scripts/atlas-verify.sh "$ARCHIVE" "${ARCHIVE}.sha256"
```

A valid recovery point must pass the checksum check before restoration.

## Security boundary

Never commit API keys, passwords, access tokens, private keys, certificates, `.env` files, or provider credentials. The backup records reconstructable configuration while secret values remain in their provider secret managers.
