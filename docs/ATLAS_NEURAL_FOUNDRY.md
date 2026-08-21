# ATLAS Neural Foundry

ATLAS Neural Foundry is the ownership and integrity layer for first-party neural media models. It extends the existing ATLAS Model Engine instead of replacing it.

## Portable registry

Command: `node atlas/neural-foundry.mjs status`

Persistent local state is stored beneath `.atlas/models/foundry` and is not committed by the tool.

Supported tasks: speech-to-text, voice-synthesis, voice-clone, phoneme-recognition, facial-lipsync, super-resolution, and video-restyle.

## Artifact lifecycle

Artifacts begin as `candidate`. Registration records file size, SHA-256, task, license, consent policy, metrics and storage reference. Promotion to `validated` requires file integrity, evaluation metrics, and consent attestation for identity-bearing tasks.

Foundry does not mark a model trained merely because a file or UI entry exists.

## Dataset lifecycle

Dataset registration consumes a JSON manifest with a non-empty `items` array. Identity-bearing tasks require consent attestation. The manifest receives a SHA-256 fingerprint.

## Training recipes

Recipes retain supported fields such as architecture, optimizer, learning rate, batch size, epochs, steps, seed, precision, input, output, loss, evaluation, and checkpoint cadence. Normalized training configuration receives a SHA-256 fingerprint.

## Jobs

A training job binds a recipe and dataset of the same task plus an optional validated base artifact. New jobs are `queued` with `executor: not-configured`. Foundry does not start GPU work. Moving a job to `running` requires an explicit executor identifier.

## Studio surface

Route: `/studio/models`

The Studio page builds local dataset and training recipe manifests and documents the portable registry commands. It does not pretend that the Cloudflare Worker UI can read Node-local registry state.

## Provider policy

Foundry declares `externalProviders: []`. The target is first-party ownership of model artifacts, training recipes, consent records, evaluation gates and eventually an ATLAS-controlled GPU executor.
