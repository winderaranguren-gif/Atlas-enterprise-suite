# ATLAS Voice, Lip Sync and Resolution Foundations

This release extends the first-party ATLAS Creator pipeline with three local-first engines.

## ATLAS Voice Engine

Route: `/studio/voice`

- local audio/video audio decode through Web Audio
- RMS, peak and crest-factor metering
- deterministic block noise gate
- high-pass and low-pass filters
- three-band voice EQ
- dynamics compression
- peak normalization
- offline local render
- PCM WAV export
- local recipe: `atlas.voice.recipe`

Voice synthesis and voice cloning remain `model-not-trained`. Future identity synthesis requires explicit consent and an ATLAS-owned model artifact.

## ATLAS Lip Sync Engine

Route: `/studio/lipsync`

- imports `atlas.speech.map` when available
- accepts the exact supplied script
- deterministic orthography-to-viseme heuristic for Spanish and English
- aligns viseme holds to local speech activity regions
- coalesces repeated mouth-shape states
- exports JSON and CSV timelines
- local timeline: `atlas.lipsync.timeline`

This timing engine is not acoustic phoneme recognition and does not generate facial animation. The acoustic phoneme model and facial lip animation model remain `model-not-trained`.

## ATLAS Resolution Engine

Route: `/studio/resolution`

- local image ingest
- local video reference-frame capture
- multi-pass high-quality Canvas resampling
- optional unsharp-mask sharpening
- edge-energy metric before/after processing
- PNG export
- local recipe: `atlas.resolution.recipe`

Deterministic resampling is not neural detail recovery. Neural super-resolution and temporal video detail recovery remain `model-not-trained` until ATLAS owns trained artifacts.

## Ownership and privacy

All three services declare:

- `externalProviders: []`
- `externalProviderRequired: false`
- `mediaLeavesDeviceByDefault: false`
- `localProcessing: true`

The implementation deliberately separates real deterministic capabilities from neural capabilities that do not yet have an ATLAS-owned model artifact.
