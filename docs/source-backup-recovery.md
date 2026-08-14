# ATLAS source backup and recovery verification

This control verifies that a restored source tree matches one immutable Git commit. It does not claim that databases, object storage, secrets, or a deployed runtime have been backed up.

## Create a source manifest

From a clean checkout, supply the exact 40-character commit SHA:

```sh
node scripts/source-backup.mjs create --root . --manifest .atlas-backup/source-manifest.json --source-sha "$ATLAS_SOURCE_SHA"
```

Store the source archive, generated manifest, commit SHA, creation time, repository identity, and backup location together in the authorized backup system. The manifest contains file paths, byte sizes, and SHA-256 checksums. It contains no credentials.

## Verify a restored copy

Extract the archive into an empty directory, copy its manifest into `.atlas-backup/source-manifest.json`, and run:

```sh
node scripts/source-backup.mjs verify --root . --manifest .atlas-backup/source-manifest.json
```

Verification fails closed when a tracked source file is missing, modified, added unexpectedly, represented by a symbolic link, or when the manifest identity is invalid. `.git`, `node_modules`, and `.atlas-backup` are excluded deliberately.

## Recovery evidence

A recovery exercise is complete only when the verifier exits successfully against the extracted copy and the result is recorded with the immutable commit SHA. Runtime, D1/database, document-storage, secret-store, DNS, and provider restoration require separate tested procedures.

## Security boundaries

- Never place credentials, provider tokens, private user data, or database exports in the repository.
- Generate manifests only from a clean, reviewed commit.
- Store production backups in an access-controlled, encrypted system with retention and deletion policies.
- Treat a successful source verification as source-integrity evidence, not proof that production is deployable.
