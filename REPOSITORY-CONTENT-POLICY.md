# ATLAS Repository Content Policy

## Scope rule
When the instruction is **“sube todo al repositorio”** or equivalent, it means:

- Upload only the specific ATLAS module, feature, configuration, asset, test, migration, or deployment file currently being worked on.
- Include only dependencies and supporting files strictly necessary for that module to function, test, build, or deploy.
- Keep updates incremental: module by module, day by day, change by change.

## Explicit exclusions
Do **not** upload:

- Full ChatGPT conversation history.
- Raw chat transcripts, discarded ideas, repetitive discussion, or unrelated conversation context.
- Private conversation-only notes unless they are intentionally converted into a required project artifact.
- Unrelated modules or bulk historical data just because they appeared in prior conversations.
- Secrets, credentials, access tokens, private keys, passwords, or sensitive personal data.

## Pre-commit filter
Before every repository write:

1. Identify the active module or feature.
2. Select only files required for that module/change.
3. Remove conversational residue, temporary notes, duplicates, and irrelevant context.
4. Verify that no secrets or sensitive data are included.
5. Commit with a message describing the specific module/change, not the conversation that produced it.

## Interpretation priority
If there is any ambiguity, prefer the narrowest technically complete upload that preserves the working module and its required integrations.
